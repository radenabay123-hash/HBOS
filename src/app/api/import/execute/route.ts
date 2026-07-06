import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

// POST: Execute import with confirmed mapping
// Body: { module, rows (raw data), fieldMapping, userMatching, options }
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { module, rows, fieldMapping, userMatching, userMatchingColumn, options = {} } = body;
    if (!module || !rows || !fieldMapping) return err("Module, rows, fieldMapping wajib diisi", 400);

    const result = {
      module,
      totalRows: rows.length,
      success: 0,
      failed: 0,
      skipped: 0,
      newUsers: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    // ===== Build user lookup from userMatching =====
    // userMatching: [{ csvValue, matchedUser, action, newUser? }]
    // userMatchingColumn: the CSV column name that contains the user identifier
    const userLookup = new Map<string, { id: string; isNew: boolean }>();
    for (const um of userMatching) {
      if (um.matchedUser) {
        userLookup.set(um.csvValue, { id: um.matchedUser.id, isNew: false });
      } else if (um.action === "create_new") {
        // Create new user (use newUser config if provided, otherwise auto-create with defaults)
        try {
          // Try to find the employee name from the rows for a better display name
          let displayName = um.csvValue;
          // If userMatchingColumn is "username", try to find "employeeName" in rows
          const sampleRow = rows.find((r: any) => r[userMatchingColumn] === um.csvValue);
          if (sampleRow && sampleRow.employeeName) {
            displayName = sampleRow.employeeName;
          }
          const email = um.newUser?.email || `${um.csvValue.toLowerCase().replace(/\s+/g, ".")}@hafara.com`;
          // Check if email already exists
          const existing = await db.user.findUnique({ where: { email } });
          if (existing) {
            userLookup.set(um.csvValue, { id: existing.id, isNew: false });
            continue;
          }
          const hashedPassword = await bcrypt.hash("password123", 10);
          const newUser = await db.user.create({
            data: {
              name: displayName,
              email,
              password: hashedPassword,
              role: um.newUser?.role || "ASSISTANT_TRAINER",
              position: um.newUser?.position || "Karyawan",
              phone: um.newUser?.phone || "",
              isActive: true,
            },
          });
          userLookup.set(um.csvValue, { id: newUser.id, isNew: true });
          result.newUsers++;
        } catch (e: any) {
          result.errors.push(`Gagal buat user "${um.csvValue}": ${e.message}`);
        }
      }
    }

    // ===== Execute import based on module =====
    if (module === "PAYROLL") {
      await importPayroll(rows, fieldMapping, userLookup, userMatchingColumn, result, options);
    } else if (module === "CRM_CLIENT") {
      await importCrmClient(rows, fieldMapping, result, options);
    } else if (module === "INVOICE") {
      await importInvoice(rows, fieldMapping, result, options);
    } else if (module === "FINANCE_TRANSACTION") {
      await importFinanceTxn(rows, fieldMapping, result, options);
    } else if (module === "USER") {
      await importUser(rows, fieldMapping, result, options);
    } else if (module === "ABSENSI") {
      await importAbsensi(rows, fieldMapping, userLookup, result, options);
    } else {
      return err(`Module ${module} belum didukung untuk import`, 400);
    }

    return ok({ result });
  });
}

// ===== Helper: invert fieldMapping to get { hbosField: csvColumn } =====
function invertMapping(mapping: any): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [csvCol, hbosField] of Object.entries(mapping || {})) {
    if (hbosField) inverted[hbosField as string] = csvCol;
  }
  return inverted;
}

