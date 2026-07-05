// Surat Resmi PDF generator - CLEAN implementation using ONLY DocumentLayout settings
// Old design elements have been cleared. All design comes from Layout Dokumen settings.
import { jsPDF } from "jspdf";
import { hexToRgb, shadeColor } from "./layout-helper";

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
  // Layout settings (from DocumentLayout) - ALL design comes from here
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

  // ===== ALL colors from layout settings (no hardcoded fallbacks that conflict) =====
  const headerBgColor: [number, number, number] = hexToRgb(s.headerBgColor || "#0f234b");
  const accentLineColor: [number, number, number] = hexToRgb(s.accentLineColor || "#ff8000");
  const footerBgColor: [number, number, number] = hexToRgb(s.footerBgColor || "#0f234b");
  const bodyTextColor: [number, number, number] = hexToRgb(s.bodyTextColor || "#2d3748");
  const companyNameColor: [number, number, number] = hexToRgb(s.companyNameColor || "#0f234b");
  const companyAddrColor: [number, number, number] = hexToRgb(s.companyAddressColor || "#64748b");
  const companyContactColor: [number, number, number] = hexToRgb(s.companyContactColor || "#94a3b8");
  const docTitleColor: [number, number, number] = hexToRgb(s.docTitleColor || "#0f234b");
  const sigNameColor: [number, number, number] = hexToRgb(s.sigNameColor || "#0f234b");
  const sigLineColor: [number, number, number] = hexToRgb(s.sigLineColor || "#d1d5db");
  const logoColor: [number, number, number] = hexToRgb(s.logoColor || "#ff8000");
  const footerTextColor: [number, number, number] = hexToRgb(s.footerTextColor || "#ffffff");

  const headerHeight = s.headerHeight || 32;
  const infoPos = s.companyInfoPosition || "above";
  const logoSize = s.logoSize || 12;
  const headerGradient = s.headerGradient !== false;
  const accentLineHeight = s.accentLineHeight || 1.5;

  // Company info text - ALWAYS from layout settings (cleared old form data usage)
  const companyNameText = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddressText = s.companyAddressText || "";
  const companyContactText = s.companyContactText || "";

  let y = 10;

  // ===== Reusable: Draw company logo (circle with letter) =====
  const drawLogo = (lx: number, ly: number) => {
    const ls = logoSize;
    doc.setFillColor(...logoColor);
    doc.circle(lx + ls / 2, ly + ls / 2, ls / 2, "F");
    doc.setFillColor(...headerBgColor);
    doc.circle(lx + ls * 0.68, ly + ls * 0.68, ls * 0.35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(s.logoText || "H", lx + ls / 2 - 0.5, ly + ls / 2 + 1.5, { align: "center" });
  };

  // ===== Reusable: Draw company info block (name → address → contact) =====
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

    // Company Name
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.setTextColor(...nameC);
    doc.text(companyNameText, nameX, y + 3, nameAlign === "right" ? { align: "right" } : nameAlign === "center" ? { align: "center" } : {});

    // Address
    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...addrC);
    doc.text(companyAddressText, addrX, y + 7, addrAlign === "right" ? { align: "right" } : addrAlign === "center" ? { align: "center" } : {});

    // Contact
    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...contactC);
    doc.text(companyContactText, contactX, y + 11, contactAlign === "right" ? { align: "right" } : contactAlign === "center" ? { align: "center" } : {});
  };

  // ===== 1. INFO ABOVE (on white paper, above navy box) =====
  if (infoPos === "above") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 2. NAVY HEADER BOX (decorative, with optional info inside) =====
  if (headerGradient) {
    doc.setFillColor(...headerBgColor);
    doc.rect(0, y, pageWidth, headerHeight, "F");
    const lighter = hexToRgb(shadeColor(s.headerBgColor || "#0f234b", 15));
    doc.setFillColor(...lighter);
    doc.rect(0, y, pageWidth, headerHeight / 2, "F");
  } else {
    doc.setFillColor(...headerBgColor);
    doc.rect(0, y, pageWidth, headerHeight, "F");
  }

  if (infoPos === "inside") {
    drawLogo(margin, y + 5);
    drawCompanyInfo(true);
  }
  y += headerHeight;

  // ===== 3. ACCENT LINE =====
  doc.setFillColor(...accentLineColor);
  doc.rect(0, y, pageWidth, accentLineHeight, "F");
  y += accentLineHeight + 5;

  // ===== 4. INFO BELOW (on white paper, below navy box + accent line) =====
  if (infoPos === "below") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 5. DOCUMENT TITLE (in body, not header - matches LivePreview) =====
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    const titleAlign = s.docTitlePosition || "left";
    const titleX = titleAlign === "right" ? pageWidth - margin : titleAlign === "center" ? pageWidth / 2 : margin;
    // Draw as pill/badge (matches LivePreview for SURAT)
    const titleText = s.docTitleText || data.suratType || "Surat Penawaran";
    const textWidth = doc.getTextWidth(titleText) + 6;
    const pillX = titleAlign === "right" ? titleX - textWidth : titleAlign === "center" ? titleX - textWidth / 2 : titleX;
    doc.setFillColor(...docTitleColor);
    doc.roundedRect(pillX, y - 2, textWidth, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(titleText, pillX + 3, y + 2);
    y += 8;
  }

  // ===== 6. NOMOR / LAMPIRAN / PERIHAL =====
  doc.setFontSize(s.bodyFontSize || 10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyTextColor);
  doc.text(`Nomor   : ${data.suratNumber}`, margin, y);
  doc.text(`${data.city}, ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  if (data.lampiran) { doc.text(`Lampiran : ${data.lampiran}`, margin, y); y += 5; }
  doc.text(`Perihal  : ${data.perihal || "-"}`, margin, y);
  y += 8;

  // ===== 7. KEPADA YTH =====
  doc.text("Kepada Yth,", margin, y); y += 5;
  if (data.recipientName) { doc.setFont("helvetica", "bold"); doc.text(data.recipientName, margin, y); y += 5; }
  doc.setFont("helvetica", "normal");
  if (data.recipientInstansi) { doc.text(data.recipientInstansi, margin, y); y += 5; }
  if (data.recipientAddress) { const a = doc.splitTextToSize(data.recipientAddress, contentWidth - 10); doc.text(a, margin, y); y += a.length * 4; }
  y += 5;

  // ===== 8. ISI SURAT (parse HTML body) =====
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
      y += 5;
    }
    y += 2;
  }
  y += 3;

  // ===== 9. DETAIL KEGIATAN =====
  if (data.includeActivity) {
    y += 2; doc.setFont("helvetica", "normal");
    if (data.activityDate) { doc.text(`Tanggal   : ${data.activityDate}`, margin, y); y += 5; }
    if (data.activityLocation) { doc.text(`Lokasi    : ${data.activityLocation}`, margin, y); y += 5; }
    if (data.activityTime) { doc.text(`Waktu     : ${data.activityTime}`, margin, y); y += 5; }
    y += 4;
  }

  // ===== 10. INFORMASI PEMBAYARAN =====
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
    y += pl.length * 5 + 5;
  }
  y += 8;

  // ===== 11. TANDA TANGAN (position from layout settings) =====
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 50 : (s.sigPosition || "right") === "center" ? pageWidth / 2 - 25 : margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(s.bodyFontSize || 10.5);
  doc.setTextColor(...bodyTextColor);
  doc.text("Hormat kami,", sigX, y);
  y += 4;
  y += 18;
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...sigLineColor);
    doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 50, y);
    doc.setLineDashPattern([], 0);
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sigNameColor);
  doc.text(data.signatoryName, sigX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(data.signatoryTitle, sigX, y);

  // ===== 12. FOOTER (from layout settings) =====
  const footerHeight = s.footerHeight || 14;
  if (s.footerShowText) {
    const fy = pageHeight - footerHeight;
    doc.setFillColor(...footerBgColor);
    doc.rect(0, fy, pageWidth, footerHeight, "F");
    // Accent line above footer
    doc.setFillColor(...accentLineColor);
    doc.rect(0, fy, pageWidth, 1, "F");
    // Footer text (centered)
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
    doc.setFillColor(...footerBgColor);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");
  }

  return doc;
}

export function downloadSuratPDF(data: SuratData) {
  const doc = generateSuratPDF(data);
  doc.save(`Surat-${data.suratNumber.replace(/\//g, "-")}.pdf`);
}
