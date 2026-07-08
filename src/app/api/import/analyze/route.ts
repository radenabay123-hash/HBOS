import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// POST: Analyze uploaded CSV/Excel data with AI and suggest module + field mapping
// Body: { fileName, headers: string[], rows: any[][] (preview, max 10 rows) }
// Returns: { suggestedModule, moduleName, fieldMapping, userMatching, preview, stats }
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { fileName, headers, rows } = body;
    if (!headers || !Array.isArray(headers)) return err("Headers wajib diisi", 400);

    // Get all HBOS users for matching
    const hbosUsers = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, position: true } });

    // ===== STEP 1: AI Analysis — identify which module this data belongs to =====
    const sampleData = rows.slice(0, 5).map((r: any) => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => { obj[h] = r[i]; });
      return obj;
    });

    let aiSuggestion: any = null;
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `Anda adalah AI Data Analyst yang menganalisis file data untuk diimport ke sistem HBOS (Hafara Business Operating System).

Sistem HBOS memiliki module-module berikut dengan field-field ini:

1. **PAYROLL** (Slip Gaji Karyawan)
   Fields: userId, month (1-12), year (4 digit), baseSalary, mealAllowance, transportAllowance, grossSalary, tax, bpjs, otherDeduction, totalDeduction, netSalary, status (DRAFT/APPROVED/PAID), paidAt, note, isManual, jabatan, bankName, bankAccount, accountName

2. **CRM_CLIENT** (Data Klien)
   Fields: namaKlien, instansi, pic, nomorWA, email, jenisTraining, jumlahPeserta, budget, lokasi, tanggalEvent, status (LEAD/FOLLOW_UP/PROPOSAL/NEGOTIATION/DEAL/LOST), catatanFollowUp

3. **INVOICE** (Faktur)
   Fields: invoiceNumber, issueDate, clientName, clientAddress, items (JSON), subtotal, discount, tax, totalAmount, status (PENDING/PAID/CANCELLED), bankName, bankAccount, accountName

4. **FINANCE_TRANSACTION** (Arus Kas)
   Fields: type (PEMASUKAN/PENGELUARAN), amount, category, account (KAS/BANK/EWALLET), date, description, vendor

5. **EVENT** (Jadwal Training)
   Fields: namaEvent, clientId, tanggal, lokasi, trainer, assistantTrainerId, statusPersiapan, checklist

6. **USER** (Data Karyawan)
   Fields: name, email, role (OWNER/PROJECT_MANAGER/ASSISTANT_TRAINER/CONTENT_CREATIVE/DIGITAL_MARKETING_IT/FINANCE), position, phone

7. **ABSENSI** (Kehadiran)
   Fields: userId, tanggal, jamMasuk, jamKeluar, status (HADIR/TERLAMAT/IZIN/SAKIT/ALFA), note

8. **ARTICLE** (Artikel SEO)
   Fields: judulArtikel, website, keyword, url, status, accStatus

Tugas Anda:
1. Identifikasi module mana yang PALING COCOK untuk data ini
2. Buat mapping field: kolom CSV → field HBOS (jika tidak ada cocok, beri null)
3. Identifikasi kolom yang berisi data user/employee (untuk matching ke User HBOS)

Jawab HANYA dalam format JSON:
{
  "suggestedModule": "PAYROLL|CRM_CLIENT|INVOICE|FINANCE_TRANSACTION|EVENT|USER|ABSENSI|ARTICLE",
  "moduleName": "nama module dalam bahasa Indonesia",
  "fieldMapping": {
    "nama_kolom_csv": "field_hbos_atau_null"
  },
  "userMatchingColumn": "nama kolom yang berisi nama/username employee atau null",
  "notes": "catatan singkat"
}`
          },
          {
            role: "user",
            content: `Nama file: ${fileName}

HEADER KOLOM:
${JSON.stringify(headers)}

SAMPLE DATA (5 baris pertama):
${JSON.stringify(sampleData, null, 2)}

Analisis dan berikan saran mapping dalam format JSON.`
          }
        ],
        thinking: { type: "disabled" },
      });
      const response = completion.choices[0]?.message?.content || "";
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiSuggestion = JSON.parse(jsonMatch[0]);
      }
    } catch (e: any) {
      // Fallback: rule-based analysis if AI fails
      aiSuggestion = fallbackAnalysis(fileName, headers, sampleData);
    }

    // ===== STEP 2: If no AI suggestion, use fallback =====
    if (!aiSuggestion) {
      aiSuggestion = fallbackAnalysis(fileName, headers, sampleData);
    }

    // ===== STEP 3: User matching (if userMatchingColumn identified) =====
    let userMatching: any[] = [];
    if (aiSuggestion.userMatchingColumn) {
      const colIdx = headers.indexOf(aiSuggestion.userMatchingColumn);
      if (colIdx >= 0) {
        // Get unique employee names/usernames from data
        const uniqueNames = [...new Set(rows.map((r: any) => r[colIdx]).filter(Boolean))];
        for (const name of uniqueNames) {
          // Try to match with existing HBOS users by name (case-insensitive, trimmed)
          const cleanedName = String(name).trim().toLowerCase();
          const match = hbosUsers.find((u) => {
            const uName = u.name.toLowerCase().trim();
            return uName === cleanedName ||
              uName.includes(cleanedName) ||
              cleanedName.includes(uName) ||
              u.email.split("@")[0].toLowerCase() === cleanedName;
          });
          userMatching.push({
            csvValue: name,
            matchedUser: match ? { id: match.id, name: match.name, email: match.email, role: match.role } : null,
            action: match ? "matched" : "create_new",
          });
        }
      }
    }

    // ===== STEP 4: Build preview with mapping applied =====
    const mappedPreview = rows.slice(0, 10).map((r: any) => {
      const mapped: any = {};
      for (let i = 0; i < headers.length; i++) {
        const csvCol = headers[i];
        const hbosField = aiSuggestion.fieldMapping?.[csvCol];
        if (hbosField) {
          mapped[hbosField] = r[i];
        }
      }
      return mapped;
    });

    // ===== STEP 5: Stats =====
    const stats = {
      totalRows: rows.length,
      totalColumns: headers.length,
      matchedFields: Object.values(aiSuggestion.fieldMapping || {}).filter((v: any) => v !== null).length,
      unmatchedFields: Object.values(aiSuggestion.fieldMapping || {}).filter((v: any) => v === null).length,
      matchedUsers: userMatching.filter((u) => u.matchedUser).length,
      newUsers: userMatching.filter((u) => !u.matchedUser).length,
    };

    return ok({
      suggestedModule: aiSuggestion.suggestedModule,
      moduleName: aiSuggestion.moduleName,
      fieldMapping: aiSuggestion.fieldMapping,
      userMatchingColumn: aiSuggestion.userMatchingColumn,
      notes: aiSuggestion.notes,
      userMatching,
      preview: mappedPreview,
      stats,
      availableUsers: hbosUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    });
  });
}

