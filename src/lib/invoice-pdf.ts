// Professional Invoice PDF generator - sesuai format gambar
import { jsPDF } from "jspdf";
import { COMPANY_INFO } from "./spt-pdf";

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientAddress?: string;
  city?: string;
  description?: string;
  items: { description: string; qty: number; price: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: string;
  paymentInstruction?: string;
  terms?: string;
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
}

function formatRupiah(n: number): string {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  const BLUE_DARK: [number, number, number] = [30, 58, 138];
  const BLUE: [number, number, number] = [37, 99, 235];
  const TEXT_DARK: [number, number, number] = [30, 41, 59];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];
  const BORDER: [number, number, number] = [203, 213, 225];

  let y = 15;

  // ===== HEADER (Company) =====
  // Logo circle (left) - orange/blue gradient style
  doc.setFillColor(249, 115, 22); // orange-500
  doc.circle(margin + 10, y + 8, 8, "F");
  doc.setFillColor(...BLUE);
  doc.circle(margin + 14, y + 12, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("H", margin + 12, y + 10, { align: "center" });

  // Company name (right of logo)
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, margin + 22, y + 4);

  // Contact info
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Email: ${COMPANY_INFO.email}  |  Web: ${COMPANY_INFO.website}  |  Telp: ${COMPANY_INFO.phone}`, margin + 22, y + 9);
  doc.text(COMPANY_INFO.address, margin + 22, y + 13);

  // Header bottom border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 18, pageWidth - margin, y + 18);
  y += 24;

  // ===== INVOICE TITLE (center) =====
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth / 2, y + 5, { align: "center" });
  y += 12;

  // ===== Invoice info (right side) =====
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Nomor Invoice: ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 4;
  doc.text(`Tanggal: ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  // ===== Client info (left) =====
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DITAGIHKAN KEPADA:", margin, y);
  y += 4;
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(10);
  doc.text(data.clientName, margin, y + 2);
  y += 6;
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (data.clientAddress) {
    const addrLines = doc.splitTextToSize(data.clientAddress, 80);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 3.5;
  }

  y += 4;

  // ===== ITEMS TABLE =====
  // Table header
  const colDesc = margin;
  const colQty = margin + 95;
  const colPrice = margin + 120;
  const colTotal = pageWidth - margin;
  const tableY = y;

  doc.setFillColor(...BLUE_DARK);
  doc.rect(margin, tableY, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("DESKRIPSI PRODUK / LAYANAN", colDesc + 3, tableY + 5);
  doc.text("JUMLAH", colQty + 10, tableY + 5, { align: "center" });
  doc.text("HARGA SATUAN", colPrice + 25, tableY + 5, { align: "center" });
  doc.text("TOTAL", colTotal - 3, tableY + 5, { align: "right" });

  y = tableY + 7;

  // Table rows
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let rowBg = false;

  for (const item of data.items) {
    if (rowBg) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 10, "F");
    }
    // Description
    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines.slice(0, 2), colDesc + 3, y + 4);
    // Qty
    doc.text(String(item.qty), colQty + 10, y + 5, { align: "center" });
    // Price
    doc.text(formatRupiah(item.price), colPrice + 25, y + 5, { align: "center" });
    // Total
    doc.text(formatRupiah(item.total), colTotal - 3, y + 5, { align: "right" });

    y += Math.max(10, descLines.length * 4 + 2);
    rowBg = !rowBg;
  }

  // Table bottom border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== Summary (right side) =====
  const summaryX = pageWidth - margin - 70;
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", summaryX, y);
  doc.text(formatRupiah(data.subtotal), pageWidth - margin, y, { align: "right" });
  y += 5;

  if (data.discount > 0) {
    doc.text("Diskon:", summaryX, y);
    doc.text("- " + formatRupiah(data.discount), pageWidth - margin, y, { align: "right" });
    y += 5;
  }
  if (data.tax > 0) {
    doc.text("Pajak:", summaryX, y);
    doc.text(formatRupiah(data.tax), pageWidth - margin, y, { align: "right" });
    y += 5;
  }

  // Total payment
  y += 2;
  doc.setDrawColor(...BORDER);
  doc.line(summaryX, y, pageWidth - margin, y);
  y += 5;
  doc.setTextColor(...BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL PEMBAYARAN:", summaryX, y);
  doc.text(formatRupiah(data.totalAmount), pageWidth - margin, y, { align: "right" });
  y += 8;

  // Status
  const statusColor: [number, number, number] = data.status === "PAID" ? [220, 252, 231] : data.status === "CANCELLED" ? [254, 226, 226] : [254, 243, 199];
  const statusText: [number, number, number] = data.status === "PAID" ? [22, 101, 52] : data.status === "CANCELLED" ? [153, 27, 27] : [180, 83, 9];
  doc.setFillColor(...statusColor);
  doc.roundedRect(summaryX, y, 70, 7, 1, 1, "F");
  doc.setTextColor(...statusText);
  doc.setFontSize(8);
  doc.text(`STATUS PEMBAYARAN: ${data.status}`, summaryX + 35, y + 4.5, { align: "center" });
  y += 14;

  // ===== Payment Instructions =====
  if (data.paymentInstruction || data.bankName) {
    doc.setTextColor(...BLUE_DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUKSI PEMBAYARAN:", margin, y);
    y += 5;
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    if (data.paymentInstruction) {
      const payLines = doc.splitTextToSize(data.paymentInstruction, contentWidth);
      doc.text(payLines, margin, y);
      y += payLines.length * 4;
    } else {
      if (data.bankName) { doc.text(`Bank: ${data.bankName}`, margin, y); y += 4; }
      if (data.accountName) { doc.text(`AN: ${data.accountName}`, margin, y); y += 4; }
      if (data.bankAccount) { doc.text(`No. Rek: ${data.bankAccount}`, margin, y); y += 4; }
    }
    y += 4;
  }

  // ===== Terms & Conditions =====
  if (data.terms) {
    doc.setTextColor(...BLUE_DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SYARAT & KETENTUAN:", margin, y);
    y += 5;
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const termLines = doc.splitTextToSize(data.terms, contentWidth);
    doc.text(termLines, margin, y);
    y += termLines.length * 3.5 + 5;
  }

  // ===== Signature (right bottom) =====
  const sigY = Math.max(y + 5, pageHeight - 50);
  // Logo in signature
  doc.setFillColor(249, 115, 22);
  doc.circle(pageWidth - margin - 35, sigY, 5, "F");
  doc.setFillColor(...BLUE);
  doc.circle(pageWidth - margin - 32, sigY + 2, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("H", pageWidth - margin - 34, sigY + 1, { align: "center" });

  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("hafaragroup consulting", pageWidth - margin - 25, sigY);
  // Signature line
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 55, sigY + 12, pageWidth - margin - 5, sigY + 12);
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("M. Aqil Baihaqi", pageWidth - margin - 30, sigY + 16, { align: "center" });
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Direktur Utama", pageWidth - margin - 30, sigY + 20, { align: "center" });
  doc.text("www.HafaraGroup.com", pageWidth - margin - 30, sigY + 24, { align: "center" });

  // ===== Footer =====
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Thank You!", pageWidth / 2, pageHeight - 6, { align: "center" });

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  const fileName = `Invoice-${data.invoiceNumber.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
