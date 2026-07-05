// Invoice PDF generator - CLEAN implementation using ONLY DocumentLayout settings
// Old design elements have been cleared. All design comes from Layout Dokumen settings.
import { jsPDF } from "jspdf";
import { hexToRgb, shadeColor } from "./layout-helper";

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
  directorName?: string;
  directorTitle?: string;
  // Layout settings (from DocumentLayout) - ALL design comes from here
  layout?: any;
}

function formatRupiah(n: number): string {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const s = data.layout || {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;

  // ===== ALL colors from layout settings =====
  const headerBg: [number, number, number] = hexToRgb(s.headerBgColor || "#1e3a8a");
  const accentLine: [number, number, number] = hexToRgb(s.accentLineColor || "#1e3a8a");
  const footerBg: [number, number, number] = hexToRgb(s.footerBgColor || "#1e3a8a");
  const tableHeaderBg: [number, number, number] = hexToRgb(s.tableHeaderBgColor || "#1e3a8a");
  const tableRowAlt: [number, number, number] = hexToRgb(s.tableRowAltColor || "#eff6ff");
  const totalLabelColor: [number, number, number] = hexToRgb(s.totalLabelColor || "#1e3a8a");
  const sigNameColor: [number, number, number] = hexToRgb(s.sigNameColor || "#1e3a8a");
  const docTitleColor: [number, number, number] = hexToRgb(s.docTitleColor || "#1e3a8a");
  const statusPending: [number, number, number] = hexToRgb(s.statusBadgePending || "#fbbf24");
  const statusPaid: [number, number, number] = hexToRgb(s.statusBadgePaid || "#22c55e");
  const statusCancelled: [number, number, number] = hexToRgb(s.statusBadgeCancelled || "#ef4444");
  const logoColor: [number, number, number] = hexToRgb(s.logoColor || "#f97316");
  const footerTextColor: [number, number, number] = hexToRgb(s.footerTextColor || "#ffffff");
  const companyNameColor: [number, number, number] = hexToRgb(s.companyNameColor || "#1e3a8a");
  const companyAddrColor: [number, number, number] = hexToRgb(s.companyAddressColor || "#64748b");
  const companyContactColor: [number, number, number] = hexToRgb(s.companyContactColor || "#94a3b8");

  const headerHeight = s.headerHeight || 32;
  const infoPos = s.companyInfoPosition || "above";
  const headerGradient = s.headerGradient !== false;
  const logoSize = s.logoSize || 16;
  const accentLineHeight = s.accentLineHeight || 1.5;

  // Company info text - ALWAYS from layout settings
  const companyName = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddress = s.companyAddressText || "";
  const companyContact = s.companyContactText || "";

  let y = 8;

  // ===== Reusable: Draw logo =====
  const drawLogo = (lx: number, ly: number) => {
    doc.setFillColor(...logoColor);
    doc.circle(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(lx + logoSize * 0.68, ly + logoSize * 0.68, logoSize * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "HF", lx + logoSize / 2 - 0.5, ly + logoSize / 2 + 1.5, { align: "center" });
  };

  // ===== Reusable: Draw company info (name → address → contact) =====
  const drawCompanyInfo = (onDark: boolean) => {
    const nameC: [number, number, number] = onDark ? [255, 255, 255] : companyNameColor;
    const addrC: [number, number, number] = onDark ? [220, 230, 245] : companyAddrColor;
    const contactC: [number, number, number] = onDark ? [180, 200, 230] : companyContactColor;

    const nameAlign = s.companyNameAlign === "left" ? "left" : s.companyNameAlign === "center" ? "center" : "right";
    const addrAlign = s.companyAddressAlign === "left" ? "left" : s.companyAddressAlign === "center" ? "center" : "right";
    const contactAlign = s.companyContactAlign === "left" ? "left" : s.companyContactAlign === "center" ? "center" : "right";

    const nameX = nameAlign === "right" ? pageWidth - margin : nameAlign === "center" ? pageWidth / 2 : margin + logoSize + 5;
    const addrX = addrAlign === "right" ? pageWidth - margin : addrAlign === "center" ? pageWidth / 2 : margin + logoSize + 5;
    const contactX = contactAlign === "right" ? pageWidth - margin : contactAlign === "center" ? pageWidth / 2 : margin + logoSize + 5;

    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.setTextColor(...nameC);
    doc.text(companyName, nameX, y + 3, nameAlign === "right" ? { align: "right" } : nameAlign === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...addrC);
    doc.text(companyAddress, addrX, y + 7, addrAlign === "right" ? { align: "right" } : addrAlign === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...contactC);
    doc.text(companyContact, contactX, y + 11, contactAlign === "right" ? { align: "right" } : contactAlign === "center" ? { align: "center" } : {});
  };

  // ===== 1. INFO ABOVE =====
  if (infoPos === "above") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 2. NAVY HEADER BOX =====
  if (headerGradient) {
    doc.setFillColor(...headerBg);
    doc.rect(0, y, pageWidth, headerHeight, "F");
    const lighter = hexToRgb(shadeColor(s.headerBgColor || "#1e3a8a", 15));
    doc.setFillColor(...lighter);
    doc.rect(0, y, pageWidth, headerHeight / 2, "F");
  } else {
    doc.setFillColor(...headerBg);
    doc.rect(0, y, pageWidth, headerHeight, "F");
  }
  if (infoPos === "inside") {
    drawLogo(margin, y + 5);
    drawCompanyInfo(true);
  }
  y += headerHeight;

  // ===== 3. ACCENT LINE =====
  doc.setFillColor(...accentLine);
  doc.rect(0, y, pageWidth, accentLineHeight, "F");
  y += accentLineHeight + 5;

  // ===== 4. INFO BELOW =====
  if (infoPos === "below") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 5. DOCUMENT TITLE (in body, matches LivePreview) =====
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    const ta = s.docTitlePosition || "center";
    const tx = ta === "right" ? pageWidth - margin : ta === "center" ? pageWidth / 2 : margin;
    doc.text(s.docTitleText || "INVOICE", tx, y, ta === "right" ? { align: "right" } : ta === "center" ? { align: "center" } : {});
    y += 8;
  }

  // ===== 6. CLIENT INFO + INVOICE INFO (2 columns) =====
  // Left: Ditagihkan Kepada
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...totalLabelColor);
  doc.text("DITAGIHKAN KEPADA", margin, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(data.clientName, margin, y);
  // Right: Invoice details
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`No. Invoice: ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (data.clientAddress) doc.text(data.clientAddress, margin, y);
  doc.text(`Tanggal: ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 4;
  // Status badge (right aligned)
  const statusColor = data.status === "PAID" ? statusPaid : data.status === "CANCELLED" ? statusCancelled : statusPending;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - 30, y - 3, 30, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(data.status, pageWidth - margin - 15, y, { align: "center" });
  y += 8;

  // ===== 7. ITEMS TABLE (modern with rounded corners) =====
  const tableWidth = contentWidth;
  // Header
  doc.setFillColor(...tableHeaderBg);
  doc.roundedRect(margin, y, tableWidth, 7, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("DESKRIPSI", margin + 3, y + 5);
  doc.text("QTY", margin + tableWidth * 0.55, y + 5, { align: "center" });
  doc.text("HARGA", margin + tableWidth * 0.72, y + 5, { align: "center" });
  doc.text("TOTAL", pageWidth - margin - 3, y + 5, { align: "right" });
  y += 7;

  // Rows
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (i % 2 === 0) {
      doc.setFillColor(...tableRowAlt);
      doc.rect(margin, y, tableWidth, 7, "F");
    }
    doc.text(item.description, margin + 3, y + 5);
    doc.text(String(item.qty), margin + tableWidth * 0.55, y + 5, { align: "center" });
    doc.text(formatRupiah(item.price), margin + tableWidth * 0.72, y + 5, { align: "center" });
    doc.text(formatRupiah(item.total), pageWidth - margin - 3, y + 5, { align: "right" });
    y += 7;
  }
  // Bottom border of table
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ===== 8. SUMMARY (right aligned) =====
  const summaryX = pageWidth - margin - 65;
  const summaryW = 65;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
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
  // Total box
  doc.setFillColor(...totalLabelColor);
  doc.roundedRect(summaryX, y, summaryW, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(s.totalFontSize || 9);
  doc.text("TOTAL", summaryX + 3, y + 5.5);
  doc.text(formatRupiah(data.totalAmount), pageWidth - margin - 3, y + 5.5, { align: "right" });
  y += 13;

  // ===== 9. PAYMENT INFO (modern card) =====
  if (data.bankName) {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...totalLabelColor);
    doc.text("Pembayaran via Transfer:", margin + 3, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${data.bankName} — ${data.bankAccount} — ${data.accountName}`, margin + 3, y + 8);
    y += 14;
  }

  // ===== 10. SIGNATURE (position from layout settings) =====
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 50 : (s.sigPosition || "right") === "center" ? pageWidth / 2 - 25 : margin;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("Hormat kami,", sigX, y);
  y += 4;
  y += 18;
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...hexToRgb(s.sigLineColor || "#d1d5db"));
    doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 50, y);
    doc.setLineDashPattern([], 0);
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sigNameColor);
  doc.text(data.directorName || "M. Aqil Baihaqi", sigX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(data.directorTitle || "Direktur Utama", sigX, y);

  // ===== 11. FOOTER (from layout settings) =====
  const footerHeight = s.footerHeight || 14;
  if (s.footerShowText) {
    const fy = pageHeight - footerHeight;
    doc.setFillColor(...footerBg);
    doc.rect(0, fy, pageWidth, footerHeight, "F");
    doc.setFillColor(...accentLine);
    doc.rect(0, fy, pageWidth, 1, "F");
    doc.setTextColor(...footerTextColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(s.footerText || "Thank You!", pageWidth / 2, fy + 6, { align: "center" });
    if (s.footerSubText) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(s.footerSubText, pageWidth / 2, fy + 10, { align: "center" });
    }
  } else {
    doc.setFillColor(...footerBg);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");
  }

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  doc.save(`Invoice-${data.invoiceNumber.replace(/\//g, "-")}.pdf`);
}
