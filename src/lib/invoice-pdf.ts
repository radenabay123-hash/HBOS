// Invoice PDF generator - PROFESSIONAL CLEAN design
// All design comes from DocumentLayout settings. No overlapping elements.
import { jsPDF } from "jspdf";
import { hexToRgb, type LogoImageData } from "./layout-helper";

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
  logoImageData?: LogoImageData | null;
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

  // ===== Colors from layout settings =====
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

  // Company info text
  const companyName = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddress = s.companyAddressText || "";
  const companyContact = s.companyContactText || "";

  const infoPos = s.companyInfoPosition || "inside";
  const logoSize = s.logoSize || 16;
  const headerHeight = s.headerHeight || 28;
  const accentLineHeight = s.accentLineHeight || 1.5;
  const footerHeight = s.footerHeight || 14;

  let y = 12;

  // ===== Reusable: Draw logo (uploaded image OR circle fallback) =====
  const drawLogo = (lx: number, ly: number) => {
    const maxH = logoSize;
    const maxW = 45;
    if (data.logoImageData && data.logoImageData.dataUrl) {
      const ar = data.logoImageData.width / data.logoImageData.height;
      let imgH = maxH;
      let imgW = maxH * ar;
      if (imgW > maxW) { imgW = maxW; imgH = maxW / ar; }
      const offsetY = (maxH - imgH) / 2;
      const imgFormat = data.logoImageData.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      try {
        doc.addImage(data.logoImageData.dataUrl, imgFormat, lx, ly + offsetY, imgW, imgH, undefined, "FAST");
      } catch {
        drawCircleLogo(lx, ly);
      }
    } else {
      drawCircleLogo(lx, ly);
    }
  };

  const drawCircleLogo = (lx: number, ly: number) => {
    doc.setFillColor(...logoColor);
    doc.circle(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(lx + logoSize * 0.68, ly + logoSize * 0.68, logoSize * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "HF", lx + logoSize / 2 - 0.5, ly + logoSize / 2 + 1.5, { align: "center" });
  };

  // ===== HEADER SECTION =====
  if (infoPos === "inside") {
    // INFO INSIDE NAVY HEADER (most professional)
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo (left, vertically centered)
    const logoY = (headerHeight - logoSize) / 2;
    drawLogo(margin, logoY);

    // Company info (right, white text)
    const infoX = pageWidth - margin;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.text(companyName, infoX, 8, { align: "right" });

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 230, 245);
    doc.text(companyAddress, infoX, 14, { align: "right" });

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(180, 200, 230);
    doc.text(companyContact, infoX, 19, { align: "right" });

    y = headerHeight + 2;
  } else if (infoPos === "above") {
    // INFO ABOVE + thin navy bar
    drawLogo(margin, y);

    const infoX = pageWidth - margin;
    doc.setTextColor(...hexToRgb(s.companyNameColor || "#1e3a8a"));
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.text(companyName, infoX, y + 4, { align: "right" });

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(s.companyAddressColor || "#64748b"));
    doc.text(companyAddress, infoX, y + 9, { align: "right" });

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...hexToRgb(s.companyContactColor || "#94a3b8"));
    doc.text(companyContact, infoX, y + 13, { align: "right" });

    y += 18;

    // Thin navy bar
    doc.setFillColor(...headerBg);
    doc.rect(0, y, pageWidth, 3, "F");
    doc.setFillColor(...accentLine);
    doc.rect(0, y + 3, pageWidth, accentLineHeight, "F");
    y += 3 + accentLineHeight + 8;
  } else {
    // INFO BELOW
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, 3, "F");
    doc.setFillColor(...accentLine);
    doc.rect(0, 3, pageWidth, accentLineHeight, "F");
    y = 3 + accentLineHeight + 8;

    drawLogo(margin, y);

    const infoX = pageWidth - margin;
    doc.setTextColor(...hexToRgb(s.companyNameColor || "#1e3a8a"));
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.text(companyName, infoX, y + 4, { align: "right" });

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(s.companyAddressColor || "#64748b"));
    doc.text(companyAddress, infoX, y + 9, { align: "right" });

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...hexToRgb(s.companyContactColor || "#94a3b8"));
    doc.text(companyContact, infoX, y + 13, { align: "right" });

    y += 18;
  }

  // ===== DOCUMENT TITLE + INVOICE INFO (2 columns, clean layout) =====
  // Left: INVOICE title (large, bold)
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    doc.text(s.docTitleText || "INVOICE", margin, y + 4);
  }

  // Right: Invoice number + date + status
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("No. Invoice:", pageWidth - margin - 55, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(data.invoiceNumber, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Tanggal:", pageWidth - margin - 55, y);
  doc.setTextColor(51, 65, 85);
  doc.text(data.issueDate, pageWidth - margin, y, { align: "right" });
  y += 5;
  // Status badge
  const statusColor = data.status === "PAID" ? statusPaid : data.status === "CANCELLED" ? statusCancelled : statusPending;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - 30, y - 3, 30, 5.5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(data.status, pageWidth - margin - 15, y + 0.5, { align: "center" });
  y += 10;

  // ===== CLIENT INFO (Ditagihkan Kepada) =====
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "S");
  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...totalLabelColor);
  doc.text("DITAGIHKAN KEPADA", margin + 4, y + 5);
  // Client name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(data.clientName, margin + 4, y + 10);
  // Client address
  if (data.clientAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const addrLines = doc.splitTextToSize(data.clientAddress, contentWidth - 8);
    doc.text(addrLines.slice(0, 2), margin + 4, y + 14);
  }
  y += 22;

  // ===== ITEMS TABLE =====
  // Table header
  doc.setFillColor(...tableHeaderBg);
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESKRIPSI", margin + 4, y + 5.5);
  doc.text("QTY", margin + contentWidth * 0.6, y + 5.5, { align: "center" });
  doc.text("HARGA", margin + contentWidth * 0.78, y + 5.5, { align: "center" });
  doc.text("TOTAL", pageWidth - margin - 4, y + 5.5, { align: "right" });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const rowHeight = 8;
    if (i % 2 === 0) {
      doc.setFillColor(...tableRowAlt);
      doc.rect(margin, y, contentWidth, rowHeight, "F");
    }
    doc.setTextColor(51, 65, 85);
    doc.text(item.description, margin + 4, y + 5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(item.qty), margin + contentWidth * 0.6, y + 5.5, { align: "center" });
    doc.text(formatRupiah(item.price), margin + contentWidth * 0.78, y + 5.5, { align: "center" });
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text(formatRupiah(item.total), pageWidth - margin - 4, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += rowHeight;
  }
  // Table bottom border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ===== SUMMARY (right aligned, clean) =====
  const summaryW = 70;
  const summaryX = pageWidth - margin - summaryW;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", summaryX, y);
  doc.setTextColor(51, 65, 85);
  doc.text(formatRupiah(data.subtotal), pageWidth - margin, y, { align: "right" });
  y += 6;
  if (data.discount > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("Diskon", summaryX, y);
    doc.setTextColor(51, 65, 85);
    doc.text("- " + formatRupiah(data.discount), pageWidth - margin, y, { align: "right" });
    y += 6;
  }
  if (data.tax > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("Pajak", summaryX, y);
    doc.setTextColor(51, 65, 85);
    doc.text(formatRupiah(data.tax), pageWidth - margin, y, { align: "right" });
    y += 6;
  }
  // Total box (navy)
  doc.setFillColor(...totalLabelColor);
  doc.roundedRect(summaryX, y, summaryW, 9, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", summaryX + 4, y + 6);
  doc.setFontSize(s.totalFontSize || 10);
  doc.text(formatRupiah(data.totalAmount), pageWidth - margin - 4, y + 6, { align: "right" });
  y += 15;

  // ===== PAYMENT INFO (clean card) =====
  if (data.bankName) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...totalLabelColor);
    doc.text("PEMBAYARAN VIA TRANSFER", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${data.bankName}  —  ${data.bankAccount}  —  ${data.accountName}`, margin + 4, y + 9);
    y += 17;
  }

  // ===== SIGNATURE =====
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 55 : (s.sigPosition || "right") === "center" ? pageWidth / 2 - 27.5 : margin;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("Hormat kami,", sigX, y);
  y += 6;
  y += 22;
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...hexToRgb(s.sigLineColor || "#d1d5db"));
    doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 55, y);
    doc.setLineDashPattern([], 0);
  }
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sigNameColor);
  doc.text(data.directorName || "M. Aqil Baihaqi", sigX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(data.directorTitle || "Direktur Utama", sigX, y);

  // ===== FOOTER =====
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
