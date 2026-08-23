"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var supabase_js_1 = require("@supabase/supabase-js");
// Setup Supabase by parsing .env.local
var envPath = path_1.default.join(process.cwd(), '.env.local');
var envContent = fs_1.default.readFileSync(envPath, 'utf8');
var env = {};
envContent.split('\n').forEach(function (line) {
    var match = line.match(/^([^=]+)=(.*)$/);
    if (match)
        env[match[1]] = match[2].trim();
});
var supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
var supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
var supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
function runImport(filePath, orgId, actualUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var rawText, data, familyIdMap, childIdMap, existingFams, existingFamMap, existingContacts, existingContactMap, existingChildren, existingChildMap, familiesToInsert, uniqueNewFamilies, _i, _a, client, ln, _b, insertedFams, error, _c, _d, fam, contactsToInsert, _e, _f, client, client_id, first_name, last_name, address, city, state, zip, home_phone, clientEmail, ln, famId, contactKey, i, error, unmappedFamiliesToInsert, unmappedFamiliesSet, _g, _h, child, child_client_id, fallbackName, _j, newFams, error, _k, _l, fam, childrenToInsert, childNameMap, _m, _o, child, child_id, child_client_id, name_1, birth_date, hourly_rate, active, famId, fallbackName, nameParts, first_name, last_name, childKey, i, chunk, _p, insertedChildren, error, _q, _r, c, key, legacyId, _s, _t, c, key, legacyId, attendanceInserts, _u, _v, att, newChildId, checkIn, checkOut, i, error, masterCategoryMap, catPath, expenseInserts, _w, _x, exp, catId, categoryName, i, error, noteInserts, _y, _z, note, i, error, incomeInserts, _0, _1, inc, famId, i, error, mealInserts, _2, _3, meal, isAggregate, brkCount, snackCount, lunCount, maxCount, j, newChildId, i, error, mileageInserts, _4, _5, mil, reason, i, error, error_1;
        var _6, _7, _8, _9, _10, _11, _12, _13, _14, _15;
        return __generator(this, function (_16) {
            switch (_16.label) {
                case 0:
                    _16.trys.push([0, 40, , 41]);
                    console.log("Starting import for Org: ".concat(orgId));
                    console.log("Using Owner User ID: ".concat(actualUserId));
                    console.log("Reading file: ".concat(filePath));
                    rawText = fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), filePath), 'utf8');
                    rawText = rawText.replace(/\t/g, '');
                    data = JSON.parse(rawText);
                    console.log("Loaded JSON: ".concat((_6 = data.expenses) === null || _6 === void 0 ? void 0 : _6.length, " expenses, ").concat((_7 = data.income) === null || _7 === void 0 ? void 0 : _7.length, " income, ").concat((_8 = data.meals) === null || _8 === void 0 ? void 0 : _8.length, " meals, ").concat((_9 = data.mileage) === null || _9 === void 0 ? void 0 : _9.length, " mileage"));
                    familyIdMap = {};
                    childIdMap = {};
                    return [4 /*yield*/, supabaseAdmin.from('families').select('id, family_name').eq('organization_id', orgId)];
                case 1:
                    existingFams = (_16.sent()).data;
                    existingFamMap = new Map((existingFams || []).map(function (f) { var _a; return [(_a = f.family_name) === null || _a === void 0 ? void 0 : _a.toLowerCase(), f.id]; }));
                    return [4 /*yield*/, supabaseAdmin.from('contacts').select('id, first_name, family_id').eq('organization_id', orgId)];
                case 2:
                    existingContacts = (_16.sent()).data;
                    existingContactMap = new Map((existingContacts || []).map(function (c) { var _a; return ["".concat(c.family_id, "_").concat((_a = c.first_name) === null || _a === void 0 ? void 0 : _a.toLowerCase()), c.id]; }));
                    return [4 /*yield*/, supabaseAdmin.from('children').select('id, first_name, last_name, family_id').eq('organization_id', orgId)];
                case 3:
                    existingChildren = (_16.sent()).data;
                    existingChildMap = new Map((existingChildren || []).map(function (c) { var _a, _b; return ["".concat((_a = c.first_name) === null || _a === void 0 ? void 0 : _a.toLowerCase(), "_").concat((_b = c.last_name) === null || _b === void 0 ? void 0 : _b.toLowerCase()), c.id]; }));
                    // 1. Bulk Import Clients as Families
                    console.log("Processing Families...");
                    familiesToInsert = [];
                    uniqueNewFamilies = new Set();
                    for (_i = 0, _a = (data.clients || []); _i < _a.length; _i++) {
                        client = _a[_i];
                        ln = (client.last_name || 'Unknown Family').toLowerCase();
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
                    if (!(familiesToInsert.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabaseAdmin.from('families').insert(familiesToInsert).select('id, family_name')];
                case 4:
                    _b = _16.sent(), insertedFams = _b.data, error = _b.error;
                    if (error)
                        throw error;
                    for (_c = 0, _d = (insertedFams || []); _c < _d.length; _c++) {
                        fam = _d[_c];
                        existingFamMap.set((_10 = fam.family_name) === null || _10 === void 0 ? void 0 : _10.toLowerCase(), fam.id);
                    }
                    _16.label = 5;
                case 5:
                    // 2. Map Families and Bulk Import Contacts
                    console.log("Processing Contacts...");
                    contactsToInsert = [];
                    for (_e = 0, _f = (data.clients || []); _e < _f.length; _e++) {
                        client = _f[_e];
                        client_id = client.client_id, first_name = client.first_name, last_name = client.last_name, address = client.address, city = client.city, state = client.state, zip = client.zip, home_phone = client.home_phone, clientEmail = client.email;
                        ln = (last_name || 'Unknown Family').toLowerCase();
                        famId = existingFamMap.get(ln);
                        if (famId) {
                            familyIdMap[client_id] = famId;
                            if (first_name) {
                                contactKey = "".concat(famId, "_").concat(first_name.toLowerCase());
                                if (!existingContactMap.has(contactKey)) {
                                    existingContactMap.set(contactKey, 'pending');
                                    contactsToInsert.push({
                                        user_id: actualUserId,
                                        organization_id: orgId,
                                        family_id: famId,
                                        first_name: first_name,
                                        last_name: last_name,
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
                    if (!(contactsToInsert.length > 0)) return [3 /*break*/, 9];
                    i = 0;
                    _16.label = 6;
                case 6:
                    if (!(i < contactsToInsert.length)) return [3 /*break*/, 9];
                    return [4 /*yield*/, supabaseAdmin.from('contacts').insert(contactsToInsert.slice(i, i + 500))];
                case 7:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 8;
                case 8:
                    i += 500;
                    return [3 /*break*/, 6];
                case 9:
                    // 3. Bulk Import Unmapped Families for Children
                    console.log("Processing Unmapped Families...");
                    unmappedFamiliesToInsert = [];
                    unmappedFamiliesSet = new Set();
                    for (_g = 0, _h = (data.children || []); _g < _h.length; _g++) {
                        child = _h[_g];
                        child_client_id = child.child_client_id;
                        if (!familyIdMap[child_client_id]) {
                            fallbackName = "Unmapped Family - Client ".concat(child_client_id || 'Unknown');
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
                    if (!(unmappedFamiliesToInsert.length > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, supabaseAdmin.from('families').insert(unmappedFamiliesToInsert).select('id, family_name')];
                case 10:
                    _j = _16.sent(), newFams = _j.data, error = _j.error;
                    if (error)
                        throw error;
                    for (_k = 0, _l = (newFams || []); _k < _l.length; _k++) {
                        fam = _l[_k];
                        existingFamMap.set((_11 = fam.family_name) === null || _11 === void 0 ? void 0 : _11.toLowerCase(), fam.id);
                    }
                    _16.label = 11;
                case 11:
                    // 4. Bulk Import Children
                    console.log("Processing Children...");
                    childrenToInsert = [];
                    childNameMap = new Map();
                    for (_m = 0, _o = (data.children || []); _m < _o.length; _m++) {
                        child = _o[_m];
                        child_id = child.child_id, child_client_id = child.child_client_id, name_1 = child.name, birth_date = child.birth_date, hourly_rate = child.hourly_rate, active = child.active;
                        famId = familyIdMap[child_client_id];
                        if (!famId) {
                            fallbackName = "Unmapped Family - Client ".concat(child_client_id || 'Unknown');
                            famId = existingFamMap.get(fallbackName.toLowerCase());
                        }
                        if (!famId)
                            continue;
                        nameParts = (name_1 || 'Unknown Child').split(' ');
                        first_name = nameParts[0];
                        last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';
                        childKey = "".concat(first_name.toLowerCase(), "_").concat(last_name.toLowerCase());
                        childNameMap.set(childKey, child_id);
                        if (!existingChildMap.has(childKey)) {
                            existingChildMap.set(childKey, 'pending');
                            childrenToInsert.push({
                                user_id: actualUserId,
                                organization_id: orgId,
                                family_id: famId,
                                first_name: first_name,
                                last_name: last_name,
                                date_of_birth: birth_date && birth_date !== '0000-00-00' && birth_date !== 'NULL' ? birth_date : null,
                                is_active: active === '1',
                                standard_weekly_rate: hourly_rate ? parseFloat(hourly_rate) * 40 : 150.00
                            });
                        }
                    }
                    if (!(childrenToInsert.length > 0)) return [3 /*break*/, 15];
                    i = 0;
                    _16.label = 12;
                case 12:
                    if (!(i < childrenToInsert.length)) return [3 /*break*/, 15];
                    chunk = childrenToInsert.slice(i, i + 500);
                    return [4 /*yield*/, supabaseAdmin.from('children').insert(chunk).select('id, first_name, last_name')];
                case 13:
                    _p = _16.sent(), insertedChildren = _p.data, error = _p.error;
                    if (error)
                        throw error;
                    for (_q = 0, _r = (insertedChildren || []); _q < _r.length; _q++) {
                        c = _r[_q];
                        key = "".concat((_12 = c.first_name) === null || _12 === void 0 ? void 0 : _12.toLowerCase(), "_").concat((_13 = c.last_name) === null || _13 === void 0 ? void 0 : _13.toLowerCase());
                        legacyId = childNameMap.get(key);
                        if (legacyId)
                            childIdMap[legacyId] = c.id;
                    }
                    _16.label = 14;
                case 14:
                    i += 500;
                    return [3 /*break*/, 12];
                case 15:
                    // Map existing children back to legacy IDs
                    for (_s = 0, _t = (existingChildren || []); _s < _t.length; _s++) {
                        c = _t[_s];
                        key = "".concat((_14 = c.first_name) === null || _14 === void 0 ? void 0 : _14.toLowerCase(), "_").concat((_15 = c.last_name) === null || _15 === void 0 ? void 0 : _15.toLowerCase());
                        legacyId = childNameMap.get(key);
                        if (legacyId)
                            childIdMap[legacyId] = c.id;
                    }
                    // 3. Import Attendance
                    console.log("Processing Attendance...");
                    attendanceInserts = [];
                    for (_u = 0, _v = (data.attendance || []); _u < _v.length; _u++) {
                        att = _v[_u];
                        newChildId = childIdMap[att.attend_child_id];
                        if (!newChildId)
                            continue;
                        checkIn = null;
                        checkOut = null;
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
                    if (!(attendanceInserts.length > 0)) return [3 /*break*/, 19];
                    i = 0;
                    _16.label = 16;
                case 16:
                    if (!(i < attendanceInserts.length)) return [3 /*break*/, 19];
                    return [4 /*yield*/, supabaseAdmin.from('attendance').insert(attendanceInserts.slice(i, i + 500))];
                case 17:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 18;
                case 18:
                    i += 500;
                    return [3 /*break*/, 16];
                case 19:
                    masterCategoryMap = {};
                    catPath = path_1.default.join(process.cwd(), 'expense_categories.json');
                    if (fs_1.default.existsSync(catPath))
                        masterCategoryMap = JSON.parse(fs_1.default.readFileSync(catPath, 'utf8'));
                    // 4. Import Expenses
                    console.log("Processing Expenses...");
                    expenseInserts = [];
                    for (_w = 0, _x = (data.expenses || []); _w < _x.length; _w++) {
                        exp = _x[_w];
                        catId = exp.expensecategory_id || exp.category_id || exp.exp_exp_type_id;
                        categoryName = 'Legacy Expense';
                        if (catId && masterCategoryMap[catId])
                            categoryName = masterCategoryMap[catId];
                        else if (exp.category && exp.category !== 'NULL')
                            categoryName = exp.category;
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
                    if (!(expenseInserts.length > 0)) return [3 /*break*/, 23];
                    i = 0;
                    _16.label = 20;
                case 20:
                    if (!(i < expenseInserts.length)) return [3 /*break*/, 23];
                    return [4 /*yield*/, supabaseAdmin.from('expenses').insert(expenseInserts.slice(i, i + 500))];
                case 21:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 22;
                case 22:
                    i += 500;
                    return [3 /*break*/, 20];
                case 23:
                    // 5. Import Notes
                    console.log("Processing Notes...");
                    noteInserts = [];
                    for (_y = 0, _z = (data.notes || []); _y < _z.length; _y++) {
                        note = _z[_y];
                        noteInserts.push({
                            organization_id: orgId,
                            date: note.date !== '0000-00-00' ? note.date : new Date().toISOString().split('T')[0],
                            note_text: note.note,
                            is_day_off: note.day_off === '1'
                        });
                    }
                    if (!(noteInserts.length > 0)) return [3 /*break*/, 27];
                    i = 0;
                    _16.label = 24;
                case 24:
                    if (!(i < noteInserts.length)) return [3 /*break*/, 27];
                    return [4 /*yield*/, supabaseAdmin.from('provider_notes').insert(noteInserts.slice(i, i + 500))];
                case 25:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 26;
                case 26:
                    i += 500;
                    return [3 /*break*/, 24];
                case 27:
                    // 6. Import Income
                    console.log("Processing Income...");
                    incomeInserts = [];
                    for (_0 = 0, _1 = (data.income || []); _0 < _1.length; _0++) {
                        inc = _1[_0];
                        famId = inc.client_id ? familyIdMap[inc.client_id] : null;
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
                    if (!(incomeInserts.length > 0)) return [3 /*break*/, 31];
                    i = 0;
                    _16.label = 28;
                case 28:
                    if (!(i < incomeInserts.length)) return [3 /*break*/, 31];
                    return [4 /*yield*/, supabaseAdmin.from('payments').insert(incomeInserts.slice(i, i + 500))];
                case 29:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 30;
                case 30:
                    i += 500;
                    return [3 /*break*/, 28];
                case 31:
                    // 7. Import Meals
                    console.log("Processing Meals...");
                    mealInserts = [];
                    for (_2 = 0, _3 = (data.meals || []); _2 < _3.length; _2++) {
                        meal = _3[_2];
                        isAggregate = !meal.meal_child_id || meal.meal_child_id === '0' || meal.meal_child_id === 'NULL';
                        if (isAggregate) {
                            brkCount = parseInt(meal.breakfast) || (meal.meal1 === '1' ? 1 : 0);
                            snackCount = parseInt(meal.snack) || (meal.meal2 === '1' ? 1 : 0);
                            lunCount = parseInt(meal.lunch) || (meal.meal3 === '1' ? 1 : 0);
                            maxCount = Math.max(brkCount, snackCount, lunCount);
                            for (j = 0; j < maxCount; j++) {
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
                        }
                        else {
                            newChildId = childIdMap[meal.meal_child_id];
                            if (!newChildId)
                                continue;
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
                    if (!(mealInserts.length > 0)) return [3 /*break*/, 35];
                    i = 0;
                    _16.label = 32;
                case 32:
                    if (!(i < mealInserts.length)) return [3 /*break*/, 35];
                    return [4 /*yield*/, supabaseAdmin.from('meal_tracking').insert(mealInserts.slice(i, i + 500))];
                case 33:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 34;
                case 34:
                    i += 500;
                    return [3 /*break*/, 32];
                case 35:
                    // 8. Import Mileage
                    console.log("Processing Mileage...");
                    mileageInserts = [];
                    for (_4 = 0, _5 = (data.mileage || []); _4 < _5.length; _4++) {
                        mil = _5[_4];
                        reason = (mil.reason && mil.reason !== 'NULL') ? mil.reason : ((mil.location && mil.location !== 'NULL') ? mil.location : null);
                        mileageInserts.push({
                            user_id: actualUserId,
                            organization_id: orgId,
                            date: mil.date !== '0000-00-00' ? mil.date : new Date().toISOString().split('T')[0],
                            miles: mil.miles ? parseFloat(mil.miles) : 0,
                            purpose: reason
                        });
                    }
                    if (!(mileageInserts.length > 0)) return [3 /*break*/, 39];
                    i = 0;
                    _16.label = 36;
                case 36:
                    if (!(i < mileageInserts.length)) return [3 /*break*/, 39];
                    return [4 /*yield*/, supabaseAdmin.from('mileage_logs').insert(mileageInserts.slice(i, i + 500))];
                case 37:
                    error = (_16.sent()).error;
                    if (error)
                        throw error;
                    _16.label = 38;
                case 38:
                    i += 500;
                    return [3 /*break*/, 36];
                case 39:
                    console.log("SUCCESS! All data imported to Cathy's org.");
                    return [3 /*break*/, 41];
                case 40:
                    error_1 = _16.sent();
                    console.error("FATAL ERROR during manual import:", error_1);
                    return [3 /*break*/, 41];
                case 41: return [2 /*return*/];
            }
        });
    });
}
var _a = process.argv, filePathArg = _a[2], orgIdArg = _a[3], userIdArg = _a[4];
if (filePathArg && orgIdArg && userIdArg) {
    runImport(filePathArg, orgIdArg, userIdArg).then(function () {
        console.log("Done");
        process.exit(0);
    }).catch(function (e) {
        console.error(e);
        process.exit(1);
    });
}
else {
    console.log("Usage: npx tsx scripts/manual_import.ts <filePath> <orgId> <userId>");
}
