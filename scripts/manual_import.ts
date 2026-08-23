import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase by parsing .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: any = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runImport(filePath: string, orgId: string, actualUserId: string) {
  try {
    console.log(`Starting import for Org: ${orgId}`);
    console.log(`Using Owner User ID: ${actualUserId}`);
    console.log(`Reading file: ${filePath}`);

    let rawText = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
    rawText = rawText.replace(/\t/g, '');
    const data = JSON.parse(rawText);

    console.log(`Loaded JSON: ${data.expenses?.length} expenses, ${data.income?.length} income, ${data.meals?.length} meals, ${data.mileage?.length} mileage`);

    const familyIdMap: any = {}; 
    const childIdMap: any = {}; 
    
    // --- BULK OPTIMIZATION START ---
    
    // Pre-fetch existing families
    const { data: existingFams } = await supabaseAdmin.from('families').select('id, family_name').eq('organization_id', orgId);
    const existingFamMap = new Map((existingFams || []).map(f => [f.family_name?.toLowerCase(), f.id]));
    
    // Pre-fetch existing contacts
    const { data: existingContacts } = await supabaseAdmin.from('contacts').select('id, first_name, family_id').eq('organization_id', orgId);
    const existingContactMap = new Map((existingContacts || []).map(c => [`${c.family_id}_${c.first_name?.toLowerCase()}`, c.id]));
    
    // Pre-fetch existing children
    const { data: existingChildren } = await supabaseAdmin.from('children').select('id, first_name, last_name, family_id').eq('organization_id', orgId);
    const existingChildMap = new Map((existingChildren || []).map(c => [`${c.first_name?.toLowerCase()}_${c.last_name?.toLowerCase()}`, c.id]));

    // 1. Bulk Import Clients as Families
    console.log("Processing Families...");
    const familiesToInsert = [];
    const uniqueNewFamilies = new Set();
    for (const client of (data.clients || [])) {
      const ln = (client.last_name || 'Unknown Family').toLowerCase();
      if (!existingFamMap.has(ln) && !uniqueNewFamilies.has(ln)) {
        uniqueNewFamilies.add(ln);
        familiesToInsert.push({
          user_id: actualUserId,
          organization_id: orgId,
          family_name: client.last_name || 'Unknown Family',
          is_active: false
        });
      }
    }
    
    if (familiesToInsert.length > 0) {
      const { data: insertedFams, error } = await supabaseAdmin.from('families').insert(familiesToInsert).select('id, family_name');
      if (error) throw error;
      for (const fam of (insertedFams || [])) {
        existingFamMap.set(fam.family_name?.toLowerCase(), fam.id);
      }
    }
    
    // 2. Map Families and Bulk Import Contacts
    console.log("Processing Contacts...");
    const contactsToInsert = [];
    for (const client of (data.clients || [])) {
      const { client_id, first_name, last_name, address, city, state, zip, home_phone, email: clientEmail } = client;
      const ln = (last_name || 'Unknown Family').toLowerCase();
      const famId = existingFamMap.get(ln);
      
      if (famId) {
        familyIdMap[client_id] = famId;
        if (first_name) {
          const contactKey = `${famId}_${first_name.toLowerCase()}`;
          if (!existingContactMap.has(contactKey)) {
             existingContactMap.set(contactKey, 'pending');
             contactsToInsert.push({
                user_id: actualUserId,
                organization_id: orgId,
                family_id: famId,
                first_name,
                last_name,
                address: address || null,
                address_city: city || null,
                address_state: state || null,
                address_zip: zip || null,
                phone: home_phone || null,
                email: clientEmail || null,
                is_primary: true
             });
          }
        }
      }
    }
    if (contactsToInsert.length > 0) {
       for (let i = 0; i < contactsToInsert.length; i += 500) {
         const { error } = await supabaseAdmin.from('contacts').insert(contactsToInsert.slice(i, i + 500));
         if (error) throw error;
       }
    }

    // 3. Bulk Import Unmapped Families for Children
    console.log("Processing Unmapped Families...");
    const unmappedFamiliesToInsert = [];
    const unmappedFamiliesSet = new Set();
    for (const child of (data.children || [])) {
       const { child_client_id } = child;
       if (!familyIdMap[child_client_id]) {
          const fallbackName = `Unmapped Family - Client ${child_client_id || 'Unknown'}`;
          if (!existingFamMap.has(fallbackName.toLowerCase()) && !unmappedFamiliesSet.has(fallbackName.toLowerCase())) {
             unmappedFamiliesSet.add(fallbackName.toLowerCase());
             unmappedFamiliesToInsert.push({
               user_id: actualUserId,
               organization_id: orgId,
               family_name: fallbackName,
               is_active: false
             });
          }
       }
    }
    if (unmappedFamiliesToInsert.length > 0) {
       const { data: newFams, error } = await supabaseAdmin.from('families').insert(unmappedFamiliesToInsert).select('id, family_name');
       if (error) throw error;
       for (const fam of (newFams || [])) {
         existingFamMap.set(fam.family_name?.toLowerCase(), fam.id);
       }
    }

    // 4. Bulk Import Children
    console.log("Processing Children...");
    const childrenToInsert = [];
    const childNameMap = new Map();
    
    for (const child of (data.children || [])) {
      const { child_id, child_client_id, name, birth_date, hourly_rate, active } = child;
      let famId = familyIdMap[child_client_id];
      if (!famId) {
         const fallbackName = `Unmapped Family - Client ${child_client_id || 'Unknown'}`;
         famId = existingFamMap.get(fallbackName.toLowerCase());
      }
      if (!famId) continue;
      
      const nameParts = (name || 'Unknown Child').split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';
      
      const childKey = `${first_name.toLowerCase()}_${last_name.toLowerCase()}`;
      childNameMap.set(childKey, child_id);
      
      if (!existingChildMap.has(childKey)) {
         existingChildMap.set(childKey, 'pending');
         childrenToInsert.push({
            user_id: actualUserId,
            organization_id: orgId,
            family_id: famId,
            first_name,
            last_name,
            date_of_birth: birth_date && birth_date !== '0000-00-00' && birth_date !== 'NULL' ? birth_date : null,
            is_active: active === '1',
            standard_weekly_rate: hourly_rate ? parseFloat(hourly_rate) * 40 : 150.00
         });
      }
    }
    
    if (childrenToInsert.length > 0) {
      for (let i = 0; i < childrenToInsert.length; i += 500) {
        const chunk = childrenToInsert.slice(i, i + 500);
        const { data: insertedChildren, error } = await supabaseAdmin.from('children').insert(chunk).select('id, first_name, last_name');
        if (error) throw error;
        for (const c of (insertedChildren || [])) {
           const key = `${c.first_name?.toLowerCase()}_${c.last_name?.toLowerCase()}`;
           const legacyId = childNameMap.get(key);
           if (legacyId) childIdMap[legacyId] = c.id;
        }
      }
    }
    
    // Map existing children back to legacy IDs
    for (const c of (existingChildren || [])) {
       const key = `${c.first_name?.toLowerCase()}_${c.last_name?.toLowerCase()}`;
       const legacyId = childNameMap.get(key);
       if (legacyId) childIdMap[legacyId] = c.id;
    }
    
    // 3. Import Attendance
    console.log("Processing Attendance...");
    const attendanceInserts = [];
    for (const att of (data.attendance || [])) {
      const newChildId = childIdMap[att.attend_child_id];
      if (!newChildId) continue;
      
      let checkIn = null;
      let checkOut = null;
      if (att.start_time && att.start_time !== 'NULL' && att.start_time !== '0') {
        checkIn = new Date(parseInt(att.start_time) * 1000).toISOString();
      }
      if (att.end_time && att.end_time !== 'NULL' && att.end_time !== '0') {
        checkOut = new Date(parseInt(att.end_time) * 1000).toISOString();
      }
      
      attendanceInserts.push({
        user_id: actualUserId,
        organization_id: orgId,
        child_id: newChildId,
        date: att.date !== '0000-00-00' ? att.date : new Date().toISOString().split('T')[0],
        check_in_time: checkIn,
        check_out_time: checkOut,
        status: 'Present',
        notes: att.note !== 'NULL' ? att.note : null
      });
    }

    if (attendanceInserts.length > 0) {
      for (let i = 0; i < attendanceInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('attendance').insert(attendanceInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }

    let masterCategoryMap: any = {};
    const catPath = path.join(process.cwd(), 'expense_categories.json');
    if (fs.existsSync(catPath)) masterCategoryMap = JSON.parse(fs.readFileSync(catPath, 'utf8'));

    // 4. Import Expenses
    console.log("Processing Expenses...");
    const expenseInserts = [];
    for (const exp of (data.expenses || [])) {
      const catId = exp.expensecategory_id || exp.category_id || exp.exp_exp_type_id;
      let categoryName = 'Legacy Expense';
      if (catId && masterCategoryMap[catId]) categoryName = masterCategoryMap[catId];
      else if (exp.category && exp.category !== 'NULL') categoryName = exp.category;

      expenseInserts.push({
        user_id: actualUserId,
        organization_id: orgId,
        date: exp.date !== '0000-00-00' ? exp.date : new Date().toISOString().split('T')[0],
        vendor: exp.store || 'Unknown',
        amount: exp.amount ? parseFloat(exp.amount) : 0,
        description: exp.note && exp.note !== 'NULL' ? exp.note : (exp.description && exp.description !== 'NULL' ? exp.description : null),
        category: categoryName
      });
    }
    if (expenseInserts.length > 0) {
      for (let i = 0; i < expenseInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('expenses').insert(expenseInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }
    
    // 5. Import Notes
    console.log("Processing Notes...");
    const noteInserts = [];
    for (const note of (data.notes || [])) {
      noteInserts.push({
        organization_id: orgId,
        date: note.date !== '0000-00-00' ? note.date : new Date().toISOString().split('T')[0],
        note_text: note.note,
        is_day_off: note.day_off === '1'
      });
    }
    if (noteInserts.length > 0) {
      for (let i = 0; i < noteInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('provider_notes').insert(noteInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }

    // 6. Import Income
    console.log("Processing Income...");
    const incomeInserts = [];
    for (const inc of (data.income || [])) {
      const famId = inc.client_id ? familyIdMap[inc.client_id] : null;

      incomeInserts.push({
        user_id: actualUserId,
        organization_id: orgId,
        family_id: famId,
        date: inc.date !== '0000-00-00' ? inc.date : new Date().toISOString().split('T')[0],
        amount: inc.amount ? parseFloat(inc.amount) : 0,
        method: inc.payment_method || 'Cash/Check',
        reference_note: inc.description !== 'NULL' ? inc.description : null,
      });
    }
    if (incomeInserts.length > 0) {
      for (let i = 0; i < incomeInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('payments').insert(incomeInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }
    
    // 7. Import Meals
    console.log("Processing Meals...");
    const mealInserts = [];
    for (const meal of (data.meals || [])) {
      const isAggregate = !meal.meal_child_id || meal.meal_child_id === '0' || meal.meal_child_id === 'NULL';
      
      if (isAggregate) {
        const brkCount = parseInt(meal.breakfast) || (meal.meal1 === '1' ? 1 : 0);
        const snackCount = parseInt(meal.snack) || (meal.meal2 === '1' ? 1 : 0);
        const lunCount = parseInt(meal.lunch) || (meal.meal3 === '1' ? 1 : 0);
        
        const maxCount = Math.max(brkCount, snackCount, lunCount);
        for (let j = 0; j < maxCount; j++) {
          mealInserts.push({
            provider_id: actualUserId,
            organization_id: orgId,
            child_id: null,
            date: meal.date !== '0000-00-00' ? meal.date : new Date().toISOString().split('T')[0],
            breakfast: j < brkCount,
            am_snack: j < snackCount,
            lunch: j < lunCount,
            pm_snack: false,
            dinner: false
          });
        }
      } else {
        const newChildId = childIdMap[meal.meal_child_id];
        if (!newChildId) continue;
        
        mealInserts.push({
          provider_id: actualUserId,
          organization_id: orgId,
          child_id: newChildId,
          date: meal.date !== '0000-00-00' ? meal.date : new Date().toISOString().split('T')[0],
          breakfast: meal.meal1 === '1' || parseInt(meal.breakfast) > 0,
          am_snack: meal.meal2 === '1' || parseInt(meal.snack) > 0,
          lunch: meal.meal3 === '1' || parseInt(meal.lunch) > 0,
          pm_snack: meal.meal4 === '1',
          dinner: meal.meal5 === '1'
        });
      }
    }
    if (mealInserts.length > 0) {
      for (let i = 0; i < mealInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('meal_tracking').insert(mealInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }

    // 8. Import Mileage
    console.log("Processing Mileage...");
    const mileageInserts = [];
    for (const mil of (data.mileage || [])) {
      const reason = (mil.reason && mil.reason !== 'NULL') ? mil.reason : ((mil.location && mil.location !== 'NULL') ? mil.location : null);
      mileageInserts.push({
        user_id: actualUserId,
        organization_id: orgId,
        date: mil.date !== '0000-00-00' ? mil.date : new Date().toISOString().split('T')[0],
        miles: mil.miles ? parseFloat(mil.miles) : 0,
        purpose: reason
      });
    }
    if (mileageInserts.length > 0) {
      for (let i = 0; i < mileageInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from('mileage_logs').insert(mileageInserts.slice(i, i + 500));
        if (error) throw error;
      }
    }

    console.log("SUCCESS! All data imported to Cathy's org.");
  } catch (error) {
    console.error("FATAL ERROR during manual import:", error);
  }
}

const [, , filePathArg, orgIdArg, userIdArg] = process.argv;
if (filePathArg && orgIdArg && userIdArg) {
  runImport(filePathArg, orgIdArg, userIdArg).then(() => {
    console.log("Done");
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.log("Usage: npx tsx scripts/manual_import.ts <filePath> <orgId> <userId>");
}
