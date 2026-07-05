"use client";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Export array of objects to Excel
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = "Data"
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // auto width
  const colWidths: { wch: number }[] = [];
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    for (const k of keys) {
      const maxLen = Math.max(
        k.length,
        ...data.map((row) => String(row[k] ?? "").length)
      );
      colWidths.push({ wch: Math.min(maxLen + 2, 50) });
    }
    ws["!cols"] = colWidths;
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
}

// Export to PDF with a title and table
export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  subtitle?: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("HAFARA BUSINESS OPERATING SYSTEM", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleString("id-ID");
  doc.text(`Dibuat: ${dateStr}`, pageWidth - 14, 12, { align: "right" });
  if (subtitle) {
    doc.text(subtitle, pageWidth - 14, 20, { align: "right" });
  }

  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => r.map((c) => String(c ?? ""))),
    startY: 32,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: 14, right: 14 },
  });

  // Footer page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
}

// Export chart data as a simple PDF report with summary
export function exportReportPDF(
  title: string,
  sections: { heading: string; columns: string[]; rows: (string | number)[][] }[],
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("HAFARA BUSINESS OPERATING SYSTEM", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, pageWidth - 14, 12, { align: "right" });

  let y = 34;
  for (const s of sections) {
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(s.heading, 14, y);
    y += 4;
    autoTable(doc, {
      head: [s.columns],
      body: s.rows.map((r) => r.map((c) => String(c ?? ""))),
      startY: y,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: 14, right: 14 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 12;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
}
