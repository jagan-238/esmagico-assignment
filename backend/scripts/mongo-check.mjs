/**
 * Diagnose Atlas connection without printing your password.
 * Usage: npm run mongo:check
 */
import mongoose from 'mongoose';
import fs from 'fs';
import { loadEnv, getMongoUrl, ENV_FILE_PATH } from '../src/config/env.js';

function strip(s) {
  return String(s || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .trim();
}

console.log('--- MongoDB connection check ---\n');
console.log('.env path:', ENV_FILE_PATH);
console.log('.env exists:', fs.existsSync(ENV_FILE_PATH) ? 'yes' : 'NO — run: npm run setup-env\n');

loadEnv();

const u = strip(process.env.MONGO_USER);
const h = strip(process.env.MONGO_HOST);
const pRaw = process.env.MONGO_PASSWORD != null ? String(process.env.MONGO_PASSWORD).replace(/\r/g, '') : '';
const hasUrl = !!(process.env.MONGO_URL && strip(process.env.MONGO_URL));

console.log('MONGO_USER:', u ? `"${u}" (${u.length} chars)` : '(not set)');
console.log('MONGO_HOST:', h || '(not set)');
console.log(
  'MONGO_PASSWORD:',
  pRaw !== '' ? `(set, ${pRaw.length} chars — not shown)` : '(not set or empty)'
);
console.log('MONGO_URL:', hasUrl ? '(set; ignored if USER and HOST are both set)' : '(not set)');

const uri = getMongoUrl();
function mask(s) {
  if (!s) return '(empty)';
  return s.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@)/, (_, a, pw, at) => `${a}${'*'.repeat(Math.min(12, pw.length))}${at}`);
}
console.log('\nResolved URI (password masked):');
console.log(mask(uri));

if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
  console.error('\nNo valid connection string. Edit backend/.env — see .env.example');
  process.exit(1);
}

console.log('\nConnecting…');
mongoose.set('strictQuery', true);
try {
  await mongoose.connect(uri);
  console.log('SUCCESS: database authentication worked.\n');
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('\nFAILED:', err.message);
  console.error(`
In MongoDB Atlas (same organization as this cluster):
  1) Database Access → your user → Edit → Edit Password → Save → put that password in MONGO_PASSWORD.
  2) Or Add New Database User → Password → role "Read and write to any database" → use that username/password in .env.
  3) Network Access → allow your current IP (or 0.0.0.0/0 for local testing only).
  4) Connect → Drivers → copy the hostname; it must match MONGO_HOST (e.g. cluster0.xxxxx.mongodb.net).

If USER+HOST+PASSWORD are set but still fails, the password in Atlas does not match MONGO_PASSWORD (reset it again).
`);
  process.exit(1);
}
