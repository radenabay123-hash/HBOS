import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { getFinanceDashboard } from "@/lib/finance-engine";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// AI Insight - daily financial insight
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    const month = Number(searchParams.get("month") || (now.getMonth() + 1));

    const data = await getFinanceDashboard(year, month);

    // Build context for AI
    const context = `
DATA KEUANGAN PT. HAFARA AQIBA NUSANTARA - ${month}/${year}

RINGKASAN:
- Total Saldo: Rp ${data.totalSaldo.toLocaleString("id-ID")}
- Kas: Rp ${data.kasSaldo.toLocaleString("id-ID")}
- Bank: Rp ${data.bankSaldo.toLocaleString("id-ID")}
- Dompet Digital: Rp ${data.ewalletSaldo.toLocaleString("id-ID")}
- Piutang (tagihan belum dibayar klien): Rp ${data.totalPiutang.toLocaleString("id-ID")}
- Hutang (tagihan belum dibayar ke vendor): Rp ${data.totalHutang.toLocaleString("id-ID")}
- Pendapatan bulan ini: Rp ${data.monthPemasukan.toLocaleString("id-ID")}
- Pengeluaran bulan ini: Rp ${data.monthPengeluaran.toLocaleString("id-ID")}
- Laba bulan ini: Rp ${data.monthLaba.toLocaleString("id-ID")}
- Pajak yang harus dibayar: Rp ${data.taxDue.toLocaleString("id-ID")}

GRAFIK BULANAN (12 bulan):
${data.monthlyData.map((m: any) => `${m.month}: Pendapatan ${m.pemasukan}, Pengeluaran ${m.pengeluaran}, Laba ${m.laba}`).join("\n")}

PENGELUARAN PER KATEGORI bulan ini:
${Object.entries(data.expenseByCat).map(([k, v]) => `- ${k}: Rp ${(v as number).toLocaleString("id-ID")}`).join("\n") || "- Tidak ada pengeluaran"}

PENDAPATAN PER KATEGORI bulan ini:
${Object.entries(data.incomeByCat).map(([k, v]) => `- ${k}: Rp ${(v as number).toLocaleString("id-ID")}`).join("\n") || "- Tidak ada pendapatan"}

FORECAST:
- Estimasi kas akhir bulan: Rp ${data.forecast.cashFlow.toLocaleString("id-ID")}
- Estimasi laba: Rp ${data.forecast.profit.toLocaleString("id-ID")}
- Estimasi pajak: Rp ${Math.round(data.forecast.tax).toLocaleString("id-ID")}

REMINDER:
- Pajak jatuh tempo: ${data.reminders.upcomingTax.length} item
- Piutang jatuh tempo: ${data.reminders.upcomingPiutang.length} item
- Hutang jatuh tempo: ${data.reminders.upcomingHutang.length} item
`;

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `Anda adalah AI Finance Assistant untuk PT. Hafara Aqiba Nusantara (perusahaan training & consulting).
Beri INSIGHT HARI INI dalam bahasa Indonesia sederhana (bukan istilah akuntansi rumit).
Format: 3-5 poin insight singkat dengan emoji. Fokus pada:
1. Kondisi keuangan saat ini (sehat/perlu perhatian)
2. Tren pendapatan/pengeluaran
3. Pengingat penting (pajak/piutang/hutang jatuh tempo)
4. Rekomendasi efisiensi biaya (jika ada)
5. Prediksi singkat
Maksimal 250 kata. Gunakan angka Rupiah yang konkret.`
          },
          { role: "user", content: context }
        ],
        thinking: { type: "disabled" },
      });
      const insight = completion.choices[0]?.message?.content || "Tidak ada insight tersedia saat ini.";
      return ok({ insight, context: context.slice(0, 200) });
    } catch (e: any) {
      return ok({
        insight: `📊 **Insight Keuangan ${month}/${year}**\n\n• Total saldo perusahaan: Rp ${data.totalSaldo.toLocaleString("id-ID")}\n• Laba bulan ini: Rp ${data.monthLaba.toLocaleString("id-ID")}\n• Pajak terutang: Rp ${data.taxDue.toLocaleString("id-ID")}\n• Estimasi kas akhir bulan: Rp ${data.forecast.cashFlow.toLocaleString("id-ID")}\n\n⚠️ Ada ${data.reminders.upcomingTax.length} pajak jatuh tempo. Pastikan dibayar tepat waktu.`,
        fallback: true,
      });
    }
  });
}