// Fallback rule-based analysis (if AI unavailable)
function fallbackAnalysis(fileName: string, headers: string[], sampleData: any[]): any {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const fileNameLower = fileName.toLowerCase();

  // Payroll detection
  if (lowerHeaders.some((h) => h.includes("salary") || h.includes("gaji")) ||
      fileNameLower.includes("payroll") || fileNameLower.includes("gaji")) {
    return {
      suggestedModule: "PAYROLL",
      moduleName: "Payroll & Gaji",
      fieldMapping: {
        id: null,
        username: null,
        employeeName: "userId",
        month: "month",
        year: "year",
        basicSalary: "baseSalary",
        allowances: "mealAllowance",
        deductions: "otherDeduction",
        netSalary: "netSalary",
        status: "status",
        paidAt: "paidAt",
        notes: "note",
      },
      userMatchingColumn: headers.find((h) => h.toLowerCase().includes("name") || h.toLowerCase().includes("employee")) || null,
      notes: "Deteksi otomatis: file payroll. Matching user berdasarkan nama karyawan.",
    };
  }

  // CRM Client detection
  if (lowerHeaders.some((h) => h.includes("klien") || h.includes("client")) || fileNameLower.includes("crm")) {
    return {
      suggestedModule: "CRM_CLIENT",
      moduleName: "CRM Client",
      fieldMapping: {},
      userMatchingColumn: null,
      notes: "Deteksi otomatis: file CRM Client.",
    };
  }

  // Default
  return {
    suggestedModule: "UNKNOWN",
    moduleName: "Tidak Terdeteksi",
    fieldMapping: {},
    userMatchingColumn: null,
    notes: "Tidak dapat mendeteksi module secara otomatis. Silakan pilih manual.",
  };
}
