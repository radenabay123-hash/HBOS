// Professional Surat Resmi PDF generator - sesuai format gambar 2
// Layout: Blue header background, logo left, contact right, thick blue line, body left, signature right
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

// Convert HTML to plain text with formatting markers for jsPDF
function htmlToPdfText(html: string): { text: string; alignments: { text: string; align: string }[] } {
  // Simple HTML parser for basic formatting
  // jsPDF doesn't support HTML directly, so we parse and apply formatting
  return { text: html.replace(/<[^>]+>/g, ""), alignments: [] };
}

export function generateSuratPDF(data: SuratData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  const BLUE_DARK: [number, number, number] = [0, 51, 102]; // navy blue
  const ORANGE: [number, number, number] = [255, 128, 0];
  const TEXT_DARK: [number, number, number] = [64, 64, 64];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];

  // ===== BLUE HEADER BACKGROUND (full width) =====
  const headerHeight = 35;
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  let y = 8;

  // ===== LOGO (LEFT - inside blue header) =====
  const logoSize = (data.logoWidth || 144) / 5; // scale to mm (~28mm for 144px)
  const logoX = margin;
  const logoY = y;

  // Orange circle
  doc.setFillColor(...ORANGE);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
  // Blue arc overlay
  doc.setFillColor(...BLUE_DARK);
  doc.circle(logoX + logoSize * 0.7, logoY + logoSize * 0.7, logoSize * 0.35, "F");
  // "H" text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("H", logoX + logoSize / 2 - 1, logoY + logoSize / 2 + 2, { align: "center" });

  // "hafaragroup consulting" text (below logo, inside blue header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("hafaragroup", logoX, logoY + logoSize + 4);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 230); // light blue
  doc.text("consulting", logoX, logoY + logoSize + 8);

  // ===== CONTACT (RIGHT - inside blue header) =====
  const contact = data.headerContact || "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570";
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(contact, pageWidth - margin, y + 2, { align: "right", maxWidth: 80 });

  // Address (right, below contact)
  if (data.headerAddress1) {
    doc.text(data.headerAddress1, pageWidth - margin, y + 7, { align: "right", maxWidth: 80 });
  }
  if (data.headerAddress2) {
    doc.text(data.headerAddress2, pageWidth - margin, y + 11, { align: "right", maxWidth: 80 });
  }

  y = headerHeight + 8;

  // ===== THICK BLUE LINE (below header) =====
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(1.5);
  doc.line(0, headerHeight, pageWidth, headerHeight);
  doc.setLineWidth(0.2);

  // ===== NOMOR / LAMPIRAN / PERIHAL (LEFT) =====
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(`Nomor   : ${data.suratNumber}`, margin, y);
  y += 5;
  if (data.lampiran) {
    doc.text(`Lampiran : ${data.lampiran}`, margin, y);
    y += 5;
  }
  doc.text(`Perihal  : ${data.perihal || "-"}`, margin, y);
  y += 8;

  // ===== KEPADA YTH (LEFT) =====
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
  y += 5;

  // ===== CITY + DATE (RIGHT) =====
  doc.text(`${data.city}, ${data.issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 6;

  // ===== ISI SURAT (parse HTML, apply formatting) =====
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);

  // Parse HTML body - extract paragraphs and alignment
  const bodyHTML = data.body || "";
  // Split by paragraph or line break
  const paragraphs = bodyHTML.split(/<(?:p|div|br)[^>]*>/i).filter((p) => p.trim());

  for (const para of paragraphs) {
    const cleanText = para.replace(/<[^>]+>/g, "").trim();
    if (!cleanText) continue;

    // Check alignment from HTML
    const isCenter = /align=["']center["']/i.test(para) || /text-align:\s*center/i.test(para);
    const isRight = /align=["']right["']/i.test(para) || /text-align:\s*right/i.test(para);
    const isJustify = /align=["']justify["']/i.test(para) || /text-align:\s*justify/i.test(para);

    // Check for bold/italic
    const isBold = /<b>|<strong>/i.test(para);
    const isItalic = /<i>|<em>/i.test(para);

    doc.setFont("helvetica", isBold && isItalic ? "bolditalic" : isBold ? "bold" : isItalic ? "italic" : "normal");

    const lines = doc.splitTextToSize(cleanText, contentWidth);
    for (const line of lines) {
      if (isCenter) {
        doc.text(line, pageWidth / 2, y, { align: "center" });
      } else if (isRight) {
        doc.text(line, pageWidth - margin, y, { align: "right" });
      } else {
        doc.text(line, margin, y);
      }
      y += 5;
    }
    y += 2; // paragraph spacing
  }

  y += 3;

  // ===== DETAIL KEGIATAN =====
  if (data.includeActivity) {
    y += 2;
    doc.setFont("helvetica", "normal");
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

  // ===== TANDA TANGAN (RIGHT) =====
  const sigX = pageWidth - margin - 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Hormat kami,", sigX, y);
  y += 4;

  // Signature space
  y += 20;

  // Signatory name (bold)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE_DARK);
  doc.text(data.signatoryName, sigX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  doc.text(data.signatoryTitle, sigX, y);
  y += 3;

  // ===== STEMPEL (circle, left of signature) =====
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.5);
  doc.circle(sigX - 15, y - 14, 10, "S");
  doc.setFontSize(5);
  doc.setTextColor(...BLUE_DARK);
  doc.text("PT. HAFARA", sigX - 15, y - 16, { align: "center" });
  doc.text("NUSANTARA", sigX - 15, y - 12, { align: "center" });
  doc.setLineWidth(0.2);

  // ===== FOOTER LINE =====
  y = pageHeight - 20;
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(1.5);
  doc.line(0, y, pageWidth, y);
  doc.setLineWidth(0.2);

  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(data.companyName || "PT. HAFARA AQIBA NUSANTARA", margin, y + 5);
  doc.text(`${data.headerContact || "info@hafaragroup.com"}`, pageWidth - margin, y + 5, { align: "right" });

  return doc;
}

export function downloadSuratPDF(data: SuratData) {
  const doc = generateSuratPDF(data);
  const fileName = `Surat-${data.suratNumber.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
