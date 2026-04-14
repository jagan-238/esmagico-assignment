import mongoose from 'mongoose';
import { getMongoUrl, ENV_FILE_PATH } from './env.js';

export async function connectDb() {
  const uri = getMongoUrl();
  if (!uri) {
    throw new Error(
      `MONGO_URL is missing or empty.\n` +
        `- File should be: ${ENV_FILE_PATH}\n` +
        `- Use ONE assignment: MONGO_URL=mongodb+srv://user:pass@host/db (not MONGO_URL=MONGO_URL=...)\n` +
        `- Copy from backend/.env.example`
    );
  }
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      `MONGO_URL does not look like a MongoDB URI (should start with mongodb:// or mongodb+srv://).\n` +
        `Check ${ENV_FILE_PATH} for a duplicate "MONGO_URL=" prefix on the same line.`
    );
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri);
  } catch (err) {
    const code = err?.code ?? err?.errorResponse?.code;
    const msg = String(err?.message || err);
    const authFailed =
      code === 8000 ||
      /bad auth|authentication failed/i.test(msg) ||
      err?.codeName === 'AtlasError';

    if (authFailed) {
      throw new Error(
        `MongoDB Atlas authentication failed.\n\n` +
          `Atlas is rejecting the database user or password (not your Express code).\n\n` +
          `Check ${ENV_FILE_PATH}:\n` +
          `1) Atlas → Database Access → your user must be active. Use "Edit" → "Edit Password", set a NEW password, save.\n` +
          `2) Use that password exactly. Avoid a single MONGO_URL line if unsure — use instead:\n` +
          `     MONGO_USER=yourDbUsername\n` +
          `     MONGO_PASSWORD=yourNewPassword\n` +
          `     MONGO_HOST=cluster0.vtzlekd.mongodb.net\n` +
          `     MONGO_DB=workflowDB\n` +
          `   (and remove or comment out MONGO_URL). Password is URL-encoded automatically.\n` +
          `3) If you use MONGO_URL only: special chars in password need %encoding (@→%40, etc.).\n` +
          `4) Network Access: allow your IP.\n` +
          `5) Save .env as UTF-8 without BOM (VS Code: bottom bar encoding).\n\n` +
          `Driver error: ${msg}`
      );
    }
    throw err;
  }
}
