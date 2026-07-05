// Modern Surat Resmi PDF generator - uses DocumentLayout settings
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
  logoWidth: number;
  headerContact: string;
  headerAddress1: string;
  headerAddress2: string;
  signatoryName: string;
  signatoryTitle: string;
  companyName: string;
  companyLogo: string;
  companySignature: string;
  // Layout settings (from DocumentLayout)
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

  // Colors from layout settings
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

  const headerHeight = s.headerHeight || 32;
  const infoPos = s.companyInfoPosition || "above";
  const logoSize = s.logoSize || 12;
  const headerGradient = s.headerGradient !== false;

  let y = 10;

  // ===== COMPANY INFO (above/inside/below navy box) =====
  const drawCompanyInfo = (onDark: boolean) => {
    const nameC = onDark ? [255, 255, 255] as [number, number, number] : companyNameColor;
    const addrC = onDark ? [220, 230, 245] as [number, number, number] : companyAddrColor;
    const contactC = onDark ? [180, 200, 230] as [number, number, number] : companyContactColor;

    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.setTextColor(...nameC);
    const align = s.companyNameAlign === "left" ? "left" : s.companyNameAlign === "center" ? "center" : "right";
    const textX = align === "right" ? pageWidth - margin : align === "center" ? pageWidth / 2 : margin + logoSize + 5;
    doc.text(s.companyNameText || data.companyName || "PT. HAFARA AQIBA NUSANTARA", textX, y + 3, align === "right" ? { align: "right" } : align === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...addrC);
    const addrAlign = s.companyAddressAlign === "left" ? "left" : s.companyAddressAlign === "center" ? "center" : "right";
    doc.text(data.headerAddress1 || s.companyAddressText || "", addrAlign === "right" ? pageWidth - margin : textX, y + 7, addrAlign === "right" ? { align: "right" } : {});

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...contactC);
    const contactAlign = s.companyContactAlign === "left" ? "left" : s.companyContactAlign === "center" ? "center" : "right";
    doc.text(data.headerContact || s.companyContactText || "", contactAlign === "right" ? pageWidth - margin : textX, y + 11, contactAlign === "right" ? { align: "right" } : {});
  };

  // Logo
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

  // Info ABOVE
  if (infoPos === "above") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== NAVY HEADER BOX =====
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

  // ===== ACCENT LINE =====
  doc.setFillColor(...accentLineColor);
  doc.rect(0, y, pageWidth, s.accentLineHeight || 1.5, "F");
  y += (s.accentLineHeight || 1.5) + 5;

  // Info BELOW
  if (infoPos === "below") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== DOCUMENT TITLE =====
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    const titleAlign = s.docTitlePosition || "left";
    doc.text(s.docTitleText || data.suratType || "Surat Penawaran", titleAlign === "right" ? pageWidth - margin : titleAlign === "center" ? pageWidth / 2 : margin, y, titleAlign === "right" ? { align: "right" } : titleAlign === "center" ? { align: "center" } : {});
    y += 6;
  }

  // ===== NOMOR / LAMPIRAN / PERIHAL =====
  doc.setFontSize(s.bodyFontSize || 10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyTextColor);
  doc.text(`Nomor   : ${data.suratNumber}`, margin, y);
  doc.text(`${data.city}, ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  if (data.lampiran) { doc.text(`Lampiran : ${data.lampiran}`, margin, y); y += 5; }
  doc.text(`Perihal  : ${data.perihal || "-"}`, margin, y);
  y += 8;

  // ===== KEPADA YTH =====
  doc.text("Kepada Yth,", margin, y); y += 5;
  if (data.recipientName) { doc.setFont("helvetica", "bold"); doc.text(data.recipientName, margin, y); y += 5; }
  doc.setFont("helvetica", "normal");
  if (data.recipientInstansi) { doc.text(data.recipientInstansi, margin, y); y += 5; }
  if (data.recipientAddress) { const a = doc.splitTextToSize(data.recipientAddress, contentWidth - 10); doc.text(a, margin, y); y += a.length * 4; }
  y += 5;

  // ===== ISI SURAT =====
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

  // Detail Kegiatan
  if (data.includeActivity) {
    y += 2; doc.setFont("helvetica", "normal");
    if (data.activityDate) { doc.text(`Tanggal   : ${data.activityDate}`, margin, y); y += 5; }
    if (data.activityLocation) { doc.text(`Lokasi    : ${data.activityLocation}`, margin, y); y += 5; }
    if (data.activityTime) { doc.text(`Waktu     : ${data.activityTime}`, margin, y); y += 5; }
    y += 4;
  }

  // Informasi Pembayaran
  if (data.includePayment) {
    y += 2;
    let pt = "";
    if (data.paymentAmount > 0) { pt = `Maka kami mengirimkan surat penawaran untuk mengundang Motivator sebesar ${formatRupiah(data.paymentAmount)}`; if (data.paymentAmountText) pt += ` (${data.paymentAmountText})`; pt += "."; }
    if (data.bookingAmount > 0) { pt += ` Adapun biaya tersebut dibayarkan sebesar ${formatRupiah(data.bookingAmount)}`; if (data.bookingAmountText) pt += ` (${data.bookingAmountText})`; pt += ` sebagai tanda booking date yang dapat dibayarkan melalui rekening ${data.bankName || "Bank"} : ${data.bankAccount || "-"}`; if (data.accountName) pt += ` A/N : ${data.accountName}`; pt += `. Selanjutnya sisa pembayaranya dapat dilakukan saat hari H.`; }
    const pl = doc.splitTextToSize(pt, contentWidth); doc.text(pl, margin, y); y += pl.length * 5 + 5;
  }
  y += 8;

  // ===== TANDA TANGAN =====
  const sigX = (s.sigPosition || "right") === "right" ? pageWidth - margin - 50 : (s.sigPosition || "right") === "center" ? pageWidth / 2 - 25 : margin;
  doc.setFont("helvetica", "normal"); doc.setFontSize(s.bodyFontSize || 10.5); doc.setTextColor(...bodyTextColor);
  doc.text("Hormat kami,", sigX, y); y += 4;
  y += 18;
  if (s.sigLineStyle !== "none") {
    doc.setDrawColor(...sigLineColor); doc.setLineWidth(0.3);
    if (s.sigLineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
    doc.line(sigX, y, sigX + 50, y); doc.setLineDashPattern([], 0);
  }
  y += 3;
  doc.setFont("helvetica", "bold"); doc.setTextColor(...sigNameColor); doc.text(data.signatoryName, sigX, y); y += 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.text(data.signatoryTitle, sigX, y);

  // Stempel
  if (s.stampEnabled !== false) {
    const stampY = y - 22;
    doc.setDrawColor(...headerBgColor); doc.setLineWidth(0.4); doc.circle(sigX - 15, stampY, 9, "S"); doc.setLineWidth(0.2);
    doc.setFontSize(4.5); doc.setTextColor(...headerBgColor); doc.text("PT. HAFARA", sigX - 15, stampY - 2, { align: "center" }); doc.text("NUSANTARA", sigX - 15, stampY + 1, { align: "center" }); doc.circle(sigX - 15, stampY, 7, "S");
  }

  // ===== FOOTER =====
  if (s.footerShowText) {
    const fy = pageHeight - (s.footerHeight || 14) - 2;
    doc.setFillColor(...footerBgColor); doc.rect(0, fy, pageWidth, (s.footerHeight || 14) + 2, "F");
    doc.setFillColor(...accentLineColor); doc.rect(0, fy, pageWidth, 1, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(s.footerText || "Terima Kasih!", pageWidth / 2, fy + 6, { align: "center" });
    if (s.footerSubText) { doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.text(s.footerSubText, pageWidth / 2, fy + 10, { align: "center" }); }
  } else {
    doc.setFillColor(...footerBgColor); doc.rect(0, pageHeight - (s.footerHeight || 6), pageWidth, s.footerHeight || 6, "F");
  }

  return doc;
}

export function downloadSuratPDF(data: SuratData) {
  const doc = generateSuratPDF(data);
  doc.save(`Surat-${data.suratNumber.replace(/\//g, "-")}.pdf`);
}
