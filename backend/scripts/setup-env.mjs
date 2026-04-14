import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');
const examplePath = path.join(backendRoot, '.env.example');

if (fs.existsSync(envPath)) {
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error('Missing .env.example at', examplePath);
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log('Created', envPath);
console.log('Edit that file: set MONGO_URL (real password) and JWT_SECRET, then run npm run dev');
