// Export all data from SQLite to JSON files for migration to PostgreSQL
// Run this BEFORE switching DATABASE_URL to PostgreSQL
import { db } from "/home/z/my-project/src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function exportAll() {
  const exportDir = "/home/z/my-project/data-export";
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  console.log("=== EXPORT DATA TO JSON ===\n");

  const tables = [
    "user", "appSetting", "taxConfig", "financeCategory", "roleResponsibility",
    "documentLayout", "client", "event", "financeTransaction", "financeSetting",
    "inventory", "taxPayment", "assetMovement",
    "dailyAgenda", "dailyWorkSummary", "kanbanCard", "dailyTask",
    "kpiLog", "scoreLog", "teamAssessment", "assessmentCriteria",
    "attendance", "salaryConfig", "payroll", "employeeProfile",
    "contentIdea", "article",
    "document", "surat", "invoice",
    "notification", "pushSubscription",
    "subscription", "subscriptionPayment",
    "aiChatHistory", "session",
  ];

  let totalRecords = 0;

  for (const table of tables) {
    try {
      const records = await (db as any)[table].findMany();
      if (records.length > 0) {
        const filePath = path.join(exportDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
        console.log(`✓ ${table}: ${records.length} records → ${table}.json`);
        totalRecords += records.length;
      } else {
        console.log(`  ${table}: empty (skipped)`);
      }
    } catch (e: any) {
      console.log(`⚠ ${table}: ${e.message}`);
    }
  }

  console.log(`\n=== TOTAL: ${totalRecords} records exported ===`);
  console.log(`📁 Files saved to: ${exportDir}`);
  console.log(`\nNext steps:`);
  console.log(`1. Set DATABASE_URL to PostgreSQL in .env`);
  console.log(`2. Run: bun run db:push (creates tables in PostgreSQL)`);
  console.log(`3. Run: bun run import-export.ts (imports data to PostgreSQL)`);
  console.log(`4. Deploy to Vercel`);

  await db.$disconnect();
}

exportAll().catch(e => { console.error("FATAL:", e); process.exit(1); });
