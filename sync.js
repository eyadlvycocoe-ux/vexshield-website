import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env from root or website directory
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../server/.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'airshield'
};

const FILE_PATH = path.join(__dirname, 'public', 'licenses-secret-x8f9v2m4p1q7z3w5.json');

async function syncFromDatabase() {
  let connection;
  try {
    console.log('Fetching servers from MySQL database...');
    connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute('SELECT server_ip, license_key, expires_at FROM servers');
    
    const formatted = (rows || []).map(s => ({
      "server ip": s.server_ip || "",
      "license": s.license_key || "",
      "expiration time": s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "permanent"
    }));
    
    fs.writeFileSync(FILE_PATH, JSON.stringify(formatted, null, 2));
    console.log(`✅ Success: Pulled ${formatted.length} servers into licenses.json from DB!`);
  } catch (dbErr) {
    console.error('MySQL fetch failed:', dbErr.message);
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
    }
  } finally {
    if (connection) await connection.end();
  }
}

async function syncToDatabase() {
  console.log('Reading local licenses.json...');
  if (!fs.existsSync(FILE_PATH)) {
    console.error('licenses.json not found!');
    return;
  }
  
  const localData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  console.log(`Pushing ${localData.length} records to MySQL Database...`);
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    for (const item of localData) {
      const expires_at = item["expiration time"] !== "permanent" 
        ? new Date(item["expiration time"].split('/').reverse().join('-')).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      await connection.execute(
        `INSERT INTO servers (server_ip, license_key, expires_at) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE license_key = VALUES(license_key), expires_at = VALUES(expires_at)`,
        [item["server ip"], item["license"], expires_at]
      );
    }
    console.log('✅ Success: licenses.json synced TO database!');
  } catch (err) {
    console.error('MySQL sync failed:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

const args = process.argv.slice(2);
if (args.includes('--push')) {
  syncToDatabase();
} else if (args.includes('--pull')) {
  syncFromDatabase();
} else {
  console.log('Usage:\n  node sync.js --pull   (Sync FROM database to licenses.json)\n  node sync.js --push   (Sync local licenses.json TO database)');
}
