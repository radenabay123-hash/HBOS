import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { getFinanceDashboard } from "@/lib/finance-engine";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// AI Finance Assistant - chat-based with finance context
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const body = await req.json();
    const { message } = body;
    if (!message) return err("Pesan wajib diisi", 400);

    const now = new Date();
    const data = await getFinanceDashboard(now.getFullYear(), now.getMonth() + 1);

    const context = `
DATA KEUANGAN PT. HAFARA AQIBA NUSANTARA:

SALDO:
- Total: Rp ${data.totalSaldo.toLocaleString("id-ID")}
- Kas: Rp ${data.kasSaldo.toLocaleString("id-ID")}
- Bank: Rp ${data.bankSaldo.toLocaleString("id-ID")}
- Dompet Digital: Rp ${data.ewalletSaldo.toLocaleString("id-ID")}

BULAN INI:
- Pendapatan: Rp ${data.monthPemasukan.toLocaleString("id-ID")}
- Pengeluaran: Rp ${data.monthPengeluaran.toLocaleString("id-ID")}
- Laba: Rp ${data.monthLaba.toLocaleString("id-ID")}

TAGIHAN:
- Piutang (klien belum bayar): Rp ${data.totalPiutang.toLocaleString("id-ID")}
- Hutang (belum bayar vendor): Rp ${data.totalHutang.toLocaleString("id-ID")}
- Pajak terutang: Rp ${data.taxDue.toLocaleString("id-ID")}

PENGELUARAN PER KATEGORI:
${Object.entries(data.expenseByCat).map(([k, v]) => `- ${k}: Rp ${(v as number).toLocaleString("id-ID")}`).join("\n") || "- Tidak ada"}

PENDAPATAN PER KATEGORI:
${Object.entries(data.incomeByCat).map(([k, v]) => `- ${k}: Rp ${(v as number).toLocaleString("id-ID")}`).join("\n") || "- Tidak ada"}

GRAFIK 12 BULAN:
${data.monthlyData.map((m: any) => `${m.month}: Pemasukan ${m.pemasukan}, Pengeluaran ${m.pengeluaran}, Laba ${m.laba}`).join("\n")}

FORECAST:
- Estimasi kas akhir bulan: Rp ${data.forecast.cashFlow.toLocaleString("id-ID")}
- Estimasi laba: Rp ${data.forecast.profit.toLocaleString("id-ID")}
`;

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `Anda adalah AI Finance Assistant untuk PT. Hafara Aqiba Nusantara (perusahaan training & consulting).
Tugas: Bantu pengguna memahami kondisi keuangan dengan BAHASA SEDERHANA (hindari istilah akuntansi rumit seperti debit/kredit/jurnal).
Anda bisa:
- Menjelaskan "Kenapa laba turun/naik?"
- Menganalisis "Biaya apa yang paling besar?"
- Menjawab "Klien mana yang paling menguntungkan?"
- Memprediksi "Berapa estimasi kas sampai akhir bulan?"
- Memberikan rekomendasi efisiensi biaya
- Mendeteksi transaksi tidak biasa

Format jawaban:
- Gunakan bahasa Indonesia awam
- Gunakan angka Rupiah konkret
- Gunakan emoji (💰, 📊, ⚠️, ✅)
- Maksimal 300 kata
- Jika data tidak cukup, katakan dengan jujur`
          },
          { role: "user", content: `${context}\n\nPERTANYAAN: ${message}` }
        ],
        thinking: { type: "disabled" },
      });
      const response = completion.choices[0]?.message?.content || "Maaf, saya tidak dapat menjawab saat ini.";
      return ok({ response });
    } catch (e: any) {
      return ok({
        response: `📊 **AI Finance Assistant**\n\nBerdasarkan data keuangan Anda:\n- Saldo: Rp ${data.totalSaldo.toLocaleString("id-ID")}\n- Laba bulan ini: Rp ${data.monthLaba.toLocaleString("id-ID")}\n- Piutang: Rp ${data.totalPiutang.toLocaleString("id-ID")}\n- Hutang: Rp ${data.totalHutang.toLocaleString("id-ID")}\n\nPertanyaan: "${message}"\n\n⚠️ Sistem AI sedang sibuk, silakan coba lagi nanti.`,
        fallback: true,
      });
    }
  });
}
