// Invoice PDF generator - uses DocumentLayout settings
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
  // Company settings
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyNpwp?: string;
  companyLogo?: string;
  companySignature?: string;
  directorName?: string;
  directorTitle?: string;
  // Layout settings
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

  const headerHeight = s.headerHeight || 32;
  const infoPos = s.companyInfoPosition || "above";
  const headerGradient = s.headerGradient !== false;
  const companyName = s.companyNameText || data.companyName || "PT. HAFARA AQIBA NUSANTARA";

  let y = 8;

  // Company info (above/inside/below)
  const drawCompanyInfo = (onDark: boolean) => {
    const nameC: [number, number, number] = onDark ? [255, 255, 255] : hexToRgb(s.companyNameColor || "#1e3a8a");
    const addrC: [number, number, number] = onDark ? [220, 230, 245] : hexToRgb(s.companyAddressColor || "#64748b");
    const contactC: [number, number, number] = onDark ? [180, 200, 230] : hexToRgb(s.companyContactColor || "#94a3b8");
    const align = s.companyNameAlign === "left" ? "left" : s.companyNameAlign === "center" ? "center" : "right";
    const tx = align === "right" ? pageWidth - margin : align === "center" ? pageWidth / 2 : margin + (s.logoSize || 16) + 5;

    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.setTextColor(...nameC);
    doc.text(companyName, tx, y + 3, align === "right" ? { align: "right" } : align === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...addrC);
    doc.text(data.companyAddress || "", tx, y + 7, align === "right" ? { align: "right" } : {});

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...contactC);
    doc.text(`${data.companyEmail} | ${data.companyWebsite} | ${data.companyPhone}`, tx, y + 11, align === "right" ? { align: "right" } : {});
  };

  const drawLogo = (lx: number, ly: number) => {
    const ls = s.logoSize || 16;
    doc.setFillColor(...logoColor);
    doc.circle(lx + ls / 2, ly + ls / 2, ls / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(lx + ls * 0.68, ly + ls * 0.68, ls * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "HF", lx + ls / 2 - 0.5, ly + ls / 2 + 1.5, { align: "center" });
  };

  if (infoPos === "above") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // Navy header box
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
  if (infoPos === "inside") { drawLogo(margin, y + 5); drawCompanyInfo(true); }
  y += headerHeight;

  // Accent line
  doc.setFillColor(...accentLine);
  doc.rect(0, y, pageWidth, s.accentLineHeight || 1.5, "F");
  y += (s.accentLineHeight || 1.5) + 5;

  if (infoPos === "below") { drawLogo(margin, y); drawCompanyInfo(false); y += 16; }

  // Document title
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    const ta = s.docTitlePosition || "center";
    doc.text(s.docTitleText || "INVOICE", ta === "right" ? pageWidth - margin : ta === "center" ? pageWidth / 2 : margin, y, ta === "right" ? { align: "right" } : ta === "center" ? { align: "center" } : {});
    y += 8;
  }

  // Invoice info + client info
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
  doc.text("Ditagihkan Kepada:", margin, y);
  doc.text(`No. Invoice: ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "bold"); doc.text(data.clientName, margin, y);
  doc.text(`Tanggal: ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
  if (data.clientAddress) doc.text(data.clientAddress, margin, y);
  // Status badge
  const statusColor = data.status === "PAID" ? statusPaid : data.status === "CANCELLED" ? statusCancelled : statusPending;
  doc.setFillColor(...statusColor); doc.roundedRect(pageWidth - margin - 35, y - 3, 35, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(data.status, pageWidth - margin - 17.5, y, { align: "center" });
  y += 8;

  // Items table
  doc.setFillColor(...tableHeaderBg); doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text("DESKRIPSI", margin + 3, y + 5);
  doc.text("QTY", margin + 100, y + 5, { align: "center" });
  doc.text("HARGA", margin + 130, y + 5, { align: "center" });
  doc.text("TOTAL", pageWidth - margin - 3, y + 5, { align: "right" });
  y += 7;

  doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  for (let i = 0; i < data.items.length; i++) {
    if (i % 2 === 0) { doc.setFillColor(...tableRowAlt); doc.rect(margin, y, pageWidth - margin * 2, 7, "F"); }
    const item = data.items[i];
    doc.text(item.description, margin + 3, y + 5);
    doc.text(String(item.qty), margin + 100, y + 5, { align: "center" });
    doc.text(formatRupiah(item.price), margin + 130, y + 5, { align: "center" });
    doc.text(formatRupiah(item.total), pageWidth - margin - 3, y + 5, { align: "right" });
    y += 7;
  }
  y += 3;

  // Summary
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal:", pageWidth - margin - 60, y); doc.text(formatRupiah(data.subtotal), pageWidth - margin, y, { align: "right" }); y += 5;
  if (data.discount > 0) { doc.text("Diskon:", pageWidth - margin - 60, y); doc.text("- " + formatRupiah(data.discount), pageWidth - margin, y, { align: "right" }); y += 5; }
  if (data.tax > 0) { doc.text("Pajak:", pageWidth - margin - 60, y); doc.text(formatRupiah(data.tax), pageWidth - margin, y, { align: "right" }); y += 5; }

  doc.setFillColor(...totalLabelColor); doc.roundedRect(pageWidth - margin - 60, y, 60, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(s.totalFontSize || 9);
  doc.text("TOTAL", pageWidth - margin - 57, y + 5);
  doc.text(formatRupiah(data.totalAmount), pageWidth - margin - 3, y + 5, { align: "right" });
  y += 12;

  // Payment info
  if (data.bankName) {
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 1, 1, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...totalLabelColor);
    doc.text("Pembayaran via Transfer:", margin + 3, y + 4);
    doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(`${data.bankName} — ${data.bankAccount} — ${data.accountName}`, margin + 3, y + 8);
    y += 14;
  }

  // Signature
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 50 : margin;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
  doc.text("Hormat kami,", sigX, y); y += 4;
  y += 18;
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...hexToRgb(s.sigLineColor || "#d1d5db")); doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 50, y); doc.setLineDashPattern([], 0);
  }
  y += 3;
  doc.setFont("helvetica", "bold"); doc.setTextColor(...sigNameColor); doc.text(data.directorName || "M. Aqil Baihaqi", sigX, y); y += 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.text(data.directorTitle || "Direktur Utama", sigX, y);

  // Footer
  if (s.footerShowText) {
    const fy = pageHeight - (s.footerHeight || 14);
    doc.setFillColor(...footerBg); doc.rect(0, fy, pageWidth, s.footerHeight || 14, "F");
    doc.setFillColor(...accentLine); doc.rect(0, fy, pageWidth, 1, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(s.footerText || "Thank You!", pageWidth / 2, fy + 6, { align: "center" });
    if (s.footerSubText) { doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.text(s.footerSubText, pageWidth / 2, fy + 10, { align: "center" }); }
  } else {
    doc.setFillColor(...footerBg); doc.rect(0, pageHeight - (s.footerHeight || 6), pageWidth, s.footerHeight || 6, "F");
  }

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  doc.save(`Invoice-${data.invoiceNumber.replace(/\//g, "-")}.pdf`);
}
