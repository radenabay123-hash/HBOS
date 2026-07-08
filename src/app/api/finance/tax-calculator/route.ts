import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// POST: Calculate tax based on type and input
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { taxType, amount, ptkpStatus, isMonthly } = body;
    if (!taxType || amount == null) return err("taxType dan amount wajib diisi", 400);

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 0) return err("Amount tidak valid", 400);

    // Get tax config from database
    const config = await db.taxConfig.findFirst({ where: { taxType, isActive: true } });
    if (!config) return err("Konfigurasi pajak tidak ditemukan", 404);

    let result: any = { taxType, inputAmount: amountNum, ptkpStatus: ptkpStatus || null, isMonthly: isMonthly !== false };

    if (taxType === "PPH21") {
      // PPh 21 - Progressive tax for employees
      const brackets = config.brackets ? JSON.parse(config.brackets) : [];
      const ptkpMap = config.ptkp ? JSON.parse(config.ptkp) : {};
      const ptkpStatusKey = ptkpStatus || "TK0";
      const ptkpAnnual = ptkpMap[ptkpStatusKey] || 54000000;

      // Convert monthly to annual for calculation
      const annualBruto = isMonthly !== false ? amountNum * 12 : amountNum;
      const pkp = Math.max(0, annualBruto - ptkpAnnual);

      // Calculate progressive tax
      let taxAnnual = 0;
      let remainingPKP = pkp;
      const bracketDetails: any[] = [];

      for (const bracket of brackets) {
        if (remainingPKP <= 0) break;
        const bracketRange = bracket.max ? bracket.max - bracket.min : Infinity;
        const taxableInBracket = Math.min(remainingPKP, bracketRange);
        const taxInBracket = taxableInBracket * (bracket.rate / 100);
        taxAnnual += taxInBracket;
        bracketDetails.push({
          range: `${formatRupiah(bracket.min)} - ${bracket.max ? formatRupiah(bracket.max) : "tak terbatas"}`,
          rate: bracket.rate + "%",
          pkp: taxableInBracket,
          tax: taxInBracket,
        });
        remainingPKP -= taxableInBracket;
      }

      const taxMonthly = taxAnnual / 12;
      const takeHomePayMonthly = amountNum - taxMonthly;

      result = {
        ...result,
        ptkpStatus: ptkpStatusKey,
        ptkpLabel: getPTKPLabel(ptkpStatusKey),
        ptkpAnnual,
        brutoMonthly: isMonthly !== false ? amountNum : amountNum / 12,
        brutoAnnual: annualBruto,
        pkpAnnual: pkp,
        taxAnnual,
        taxMonthly,
        takeHomePayMonthly,
        takeHomePayAnnual: (isMonthly !== false ? amountNum : amountNum / 12) * 12 - taxAnnual,
        bracketDetails,
        effectiveRate: pkp > 0 ? ((taxAnnual / annualBruto) * 100).toFixed(2) + "%" : "0%",
      };
    } else if (taxType === "PPH23") {
      // PPh 23 - 2% of gross (jasa profesional)
      const rate = config.rate;
      const tax = amountNum * (rate / 100);
      const net = amountNum - tax;
      result = {
        ...result,
        rate,
        bruto: amountNum,
        tax,
        netReceived: net,
        formula: `${formatRupiah(amountNum)} × ${rate}% = ${formatRupiah(tax)}`,
        description: "PPh 23 dipotong oleh pemberi kerja atas jasa profesional/consulting",
      };
    } else if (taxType === "PPH_BADAN") {
      // PPh Badan - 22% of profit
      const rate = config.rate;
      const tax = Math.max(0, amountNum) * (rate / 100);
      const netProfit = amountNum - tax;
      result = {
        ...result,
        rate,
        labaKomersial: amountNum,
        pajakTerutang: tax,
        labaBersih: netProfit,
        formula: `${formatRupiah(amountNum)} × ${rate}% = ${formatRupiah(tax)}`,
        description: "PPh Badan dihitung dari laba perusahaan sebelum pajak",
        note: "Pajak dihitung dari Penghasilan Kena Pajak (Laba Fiskal). Jika belum ada rekonsiliasi fiskal, gunakan laba komersial sebagai estimasi.",
      };
    } else if (taxType === "PPN") {
      // PPN - 11% of sales
      const rate = config.rate;
      const ppn = amountNum * (rate / 100);
      const totalWithPPN = amountNum + ppn;
      result = {
        ...result,
        rate,
        dpp: amountNum, // Dasar Pengenaan Pajak
        ppn,
        totalWithPPN,
        formula: `${formatRupiah(amountNum)} × ${rate}% = ${formatRupiah(ppn)}`,
        description: "PPN 11% ditambahkan ke harga jual",
      };
    }

    // Get config info
    result.configName = config.name;
    result.configDescription = config.description;

    return ok({ result });
  });
}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function getPTKPLabel(status: string): string {
  const labels: Record<string, string> = {
    TK0: "Tidak Kawin, 0 Tanggungan",
    TK1: "Tidak Kawin, 1 Tanggungan",
    TK2: "Tidak Kawin, 2 Tanggungan",
    TK3: "Tidak Kawin, 3 Tanggungan",
    K0: "Kawin, 0 Tanggungan",
    K1: "Kawin, 1 Tanggungan",
    K2: "Kawin, 2 Tanggungan",
    K3: "Kawin, 3 Tanggungan",
  };
  return labels[status] || status;
}

// GET available PTKP statuses
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const configs = await db.taxConfig.findMany({ where: { isActive: true } });
    const pph21Config = configs.find((c) => c.taxType === "PPH21");

    let ptkpOptions: { value: string; label: string; amount: number }[] = [];
    if (pph21Config?.ptkp) {
      const ptkpMap = JSON.parse(pph21Config.ptkp);
      const labels: Record<string, string> = {
        TK0: "Tidak Kawin, 0 Tanggungan",
        TK1: "Tidak Kawin, 1 Tanggungan",
        TK2: "Tidak Kawin, 2 Tanggungan",
        TK3: "Tidak Kawin, 3 Tanggungan",
        K0: "Kawin, 0 Tanggungan",
        K1: "Kawin, 1 Tanggungan",
        K2: "Kawin, 2 Tanggungan",
        K3: "Kawin, 3 Tanggungan",
      };
      ptkpOptions = Object.entries(ptkpMap).map(([k, v]: any) => ({
        value: k,
        label: `${k} - ${labels[k] || k} (Rp ${v.toLocaleString("id-ID")}/tahun)`,
        amount: v,
      }));
    }

    return ok({
      taxTypes: configs.map((c) => ({ type: c.taxType, name: c.name, rate: c.rate, description: c.description })),
      ptkpOptions,
    });
  });
}
