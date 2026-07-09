import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { err, handleApi } from "@/lib/api";
import * as XLSX from "xlsx";
import { generateAgendaPDF } from "@/lib/agenda-pdf";

export const runtime = "nodejs";

// GET export agenda list as PDF or Excel
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "pdf";
    const bulan = Number(searchParams.get("bulan") || new Date().getMonth() + 1);
    const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());

    const start = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0);
    const end = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    const agendas = await db.dailyAgenda.findMany({
      where: {
        userId: user.id,
        tanggal: { gte: start, lte: end },
      },
      orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
      include: {
        client: { select: { namaKlien: true, instansi: true, pic: true, nomorWA: true } },
        event: { select: { namaEvent: true, lokasi: true } },
        trainer: { select: { name: true } },
      },
    });

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const periodeLabel = `${monthNames[bulan - 1]} ${tahun}`;

    if (format === "excel") {
      const rows = agendas.map((a) => {
        const d = new Date(a.tanggal);
        const tipeLabel: Record<string, string> = { BRIEFING: "Briefing", MEETING: "Meeting", EVENT: "Event", KUNJUNGAN: "Kunjungan", LAINNYA: "Lainnya" };
        const statusLabel: Record<string, string> = { UPCOMING: "Upcoming", IN_PROGRESS: "Berlangsung", DONE: "Selesai", CANCELLED: "Batal" };
        return {
          Tanggal: d.toLocaleDateString("id-ID"),
          Jam: `${a.jamMulai} - ${a.jamSelesai}`,
          Tipe: tipeLabel[a.tipe] || a.tipe,
          Judul: a.judul,
          Lokasi: a.lokasi || (a.isOnline ? "Online" : "-"),
          Klien: a.client?.namaKlien || a.picNama || "-",
          PIC: a.picNama || a.client?.pic || "-",
          Telepon: a.picTelepon || a.client?.nomorWA || "-",
          Trainer: a.trainer?.name || "-",
          Catatan: a.catatan || "-",
          Status: statusLabel[a.status] || a.status,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Agenda");
      // auto width
      const colWidths: { wch: number }[] = [];
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        for (const k of keys) {
          const maxLen = Math.max(k.length, ...rows.map((row) => String(row[k as keyof typeof row] ?? "").length));
          colWidths.push({ wch: Math.min(maxLen + 2, 50) });
        }
        ws["!cols"] = colWidths;
      }
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Agenda-${periodeLabel.replace(/\s/g, "-")}.xlsx"`,
        },
      });
    }

    // PDF format
    const pdfBuffer = await generateAgendaPDF({
      userName: user.name,
      userRole: user.role,
      periodeLabel,
      agendas: agendas.map((a) => ({
        tanggal: new Date(a.tanggal),
        jamMulai: a.jamMulai,
        jamSelesai: a.jamSelesai,
        tipe: a.tipe,
        judul: a.judul,
        lokasi: a.lokasi || (a.isOnline ? "Online" : "-"),
        linkMeeting: a.linkMeeting,
        picNama: a.picNama || a.client?.pic || "-",
        picTelepon: a.picTelepon || a.client?.nomorWA || "-",
        trainer: a.trainer?.name || "-",
        catatan: a.catatan || "-",
        status: a.status,
      })),
    });

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Agenda-${periodeLabel.replace(/\s/g, "-")}.pdf"`,
      },
    });
  });
}
