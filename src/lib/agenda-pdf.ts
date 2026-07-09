// Agenda Harian PDF generator - server-side
import { jsPDF } from "jspdf";
import { drawKopSurat, drawFooter, COMPANY_INFO } from "./spt-pdf";

export interface AgendaPDFItem {
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  tipe: string;
  judul: string;
  lokasi: string;
  linkMeeting?: string | null;
  picNama: string;
  picTelepon: string;
  trainer: string;
  catatan: string;
  status: string;
}

export async function generateAgendaPDF(data: {
  userName: string;
  userRole: string;
  periodeLabel: string;
  agendas: AgendaPDFItem[];
}): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;

  let y = drawKopSurat(doc);

  // Title bar
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN AGENDA PAK AQIL", pageWidth / 2, y + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode: ${data.periodeLabel}`, pageWidth / 2, y + 9, { align: "center" });
  y += 18;

  // User info
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Nama:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.userName, margin + 15, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Periode:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.periodeLabel, margin + 15, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Total Agenda:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.agendas.length} agenda`, margin + 25, y);
  y += 8;

  const tipeColors: Record<string, [number, number, number]> = {
    BRIEFING: [59, 130, 246], // blue
    MEETING: [16, 185, 129], // green
    EVENT: [245, 158, 11], // amber
    KUNJUNGAN: [168, 85, 247], // purple
    LAINNYA: [100, 116, 139], // slate
  };
  const tipeLabels: Record<string, string> = {
    BRIEFING: "📋 Briefing",
    MEETING: "🤝 Meeting",
    EVENT: "🎤 Event",
    KUNJUNGAN: "📍 Kunjungan",
    LAINNYA: "📌 Lainnya",
  };
  const statusLabels: Record<string, string> = {
    UPCOMING: "Upcoming",
    IN_PROGRESS: "Berlangsung",
    DONE: "Selesai",
    CANCELLED: "Batal",
  };

  // Group by date
  const byDate: Record<string, AgendaPDFItem[]> = {};
  for (const a of data.agendas) {
    const key = a.tanggal.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  }

  for (const [dateLabel, items] of Object.entries(byDate)) {
    // Check page break
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    // Date header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(dateLabel, margin + 3, y + 5);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${items.length} agenda`, pageWidth - margin - 3, y + 5, { align: "right" });
    y += 9;

    for (const a of items) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      const color = tipeColors[a.tipe] || tipeColors.LAINNYA;

      // Time column (left)
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(a.jamMulai, margin + 2, y);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(a.jamSelesai, margin + 2, y + 4);

      // Type badge
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(margin + 15, y - 3, 25, 5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(tipeLabels[a.tipe]?.replace(/[^\w\s]/g, "") || a.tipe, margin + 27.5, y + 0.5, { align: "center" });

      // Title + details
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(a.judul, margin + 42, y);

      // Status badge (right)
      const statusColor: [number, number, number] = a.status === "DONE" ? [34, 197, 94] : a.status === "CANCELLED" ? [239, 68, 68] : a.status === "IN_PROGRESS" ? [59, 130, 246] : [148, 163, 184];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(pageWidth - margin - 22, y - 3, 22, 5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(statusLabels[a.status] || a.status, pageWidth - margin - 11, y + 0.5, { align: "center" });

      y += 4;
      // Details line
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let detailStr = `📍 ${a.lokasi}`;
      if (a.picNama && a.picNama !== "-") detailStr += `  ·  👤 ${a.picNama}`;
      if (a.picTelepon && a.picTelepon !== "-") detailStr += `  ·  📞 ${a.picTelepon}`;
      if (a.trainer && a.trainer !== "-") detailStr += `  ·  🎓 ${a.trainer}`;
      doc.text(detailStr, margin + 42, y);

      y += 4;
      if (a.catatan && a.catatan !== "-") {
        const noteLines = doc.splitTextToSize(`📝 ${a.catatan}`, contentWidth - 42);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "italic");
        doc.text(noteLines, margin + 42, y);
        y += noteLines.length * 3;
      }

      // Separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin + 15, y + 1, pageWidth - margin, y + 1);
      y += 5;
    }
    y += 3;
  }

  // Summary at the end
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }
  y += 5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const doneCount = data.agendas.filter(a => a.status === "DONE").length;
  const upcomingCount = data.agendas.filter(a => a.status === "UPCOMING").length;
  const cancelledCount = data.agendas.filter(a => a.status === "CANCELLED").length;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Agenda: ${data.agendas.length}`, margin, y);
  doc.text(`Selesai: ${doneCount}`, margin + 50, y);
  doc.text(`Upcoming: ${upcomingCount}`, margin + 90, y);
  doc.text(`Batal: ${cancelledCount}`, margin + 130, y);

  drawFooter(doc, "Laporan Agenda Pak Aqil");

  return doc.output("arraybuffer");
}
