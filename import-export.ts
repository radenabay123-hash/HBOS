// Import data from JSON files to PostgreSQL (after db:push)
import { db } from "/home/z/my-project/src/lib/db";
import * as fs from "fs";
import * as path from "path";

const importDir = "/home/z/my-project/data-export";

async function importAll() {
  if (!fs.existsSync(importDir)) {
    console.log("❌ No export directory found. Run export-data.ts first.");
    process.exit(1);
  }

  console.log("=== IMPORT DATA FROM JSON TO POSTGRESQL ===\n");

  // Order matters: parent tables first, then child tables
  const importOrder = [
    "user",
    "appSetting",
    "taxConfig",
    "financeCategory",
    "roleResponsibility",
    "documentLayout",
    "salaryConfig",
    "client",
    "event",
    "employeeProfile",
    "financeTransaction",
    "financeSetting",
    "inventory",
    "assetMovement",
    "taxPayment",
    "dailyTask",
    "kanbanCard",
    "dailyWorkSummary",
    "dailyAgenda",
    "kpiLog",
    "scoreLog",
    "assessmentCriteria",
    "teamAssessment",
    "attendance",
    "payroll",
    "contentIdea",
    "article",
    "document",
    "surat",
    "invoice",
    "notification",
    "pushSubscription",
    "subscription",
    "subscriptionPayment",
    "aiChatHistory",
    "session",
  ];

  let totalImported = 0;

  for (const table of importOrder) {
    const filePath = path.join(importDir, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ${table}: no export file (skipped)`);
      continue;
    }

    try {
      const records = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (records.length === 0) {
        console.log(`  ${table}: empty (skipped)`);
        continue;
      }

      // Convert date strings back to Date objects
      const processed = records.map((r: any) => {
        const obj = { ...r };
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === "string" && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
            obj[key] = new Date(obj[key]);
          }
        }
        return obj;
      });

      // Use createMany for bulk insert
      await (db as any)[table].createMany({ data: processed });
      console.log(`✓ ${table}: ${processed.length} records imported`);
      totalImported += processed.length;
    } catch (e: any) {
      console.log(`⚠ ${table}: ${e.message}`);
    }
  }

  console.log(`\n=== TOTAL: ${totalImported} records imported to PostgreSQL ===`);
  await db.$disconnect();
}

importAll().catch(e => { console.error("FATAL:", e); process.exit(1); });
