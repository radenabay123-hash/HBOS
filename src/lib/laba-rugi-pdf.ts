// Professional Laba Rugi PDF generator with exact format
// Format: Rupiah, pemisah ribuan titik, desimal koma, negatif dalam kurung
import { jsPDF } from "jspdf";
import { drawKopSurat, drawFooter, COMPANY_INFO } from "./spt-pdf";

// Format number to Indonesian Rupiah format: 552.300.000,00 or (177.696.000,00)
export function formatRupiahID(n: number): string {
  const isNegative = n < 0;
  const abs = Math.abs(n);
  // Format with thousands separator (.) and 2 decimal places (,)
  const formatted = abs.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `(${formatted})` : formatted;
}

export function generateLabaRugiSesuaiFormat(data: {
  periodeLabel: string;
  pendapatanItems: { akun: string; jumlah: number }[];
  totalPendapatan: number;
  biayaItems: { akun: string; jumlah: number }[];
  totalBiaya: number;
  labaSebelumPajak: number;
  pajakPenghasilan: number;
  pphBadanRate: number;
  pajakNote: string;
  labaBersih: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  const labelX = margin + 5;
  const valueX = pageWidth - margin - 5;
  const lineX1 = margin;
  const lineX2 = pageWidth - margin;

  let y = drawKopSurat(doc);

  // Title bar
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN LABA RUGI (INCOME STATEMENT)", pageWidth / 2, y + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode: ${data.periodeLabel}`, pageWidth / 2, y + 9, { align: "center" });
  y += 20;

  // Helper function to draw a row
  function drawRow(doc: jsPDF, y: number, label: string, value: number, opts: { bold?: boolean; italic?: boolean; header?: boolean; total?: boolean; indent?: boolean; color?: [number, number, number] } = {}) {
    const indent = opts.indent ? 8 : 0;
    doc.setFontSize(opts.header ? 9 : opts.total ? 9 : 8);
    doc.setFont("helvetica", opts.bold || opts.total ? "bold" : opts.italic ? "italic" : "normal");

    if (opts.header) {
      doc.setTextColor(37, 99, 235);
    } else if (opts.total) {
      doc.setTextColor(30, 64, 110);
    } else {
      doc.setTextColor(51, 65, 85);
    }

    doc.text(label, labelX + indent, y);

    const valText = formatRupiahID(value);
    if (value < 0) {
      doc.setTextColor(220, 38, 38); // red for negative
    } else if (opts.total) {
      doc.setTextColor(30, 64, 110);
    } else {
      doc.setTextColor(51, 65, 85);
    }
    doc.setFont("helvetica", opts.bold || opts.total ? "bold" : "normal");
    doc.text(valText, valueX, y, { align: "right" });

    return y + 6;
  }

  // Helper for separator line
  function drawLine(doc: jsPDF, y: number, double?: boolean) {
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.line(lineX1, y, lineX2, y);
    if (double) {
      doc.setLineWidth(0.2);
      doc.line(lineX1, y + 1.2, lineX2, y + 1.2);
    }
  }

  // ===== PENDAPATAN USAHA =====
  y = drawRow(doc, y, "PENDAPATAN USAHA", 0, { header: true });
  y += 1;
  for (const item of data.pendapatanItems) {
    y = drawRow(doc, y, item.akun, item.jumlah, { indent: true });
  }
  y += 1;
  drawLine(doc, y);
  y += 4;
  y = drawRow(doc, y, "TOTAL PENDAPATAN USAHA", data.totalPendapatan, { total: true });
  y += 2;
  drawLine(doc, y, true);
  y += 6;

  // ===== BIAYA OPERASIONAL =====
  y = drawRow(doc, y, "BIAYA OPERASIONAL", 0, { header: true });
  y += 1;
  for (const item of data.biayaItems) {
    y = drawRow(doc, y, item.akun, -item.jumlah, { indent: true }); // negative (in parentheses)
  }
  y += 1;
  drawLine(doc, y);
  y += 4;
  y = drawRow(doc, y, "TOTAL BIAYA OPERASIONAL", -data.totalBiaya, { total: true });
  y += 2;
  drawLine(doc, y, true);
  y += 8;

  // ===== LABA SEBELUM PAJAK =====
  drawLine(doc, y);
  y += 5;
  y = drawRow(doc, y, "LABA SEBELUM PAJAK", data.labaSebelumPajak, { bold: true });
  y += 2;
  drawLine(doc, y);
  y += 6;

  // ===== PAJAK =====
  y = drawRow(doc, y, `Pajak Penghasilan Badan (${data.pphBadanRate}%)`, -data.pajakPenghasilan, { bold: true });
  y += 4;
  // Pajak note
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  const noteLines = doc.splitTextToSize(`* ${data.pajakNote}`, contentWidth - 10);
  doc.text(noteLines, labelX, y);
  y += noteLines.length * 3.5 + 3;

  // ===== LABA BERSIH =====
  drawLine(doc, y, true);
  y += 6;
  doc.setFillColor(data.labaBersih >= 0 ? 219 : 254, data.labaBersih >= 0 ? 234 : 226, data.labaBersih >= 0 ? 254 : 226);
  doc.roundedRect(margin, y - 4, contentWidth, 9, 1, 1, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(data.labaBersih >= 0 ? 30 : 153, data.labaBersih >= 0 ? 64 : 27, data.labaBersih >= 0 ? 175 : 27);
  doc.text("LABA BERSIH", labelX, y + 2);
  doc.text(formatRupiahID(data.labaBersih), valueX, y + 2, { align: "right" });
  y += 10;
  drawLine(doc, y, true);

  drawFooter(doc, "Lampiran SPT Badan - Laporan Laba Rugi");

  return doc;
}
