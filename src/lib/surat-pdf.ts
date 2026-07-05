// Professional Surat Resmi PDF generator - sesuai format gambar 2
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
  // Company settings
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
  const BLUE_DARK: [number, number, number] = [0, 51, 102];
  const TEXT_DARK: [number, number, number] = [64, 64, 64];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];
  const ORANGE: [number, number, number] = [255, 128, 0];

  let y = 15;

  // ===== HEADER =====
  // Logo (left) - orange circle with "H" + blue arc
  const logoSize = (data.logoWidth || 144) / 6; // scale to mm
  const logoX = margin;
  const logoY = y;
  doc.setFillColor(...ORANGE);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
  // Blue arc decoration
  doc.setFillColor(...BLUE_DARK);
  doc.circle(logoX + logoSize * 0.7, logoY + logoSize * 0.7, logoSize * 0.35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("H", logoX + logoSize / 2 - 1, logoY + logoSize / 2 + 1, { align: "center" });

  // Company name (right of logo)
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("hafaragroup", logoX + logoSize + 3, y + 4);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("consulting", logoX + logoSize + 3, y + 9);

  // Contact (right side)
  const contact = data.headerContact || "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570";
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.text(contact, pageWidth - margin, y + 4, { align: "right" });

  // Address (right side)
  if (data.headerAddress1) {
    doc.text(data.headerAddress1, pageWidth - margin, y + 8, { align: "right" });
  }
  if (data.headerAddress2) {
    doc.text(data.headerAddress2, pageWidth - margin, y + 12, { align: "right" });
  }

  y += Math.max(logoSize, 18) + 3;

  // ===== Header border line (thick blue) =====
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  y += 6;

  // ===== Nomor / Lampiran / Perihal =====
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

  // ===== Kepada Yth =====
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

  // ===== Isi Surat =====
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);

  // Date and city line
  doc.text(`${data.city}, ${data.issueDate}`, margin, y);
  y += 6;

  // Body text
  if (data.body) {
    const bodyLines = doc.splitTextToSize(data.body, contentWidth);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 5;
  }
  y += 3;

  // ===== Detail Kegiatan =====
  if (data.includeActivity) {
    y += 2;
    if (data.activityDate) { doc.text(`Tanggal   : ${data.activityDate}`, margin, y); y += 5; }
    if (data.activityLocation) { doc.text(`Lokasi    : ${data.activityLocation}`, margin, y); y += 5; }
    if (data.activityTime) { doc.text(`Waktu     : ${data.activityTime}`, margin, y); y += 5; }
    y += 4;
  }

  // ===== Informasi Pembayaran =====
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

  y += 5;

  // ===== Penutup & Tanda Tangan =====
  // "Hormat kami," (right side)
  doc.setFontSize(10.5);
  doc.text("Hormat kami,", pageWidth - margin - 50, y);
  y += 4;

  // Signature space (for manual signature or digital)
  if (data.companySignature && data.companySignature.startsWith("/uploads/")) {
    // Digital signature would need image loading - skip for now, leave space
    y += 20;
  } else {
    y += 20; // space for manual signature
  }

  // Signatory name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE_DARK);
  doc.text(data.signatoryName, pageWidth - margin - 50, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  doc.text(data.signatoryTitle, pageWidth - margin - 50, y);
  y += 3;

  // Stempel (left of signature - decorative circle)
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.5);
  doc.circle(pageWidth - margin - 65, y - 12, 10, "S");
  doc.setFontSize(5);
  doc.setTextColor(...BLUE_DARK);
  doc.text("PT. HAFARA", pageWidth - margin - 65, y - 14, { align: "center" });
  doc.text("NUSANTARA", pageWidth - margin - 65, y - 10, { align: "center" });

  // ===== Footer line =====
  y = pageHeight - 20;
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
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
