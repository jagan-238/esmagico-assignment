import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** backend/.env (always next to package.json, not cwd-dependent) */
export const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');

export function loadEnv() {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    console.error(
      `\nMissing ${ENV_FILE_PATH}\nCopy backend/.env.example to backend/.env and set MONGO_URL (one line, no duplicate "MONGO_URL=").`
    );
    return;
  }
  dotenv.config({ path: ENV_FILE_PATH });
}

function stripBom(s) {
  return String(s)
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .trim();
}

/**
 * If MONGO_USER + MONGO_HOST are set, builds SRV URI with encodeURIComponent (fixes special chars in password).
 * Otherwise uses MONGO_URL (strips duplicate "MONGO_URL=" typos and BOM).
 */
export function getMongoUrl() {
  const user = stripBom(process.env.MONGO_USER || '');
  const host = stripBom(process.env.MONGO_HOST || '');
  if (user && host) {
    const pass = process.env.MONGO_PASSWORD != null ? stripBom(String(process.env.MONGO_PASSWORD)) : '';
    const db = stripBom(process.env.MONGO_DB || 'workflowDB') || 'workflowDB';
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass);
    return `mongodb+srv://${u}:${p}@${host}/${db}?retryWrites=true&w=majority&authSource=admin`;
  }

  let raw = process.env.MONGO_URL;
  if (raw == null || stripBom(raw) === '') return '';
  let u = stripBom(raw);
  while (u.startsWith('MONGO_URL=')) {
    u = stripBom(u.slice('MONGO_URL='.length));
  }
  if (u.startsWith('mongodb+srv://') && !/[\?&]authSource=/.test(u)) {
    u += u.includes('?') ? '&' : '?';
    u += 'authSource=admin';
  }
  return u;
}
