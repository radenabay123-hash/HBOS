// Modern Surat Resmi PDF generator
// Layout: Navy blue header (full width), logo left, company name right, modern footer
import { jsPDF } from "jspdf";

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
  body: string; // HTML content from rich text editor
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
}

function formatRupiah(n: number): string {
  return "Rp. " + (n || 0).toLocaleString("id-ID");
}

export function generateSuratPDF(data: SuratData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;

  const NAVY: [number, number, number] = [15, 35, 75];
  const NAVY_LIGHT: [number, number, number] = [25, 55, 105];
  const ORANGE: [number, number, number] = [255, 128, 0];
  const TEXT_DARK: [number, number, number] = [45, 55, 72];
  const TEXT_MUTED: [number, number, number] = [120, 130, 145];
  const BORDER: [number, number, number] = [220, 225, 232];

  // ===== MODERN HEADER (Navy blue full width) =====
  const headerHeight = 38;
  // Navy gradient effect (simulate with 2 rectangles)
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setFillColor(...NAVY_LIGHT);
  doc.rect(0, 0, pageWidth, headerHeight / 2, "F");

  let hy = 10;

  // ===== LOGO (LEFT - orange circle) =====
  const logoSize = 14;
  const logoX = margin;
  const logoY = hy;

  doc.setFillColor(...ORANGE);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
  doc.setFillColor(...NAVY);
  doc.circle(logoX + logoSize * 0.68, logoY + logoSize * 0.68, logoSize * 0.35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("H", logoX + logoSize / 2 - 0.5, logoY + logoSize / 2 + 1.5, { align: "center" });

  // Company name text (RIGHT of logo, inside header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("hafaragroup", logoX + logoSize + 3, hy + 4);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 230);
  doc.text("consulting", logoX + logoSize + 3, hy + 8);

  // Contact info (RIGHT side of header)
  const contact = data.headerContact || "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570";
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(contact, pageWidth - margin, hy + 2, { align: "right", maxWidth: 75 });

  if (data.headerAddress1) {
    doc.text(data.headerAddress1, pageWidth - margin, hy + 6, { align: "right", maxWidth: 75 });
  }
  if (data.headerAddress2) {
    doc.text(data.headerAddress2, pageWidth - margin, hy + 10, { align: "right", maxWidth: 75 });
  }

  // ===== Thin orange accent line below header =====
  doc.setFillColor(...ORANGE);
  doc.rect(0, headerHeight, pageWidth, 1.5, "F");

  let y = headerHeight + 8;

  // ===== DOCUMENT TYPE BADGE (modern pill shape) =====
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, 50, 6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(data.suratType || "Surat Penawaran", margin + 25, y + 4, { align: "center" });
  y += 10;

  // ===== Nomor / Lampiran / Perihal (LEFT) + Tanggal (RIGHT) =====
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");

  doc.text(`Nomor   : ${data.suratNumber}`, margin, y);
  doc.text(`${data.city}, ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  if (data.lampiran) {
    doc.text(`Lampiran : ${data.lampiran}`, margin, y);
    y += 5;
  }
  doc.text(`Perihal  : ${data.perihal || "-"}`, margin, y);
  y += 8;

  // ===== KEPADA YTH =====
  doc.text("Kepada Yth,", margin, y);
  y += 5;
  if (data.recipientName) {
    doc.setFont("helvetica", "bold");
    doc.text(data.recipientName, margin, y);
    y += 5;
  }
  doc.setFont("helvetica", "normal");
  if (data.recipientInstansi) {
    doc.text(data.recipientInstansi, margin, y);
    y += 5;
  }
  if (data.recipientAddress) {
    const addrLines = doc.splitTextToSize(data.recipientAddress, contentWidth - 10);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 4;
  }
  y += 6;

  // ===== ISI SURAT (parse HTML) =====
  doc.setFontSize(10.5);

  const bodyHTML = data.body || "";
  // Parse paragraphs
  const paragraphs = bodyHTML.split(/<(?:p|div|br)[^>]*>/i).filter((p) => p.trim());

  for (const para of paragraphs) {
    const cleanText = para.replace(/<[^>]+>/g, "").trim();
    if (!cleanText) continue;

    const isCenter = /align=["']center["']/i.test(para) || /text-align:\s*center/i.test(para);
    const isRight = /align=["']right["']/i.test(para) || /text-align:\s*right/i.test(para);
    const isJustify = /align=["']justify["']/i.test(para) || /text-align:\s*justify/i.test(para);
    const isBold = /<b>|<strong>/i.test(para);
    const isItalic = /<i>|<em>/i.test(para);

    doc.setFont("helvetica", isBold && isItalic ? "bolditalic" : isBold ? "bold" : isItalic ? "italic" : "normal");
    doc.setTextColor(...TEXT_DARK);

    const lines = doc.splitTextToSize(cleanText, contentWidth);
    for (const line of lines) {
      if (isCenter) {
        doc.text(line, pageWidth / 2, y, { align: "center" });
      } else if (isRight) {
        doc.text(line, pageWidth - margin, y, { align: "right" });
      } else if (isJustify) {
        doc.text(line, margin, y, { align: "justify", maxWidth: contentWidth });
      } else {
        doc.text(line, margin, y);
      }
      y += 5;
    }
    y += 2;
  }

  y += 3;

  // ===== DETAIL KEGIATAN =====
  if (data.includeActivity) {
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (data.activityDate) { doc.text(`Tanggal   : ${data.activityDate}`, margin, y); y += 5; }
    if (data.activityLocation) { doc.text(`Lokasi    : ${data.activityLocation}`, margin, y); y += 5; }
    if (data.activityTime) { doc.text(`Waktu     : ${data.activityTime}`, margin, y); y += 5; }
    y += 4;
  }

  // ===== INFORMASI PEMBAYARAN =====
  if (data.includePayment) {
    y += 2;
    let paymentText = "";
    if (data.paymentAmount > 0) {
      paymentText = `Maka kami mengirimkan surat penawaran untuk mengundang Motivator sebesar ${formatRupiah(data.paymentAmount)}`;
      if (data.paymentAmountText) paymentText += ` (${data.paymentAmountText})`;
      paymentText += ".";
    }
    if (data.bookingAmount > 0) {
      paymentText += ` Adapun biaya tersebut dibayarkan sebesar ${formatRupiah(data.bookingAmount)}`;
      if (data.bookingAmountText) paymentText += ` (${data.bookingAmountText})`;
      paymentText += ` sebagai tanda booking date yang dapat dibayarkan melalui rekening ${data.bankName || "Bank"} : ${data.bankAccount || "-"}`;
      if (data.accountName) paymentText += ` A/N : ${data.accountName}`;
      paymentText += `. Selanjutnya sisa pembayaranya dapat dilakukan saat hari H.`;
    }
    const payLines = doc.splitTextToSize(paymentText, contentWidth);
    doc.text(payLines, margin, y);
    y += payLines.length * 5 + 5;
  }

  y += 8;

  // ===== TANDA TANGAN (RIGHT - modern with line) =====
  const sigX = pageWidth - margin - 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Hormat kami,", sigX, y);
  y += 4;

  // Signature space
  y += 18;

  // Signature line (modern dashed line)
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 0.5], 0);
  doc.line(sigX, y, sigX + 50, y);
  doc.setLineDashPattern([], 0);

  y += 3;

  // Signatory name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(data.signatoryName, sigX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(9);
  doc.text(data.signatoryTitle, sigX, y);

  // ===== STEMPEL (circle, decorative) =====
  const stampY = y - 22;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.circle(sigX - 15, stampY, 9, "S");
  doc.setLineWidth(0.2);
  doc.setFontSize(4.5);
  doc.setTextColor(...NAVY);
  doc.text("PT. HAFARA", sigX - 15, stampY - 2, { align: "center" });
  doc.text("NUSANTARA", sigX - 15, stampY + 1, { align: "center" });
  doc.circle(sigX - 15, stampY, 7, "S");

  // ===== MODERN FOOTER (Navy blue full width) =====
  const footerY = pageHeight - 18;
  doc.setFillColor(...NAVY);
  doc.rect(0, footerY, pageWidth, 18, "F");

  // Orange accent line above footer
  doc.setFillColor(...ORANGE);
  doc.rect(0, footerY, pageWidth, 1, "F");

  // Footer text
  doc.setTextColor(200, 210, 225);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(data.companyName || "PT. HAFARA AQIBA NUSANTARA", margin, footerY + 8);
  doc.text("hafaragroup consulting", margin, footerY + 13);
  doc.text(`${data.headerContact || "info@hafaragroup.com"}`, pageWidth - margin, footerY + 8, { align: "right" });
  doc.text(`${data.headerAddress1 || ""} ${data.headerAddress2 || ""}`, pageWidth - margin, footerY + 13, { align: "right", maxWidth: 80 });

  return doc;
}

export function downloadSuratPDF(data: SuratData) {
  const doc = generateSuratPDF(data);
  const fileName = `Surat-${data.suratNumber.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
