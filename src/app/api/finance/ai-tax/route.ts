import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// AI Tax Consultant - chat-based
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const body = await req.json();
    const { message } = body;
    if (!message) return err("Pesan wajib diisi", 400);

    // Get tax context
    const configs = await db.taxConfig.findMany({ where: { isActive: true } });
    const payments = await db.taxPayment.findMany({ take: 20, orderBy: { dueDate: "desc" } });
    const terutang = payments.filter((p) => p.status === "TERUTANG").reduce((s, p) => s + (p.taxDue - p.taxPaid), 0);

    const taxContext = `
KONTEKS PAJAK PT. HAFARA AQIBA NUSANTARA:

KONFIGURASI PAJAK (Regulasi Indonesia):
${configs.map((c) => `- ${c.name} (${c.taxType}): tarif ${c.rate}%${c.description ? " - " + c.description : ""}`).join("\n")}

STATUS PAJAK SAAT INI:
- Total pajak terutang: Rp ${terutang.toLocaleString("id-ID")}
- Jumlah transaksi pajak: ${payments.length}

DETAIL PAJAK:
${payments.map((p) => `- ${p.taxType} ${p.masaPajak}: terutang Rp ${p.taxDue.toLocaleString("id-ID")} (${p.status})`).join("\n") || "- Belum ada data pajak"}
`;

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `Anda adalah AI Tax Consultant (Konsultan Pajak AI) untuk PT. Hafara Aqiba Nusantara.
Aturan:
1. Jawab dalam bahasa Indonesia SEDERHANA, hindari istilah akuntansi rumit.
2. Jelaskan pajak dengan bahasa awam (contoh: "PPh 21 = pajak dari gaji karyawan").
3. Berikan dasar logika dan regulasi yang relevan (UU HPP, PP, PMK).
4. Saran efisiensi pajak harus LEGAL, ETIS, dan sesuai peraturan Indonesia.
5. JANGAN PERNAH menyarankan penggelapan pajak, manipulasi, atau pelanggaran hukum.
6. Selalu ingatkan pengguna untuk konsultasi dengan konsultan pajak resmi untuk kasus kompleks.
7. Jika ditanya dokumen, berikan daftar dokumen yang perlu disiapkan.
8. Gunakan emoji untuk memperjelas (📊, 💰, ⚠️, ✅).
9. Maksimal 300 kata per jawaban.`
          },
          { role: "user", content: `${taxContext}\n\nPERTANYAAN PENGGUNA: ${message}` }
        ],
        thinking: { type: "disabled" },
      });
      const response = completion.choices[0]?.message?.content || "Maaf, saya tidak dapat menjawab saat ini.";
      return ok({ response });
    } catch (e: any) {
      return ok({
        response: `📊 **Konsultan Pajak AI**\n\nBerdasarkan data Anda:\n- Pajak terutang: Rp ${terutang.toLocaleString("id-ID")}\n- Jenis pajak: PPh 21, PPh 23, PPh Badan, PPN\n\n⚠️ Untuk pertanyaan spesifik, silakan konsultasi dengan konsultan pajak resmi.\n\nPertanyaan Anda: "${message}"`,
        fallback: true,
      });
    }
  });
}
