import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Initialize Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log("\n⚠️  WARNING: THIS WILL PERMANENTLY DELETE ALL DAYCARE DATA FOR AN ORGANIZATION ⚠️\n");
  console.log("This will delete ALL Families, Children, Attendance, Expenses, Meals, Mileage, Notes, and Billing Data.");
  console.log("This will NOT delete the organization itself, the owner's user account, or the provider settings.\n");

  rl.question('Please enter the Organization ID you wish to wipe: ', async (orgId) => {
    if (!orgId || orgId.trim() === '') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }

    // Verify org exists
    const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').select('id').eq('id', orgId.trim()).single();
    if (orgErr || !org) {
      console.log('Error: Organization not found with that ID.');
      rl.close();
      return;
    }

    rl.question(`\nType "CONFIRM" to permanently delete all data for Organization ${orgId.trim()}: `, async (confirmation) => {
      if (confirmation !== 'CONFIRM') {
        console.log('Operation cancelled.');
        rl.close();
        return;
      }

      console.log('\n🗑️  Starting data wipe process...\n');

      try {
        const targetOrgId = orgId.trim();

        // 1. Delete Meals
        const { error: mealErr } = await supabaseAdmin.from('meal_tracking').delete().eq('organization_id', targetOrgId);
        if (mealErr) console.error("Error deleting meals:", mealErr.message);
        else console.log("✅ Meals deleted");

        // 2. Delete Mileage
        // Note: mileage_logs might only be tied to user_id. We'll delete based on user_ids in this org.
        const { data: members } = await supabaseAdmin.from('organization_members').select('user_id').eq('organization_id', targetOrgId);
        if (members && members.length > 0) {
           const userIds = members.map(m => m.user_id);
           const { error: mileageErr } = await supabaseAdmin.from('mileage_logs').delete().in('user_id', userIds);
           if (mileageErr) console.error("Error deleting mileage:", mileageErr.message);
           else console.log("✅ Mileage deleted");
        }

        // 3. Delete Expenses
        const { error: expErr } = await supabaseAdmin.from('expenses').delete().eq('organization_id', targetOrgId);
        if (expErr) console.error("Error deleting expenses:", expErr.message);
        else console.log("✅ Expenses deleted");

        // 4. Delete Notes
        const { error: noteErr } = await supabaseAdmin.from('provider_notes').delete().eq('organization_id', targetOrgId);
        if (noteErr) console.error("Error deleting notes:", noteErr.message);
        else console.log("✅ Notes deleted");

        // 5. Delete Attendance
        const { error: attErr } = await supabaseAdmin.from('attendance').delete().eq('organization_id', targetOrgId);
        if (attErr) console.error("Error deleting attendance:", attErr.message);
        else console.log("✅ Attendance deleted");

        // 6. Delete Payments
        const { error: payErr } = await supabaseAdmin.from('payments').delete().eq('organization_id', targetOrgId);
        if (payErr) console.error("Error deleting payments:", payErr.message);
        else console.log("✅ Payments deleted");

        // 7. Delete Invoices (this will cascade delete invoice_line_items if set up correctly, otherwise we must do line items first)
        const { data: invoices } = await supabaseAdmin.from('invoices').select('id').eq('organization_id', targetOrgId);
        if (invoices && invoices.length > 0) {
            const invoiceIds = invoices.map(i => i.id);
            await supabaseAdmin.from('invoice_line_items').delete().in('invoice_id', invoiceIds);
            const { error: invErr } = await supabaseAdmin.from('invoices').delete().eq('organization_id', targetOrgId);
            if (invErr) console.error("Error deleting invoices:", invErr.message);
            else console.log("✅ Invoices & Line Items deleted");
        }

        // 8. Delete Children
        const { error: childErr } = await supabaseAdmin.from('children').delete().eq('organization_id', targetOrgId);
        if (childErr) console.error("Error deleting children:", childErr.message);
        else console.log("✅ Children deleted");

        // 9. Delete Contacts
        const { error: contactErr } = await supabaseAdmin.from('contacts').delete().eq('organization_id', targetOrgId);
        if (contactErr) console.error("Error deleting contacts:", contactErr.message);
        else console.log("✅ Contacts deleted");

        // 10. Delete Families
        const { error: famErr } = await supabaseAdmin.from('families').delete().eq('organization_id', targetOrgId);
        if (famErr) console.error("Error deleting families:", famErr.message);
        else console.log("✅ Families deleted");

        console.log('\n🎉 Successfully wiped all records for the organization! It is now a clean slate.');
      } catch (err) {
        console.error("An unexpected error occurred:", err);
      } finally {
        rl.close();
      }
    });
  });
}

main();