// ===== Import Payroll =====
async function importPayroll(rows: any[], mapping: any, userLookup: Map<string, { id: string; isNew: boolean }>, userMatchingColumn: string, result: any, options: any) {
  // Invert mapping: { hbosField: csvColumn } for easy lookup
  const inv = invertMapping(mapping);
  const userCol = userMatchingColumn;
  const monthCol = inv.month;
  const yearCol = inv.year;
  const baseCol = inv.baseSalary;
  const mealCol = inv.mealAllowance;
  const transportCol = inv.transportAllowance;
  const allowCol = inv.grossSalary; // AI might map allowances to grossSalary
  const dedCol = inv.totalDeduction || inv.otherDeduction;
  const netCol = inv.netSalary;
  const statusCol = inv.status;
  const paidCol = inv.paidAt;
  const noteCol = inv.note;

  if (!userCol || !monthCol || !yearCol || !baseCol) {
    result.errors.push("Mapping tidak lengkap: butuh userMatchingColumn, month, year, baseSalary");
    result.failed = rows.length;
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const userVal = getColValue(row, userCol);
      const userId = userLookup.get(String(userVal))?.id;
      if (!userId) {
        result.skipped++;
        result.details.push({ row: i + 1, status: "skipped", reason: `User "${userVal}" tidak ditemukan` });
        continue;
      }

      const month = Number(getColValue(row, monthCol));
      const year = Number(getColValue(row, yearCol));
      const baseSalary = Number(getColValue(row, baseCol)) || 0;
      // Support both allowances → mealAllowance and direct mealAllowance/transportAllowance mapping
      const mealAllowance = mealCol ? Number(getColValue(row, mealCol)) || 0 : (allowCol ? Number(getColValue(row, allowCol)) || 0 : 0);
      const transportAllowance = transportCol ? Number(getColValue(row, transportCol)) || 0 : 0;
      const allowances = mealAllowance + transportAllowance;
      const deductions = Number(getColValue(row, dedCol)) || 0;
      const netSalary = Number(getColValue(row, netCol)) || (baseSalary + allowances - deductions);
      const statusRaw = String(getColValue(row, statusCol) || "DRAFT").toUpperCase();
      const status = statusRaw === "PAID" ? "PAID" : statusRaw === "APPROVED" ? "APPROVED" : "DRAFT";
      const paidAtRaw = getColValue(row, paidCol);
      const paidAt = parseDate(paidAtRaw);
      const note = getColValue(row, noteCol) || "";

      // Check for existing (unique constraint: userId + month + year)
      if (options.skipDuplicates) {
        const existing = await db.payroll.findUnique({ where: { userId_month_year: { userId, month, year } } });
        if (existing) {
          result.skipped++;
          result.details.push({ row: i + 1, status: "skipped", reason: "Sudah ada" });
          continue;
        }
      }

      // Upsert payroll
      await db.payroll.upsert({
        where: { userId_month_year: { userId, month, year } },
        update: {
          baseSalary,
          mealAllowance: allowances, // treat allowances as mealAllowance
          transportAllowance: 0,
          grossSalary: baseSalary + allowances,
          otherDeduction: deductions,
          totalDeduction: deductions,
          netSalary,
          status,
          paidAt,
          note,
          isManual: true,
        },
        create: {
          userId,
          month,
          year,
          baseSalary,
          mealAllowance: allowances,
          transportAllowance: 0,
          workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0,
          kpiScore: 0, kpiBonus: 0,
          attendanceDeduction: 0, bpjs: 0, tax: 0,
          otherDeduction: deductions,
          grossSalary: baseSalary + allowances,
          totalDeduction: deductions,
          netSalary,
          status,
          paidAt,
          note,
          isManual: true,
        },
      });

      result.success++;
      result.details.push({ row: i + 1, status: "success", name: userVal, month, year });
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
      result.details.push({ row: i + 1, status: "error", error: e.message });
    }
  }
}

// ===== Import CRM Client =====
async function importCrmClient(rows: any[], mapping: any, result: any, options: any) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const namaKlien = getColValue(row, mapping.namaKlien);
      if (!namaKlien) { result.skipped++; continue; }

      await db.client.create({
        data: {
          namaKlien,
          instansi: getColValue(row, mapping.instansi) || null,
          pic: getColValue(row, mapping.pic) || null,
          email: getColValue(row, mapping.email) || null,
          nomorWA: getColValue(row, mapping.nomorWA) || null,
          jenisTraining: getColValue(row, mapping.jenisTraining) || null,
          jumlahPeserta: Number(getColValue(row, mapping.jumlahPeserta)) || null,
          budget: Number(getColValue(row, mapping.budget)) || null,
          lokasi: getColValue(row, mapping.lokasi) || null,
          status: getColValue(row, mapping.status) || "LEAD",
        },
      });
      result.success++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
    }
  }
}

