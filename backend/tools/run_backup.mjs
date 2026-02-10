// backend/tools/run_backup.mjs
import dotenv from "dotenv";
dotenv.config();

import { runBackupNow } from "../src/google/backup.js";

(async () => {
  console.log("Running backup now...");
  const res = await runBackupNow({ keepLocal: true });
  console.log("Result:", res);
  process.exit(res?.success ? 0 : 2);
})();
