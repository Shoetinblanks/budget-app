import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), process.argv[2] || 'import_cat1225g.json');
const csvPath = path.join(process.cwd(), process.argv[3] || 'cat1225g_income.csv');

// Read JSON
let rawJson = fs.readFileSync(jsonPath, 'utf8');
rawJson = rawJson.replace(/\t/g, ''); // Fix invalid tabs
const data = JSON.parse(rawJson);

// Create client lookup map
const clientMap = new Map();
for (const client of (data.clients || [])) {
  const fName = (client.first_name || '').trim();
  const lName = (client.last_name || '').trim();
  if (fName || lName) {
    clientMap.set(`${fName}|${lName}`, client.client_id || client.id);
  }
}

// Read CSV
const csvText = fs.readFileSync(csvPath, 'utf8');
const lines = csvText.split('\n');
const headers = lines[0].split(',').map(h => h.trim());

// Simple CSV parser for quoted fields
function parseCsvLine(text: string) {
  let inQuote = false;
  let current = '';
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const newIncome = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const values = parseCsvLine(line);
  if (values.length < 5) continue;

  const date = values[0];
  const firstName = values[1].trim();
  const lastName = values[2].trim();
  const amount = values[3];
  const checkNumber = values[4];
  const note = values.length > 5 ? values[5] : '';

  const clientId = clientMap.get(`${firstName}|${lastName}`);

  newIncome.push({
    client_id: clientId || null,
    date: date,
    amount: amount,
    payment_method: checkNumber && checkNumber !== 'NULL' ? `Check #${checkNumber}` : 'other',
    description: note && note !== 'NULL' ? note : null
  });
}

data.income = newIncome;

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
console.log(`Successfully injected ${newIncome.length} income records into ${path.basename(jsonPath)}!`);