// ===== Import Invoice =====
async function importInvoice(rows: any[], mapping: any, result: any, options: any) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const invoiceNumber = getColValue(row, mapping.invoiceNumber);
      if (!invoiceNumber) { result.skipped++; continue; }

      const subtotal = Number(getColValue(row, mapping.subtotal)) || 0;
      const discount = Number(getColValue(row, mapping.discount)) || 0;
      const tax = Number(getColValue(row, mapping.tax)) || 0;
      const totalAmount = Number(getColValue(row, mapping.totalAmount)) || (subtotal - discount + tax);

      await db.invoice.create({
        data: {
          invoiceNumber,
          issueDate: getColValue(row, mapping.issueDate) || new Date().toISOString().slice(0, 10),
          clientName: getColValue(row, mapping.clientName) || "",
          clientAddress: getColValue(row, mapping.clientAddress) || "",
          city: getColValue(row, mapping.city) || null,
          description: getColValue(row, mapping.description) || null,
          items: getColValue(row, mapping.items) || "[]",
          subtotal,
          discount,
          tax,
          totalAmount,
          status: String(getColValue(row, mapping.status) || "PENDING").toUpperCase(),
          bankName: getColValue(row, mapping.bankName) || null,
          bankAccount: getColValue(row, mapping.bankAccount) || null,
          accountName: getColValue(row, mapping.accountName) || null,
        },
      });
      result.success++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
    }
  }
}

// ===== Import Finance Transaction =====
async function importFinanceTxn(rows: any[], mapping: any, result: any, options: any) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const type = String(getColValue(row, mapping.type) || "PEMASUKAN").toUpperCase();
      const amount = Number(getColValue(row, mapping.amount)) || 0;
      if (amount <= 0) { result.skipped++; continue; }

      await db.financeTransaction.create({
        data: {
          type: type === "PEMASUKAN" ? "PEMASUKAN" : "PENGELUARAN",
          amount,
          category: getColValue(row, mapping.category) || "Lainnya",
          account: String(getColValue(row, mapping.account) || "KAS").toUpperCase(),
          date: getColValue(row, mapping.date) || new Date().toISOString().slice(0, 10),
          description: getColValue(row, mapping.description) || "",
          vendor: getColValue(row, mapping.vendor) || null,
        },
      });
      result.success++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
    }
  }
}

// ===== Import User =====
async function importUser(rows: any[], mapping: any, result: any, options: any) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const email = getColValue(row, mapping.email);
      if (!email) { result.skipped++; continue; }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        if (options.skipDuplicates) { result.skipped++; continue; }
        await db.user.update({
          where: { email },
          data: {
            name: getColValue(row, mapping.name) || existing.name,
            role: getColValue(row, mapping.role) || existing.role,
            position: getColValue(row, mapping.position) || existing.position,
            phone: getColValue(row, mapping.phone) || existing.phone,
          },
        });
        result.success++;
        continue;
      }

      const hashedPassword = await bcrypt.hash("password123", 10);
      await db.user.create({
        data: {
          name: getColValue(row, mapping.name) || email.split("@")[0],
          email,
          password: hashedPassword,
          role: String(getColValue(row, mapping.role) || "ASSISTANT_TRAINER").toUpperCase(),
          position: getColValue(row, mapping.position) || "",
          phone: getColValue(row, mapping.phone) || "",
          isActive: true,
        },
      });
      result.success++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
    }
  }
}

// ===== Import Absensi =====
async function importAbsensi(rows: any[], mapping: any, userLookup: Map<string, { id: string; isNew: boolean }>, result: any, options: any) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const nameVal = getColValue(row, mapping.userId);
      const userId = userLookup.get(nameVal)?.id;
      if (!userId) { result.skipped++; continue; }

      const tanggal = getColValue(row, mapping.tanggal);
      if (!tanggal) { result.skipped++; continue; }

      await db.attendance.create({
        data: {
          userId,
          tanggal: new Date(tanggal),
          jamMasuk: getColValue(row, mapping.jamMasuk) || null,
          jamKeluar: getColValue(row, mapping.jamKeluar) || null,
          status: String(getColValue(row, mapping.status) || "HADIR").toUpperCase(),
          note: getColValue(row, mapping.note) || null,
        },
      });
      result.success++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Baris ${i + 1}: ${e.message}`);
    }
  }
}

// Helper: get column value from row (row can be array or object)
function getColValue(row: any, colName: string): any {
  if (!colName) return null;
  if (Array.isArray(row)) {
    return row[parseInt(colName)] || null;
  }
  return row[colName] ?? null;
}

// Helper: parse date from various formats (string, Excel serial number, ISO)
function parseDate(val: any): Date | null {
  if (!val || val === "") return null;
  // Excel serial number (e.g., 46188 = 2026-06-15)
  if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val))) {
    const serial = Number(val);
    if (serial > 25569 && serial < 60000) {
      // Excel epoch: 1900-01-01 = 1, but with the 1900 leap year bug, day 1 = 1900-01-01
      // JS epoch: 1970-01-01 = 25569 (Excel serial)
      const ms = (serial - 25569) * 86400 * 1000;
      return new Date(ms);
    }
  }
  // ISO string or date string
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
}
