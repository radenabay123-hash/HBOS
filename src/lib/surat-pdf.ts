// Surat Resmi PDF generator - PROFESSIONAL CLEAN design
// All design comes from DocumentLayout settings. No overlapping elements.
import { jsPDF } from "jspdf";
import { hexToRgb } from "./layout-helper";

export interface SuratData {
  suratType: string;
  suratNumber: string;
  issueDate: string;
  city: string;
  perihal: string;
  lampiran: string;
  recipientName: string;
  recipientInstansi: string;
  recipientAddress: string;
  body: string;
  includeActivity: boolean;
  activityDate: string;
  activityLocation: string;
  activityTime: string;
  includePayment: boolean;
  paymentAmount: number;
  paymentAmountText: string;
  bookingAmount: number;
  bookingAmountText: string;
  bankName: string;
  bankAccount: string;
  accountName: string;
  signatoryName: string;
  signatoryTitle: string;
  layout?: any;
}

function formatRupiah(n: number): string {
  return "Rp. " + (n || 0).toLocaleString("id-ID");
}

export function generateSuratPDF(data: SuratData): jsPDF {
  const s = data.layout || {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;

  // ===== Colors from layout settings =====
  const headerBg: [number, number, number] = hexToRgb(s.headerBgColor || "#0f234b");
  const accentLine: [number, number, number] = hexToRgb(s.accentLineColor || "#ff8000");
  const footerBg: [number, number, number] = hexToRgb(s.footerBgColor || "#0f234b");
  const bodyText: [number, number, number] = hexToRgb(s.bodyTextColor || "#2d3748");
  const docTitleColor: [number, number, number] = hexToRgb(s.docTitleColor || "#0f234b");
  const sigNameColor: [number, number, number] = hexToRgb(s.sigNameColor || "#0f234b");
  const sigLineColor: [number, number, number] = hexToRgb(s.sigLineColor || "#d1d5db");
  const logoColor: [number, number, number] = hexToRgb(s.logoColor || "#ff8000");
  const footerTextColor: [number, number, number] = hexToRgb(s.footerTextColor || "#ffffff");

  // Company info text
  const companyName = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddress = s.companyAddressText || "";
  const companyContact = s.companyContactText || "";

  const infoPos = s.companyInfoPosition || "inside";
  const logoSize = s.logoSize || 14;
  const headerHeight = s.headerHeight || 28;
  const accentLineHeight = s.accentLineHeight || 1.5;
  const footerHeight = s.footerHeight || 14;

  let y = 12;

  // ===== HEADER SECTION =====
  if (infoPos === "inside") {
    // INFO INSIDE NAVY HEADER (most professional)
    // Draw navy header box (SOLID color, no gradient to avoid two-bar effect)
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo (left side, vertically centered)
    const logoY = (headerHeight - logoSize) / 2;
    doc.setFillColor(...logoColor);
    doc.circle(margin + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(margin + logoSize * 0.68, logoY + logoSize * 0.68, logoSize * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "H", margin + logoSize / 2 - 0.5, logoY + logoSize / 2 + 1.5, { align: "center" });

    // Company info (right side, white text on navy)
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
    // INFO ABOVE (on white paper) + thin navy accent bar below
    // Logo (left)
    doc.setFillColor(...logoColor);
    doc.circle(margin + logoSize / 2, y + logoSize / 2, logoSize / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(margin + logoSize * 0.68, y + logoSize * 0.68, logoSize * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "H", margin + logoSize / 2 - 0.5, y + logoSize / 2 + 1.5, { align: "center" });

    // Company info (right)
    const infoX = pageWidth - margin;
    doc.setTextColor(...hexToRgb(s.companyNameColor || "#0f234b"));
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

    // Thin navy accent bar (not big empty box)
    doc.setFillColor(...headerBg);
    doc.rect(0, y, pageWidth, 3, "F");
    // Orange accent line
    doc.setFillColor(...accentLine);
    doc.rect(0, y + 3, pageWidth, accentLineHeight, "F");
    y += 3 + accentLineHeight + 6;
  } else {
    // INFO BELOW: thin navy bar first, then info below
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, 3, "F");
    doc.setFillColor(...accentLine);
    doc.rect(0, 3, pageWidth, accentLineHeight, "F");
    y = 3 + accentLineHeight + 6;

    // Logo
    doc.setFillColor(...logoColor);
    doc.circle(margin + logoSize / 2, y + logoSize / 2, logoSize / 2, "F");
    doc.setFillColor(...headerBg);
    doc.circle(margin + logoSize * 0.68, y + logoSize * 0.68, logoSize * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "H", margin + logoSize / 2 - 0.5, y + logoSize / 2 + 1.5, { align: "center" });

    // Company info
    const infoX = pageWidth - margin;
    doc.setTextColor(...hexToRgb(s.companyNameColor || "#0f234b"));
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

  // ===== DOCUMENT TITLE (in body, as pill badge) =====
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 10);
    doc.setFont("helvetica", "bold");
    const titleText = s.docTitleText || data.suratType || "Surat Penawaran";
    const textWidth = doc.getTextWidth(titleText) + 8;
    const titleAlign = s.docTitlePosition || "left";
    const pillX = titleAlign === "right" ? pageWidth - margin - textWidth : titleAlign === "center" ? (pageWidth - textWidth) / 2 : margin;
    doc.setFillColor(...docTitleColor);
    doc.roundedRect(pillX, y, textWidth, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(titleText, pillX + 4, y + 4);
    y += 10;
  }

  // ===== NOMOR / LAMPIRAN / PERIHAL =====
  doc.setFontSize(s.bodyFontSize || 10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyText);
  doc.text(`Nomor   : ${data.suratNumber}`, margin, y);
  doc.text(`${data.city}, ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  if (data.lampiran) {
    doc.text(`Lampiran : ${data.lampiran}`, margin, y);
    y += 6;
  }
  doc.text(`Perihal  : ${data.perihal || "-"}`, margin, y);
  y += 10;

  // ===== KEPADA YTH =====
  doc.text("Kepada Yth,", margin, y);
  y += 6;
  if (data.recipientName) {
    doc.setFont("helvetica", "bold");
    doc.text(data.recipientName, margin, y);
    y += 6;
  }
  doc.setFont("helvetica", "normal");
  if (data.recipientInstansi) {
    doc.text(data.recipientInstansi, margin, y);
    y += 6;
  }
  if (data.recipientAddress) {
    const addrLines = doc.splitTextToSize(data.recipientAddress, contentWidth - 10);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 5;
  }
  y += 8;

  // ===== ISI SURAT (parse HTML body) =====
  doc.setFontSize(s.bodyFontSize || 10.5);
  const bodyHTML = data.body || "";
  const paragraphs = bodyHTML.split(/<(?:p|div|br)[^>]*>/i).filter((p) => p.trim());
  for (const para of paragraphs) {
    const cleanText = para.replace(/<[^>]+>/g, "").trim();
    if (!cleanText) continue;
    const isCenter = /text-align:\s*center/i.test(para);
    const isRight = /text-align:\s*right/i.test(para);
    const isBold = /<b>|<strong>/i.test(para);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(cleanText, contentWidth);
    for (const line of lines) {
      if (isCenter) doc.text(line, pageWidth / 2, y, { align: "center" });
      else if (isRight) doc.text(line, pageWidth - margin, y, { align: "right" });
      else doc.text(line, margin, y);
      y += 6;
    }
    y += 3;
  }
  y += 4;

  // ===== DETAIL KEGIATAN =====
  if (data.includeActivity) {
    y += 2;
    doc.setFont("helvetica", "normal");
    if (data.activityDate) { doc.text(`Tanggal   : ${data.activityDate}`, margin, y); y += 6; }
    if (data.activityLocation) { doc.text(`Lokasi    : ${data.activityLocation}`, margin, y); y += 6; }
    if (data.activityTime) { doc.text(`Waktu     : ${data.activityTime}`, margin, y); y += 6; }
    y += 6;
  }

  // ===== INFORMASI PEMBAYARAN =====
  if (data.includePayment) {
    y += 2;
    let pt = "";
    if (data.paymentAmount > 0) {
      pt = `Maka kami mengirimkan surat penawaran untuk mengundang Motivator sebesar ${formatRupiah(data.paymentAmount)}`;
      if (data.paymentAmountText) pt += ` (${data.paymentAmountText})`;
      pt += ".";
    }
    if (data.bookingAmount > 0) {
      pt += ` Adapun biaya tersebut dibayarkan sebesar ${formatRupiah(data.bookingAmount)}`;
      if (data.bookingAmountText) pt += ` (${data.bookingAmountText})`;
      pt += ` sebagai tanda booking date yang dapat dibayarkan melalui rekening ${data.bankName || "Bank"} : ${data.bankAccount || "-"}`;
      if (data.accountName) pt += ` A/N : ${data.accountName}`;
      pt += `. Selanjutnya sisa pembayaranya dapat dilakukan saat hari H.`;
    }
    const pl = doc.splitTextToSize(pt, contentWidth);
    doc.text(pl, margin, y);
    y += pl.length * 6 + 6;
  }
  y += 10;

  // ===== TANDA TANGAN =====
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 55 : (s.sigPosition || "right") === "center" ? pageWidth / 2 - 27.5 : margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(s.bodyFontSize || 10.5);
  doc.setTextColor(...bodyText);
  doc.text("Hormat kami,", sigX, y);
  y += 6;
  y += 22; // Space for signature
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...sigLineColor);
    doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 55, y);
    doc.setLineDashPattern([], 0);
  }
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sigNameColor);
  doc.text(data.signatoryName, sigX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(data.signatoryTitle, sigX, y);

  // ===== FOOTER =====
  if (s.footerShowText) {
    const fy = pageHeight - footerHeight;
    doc.setFillColor(...footerBg);
    doc.rect(0, fy, pageWidth, footerHeight, "F");
    // Accent line above footer
    doc.setFillColor(...accentLine);
    doc.rect(0, fy, pageWidth, 1, "F");
    doc.setTextColor(...footerTextColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(s.footerText || "Terima Kasih!", pageWidth / 2, fy + 6, { align: "center" });
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

export function downloadSuratPDF(data: SuratData) {
  const doc = generateSuratPDF(data);
  doc.save(`Surat-${data.suratNumber.replace(/\//g, "-")}.pdf`);
}
