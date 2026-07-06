// Slip Gaji PDF Generator - PROFESSIONAL CLEAN design
// All design comes from DocumentLayout settings. No overlapping elements.
import { jsPDF } from "jspdf";
import { hexToRgb, type LogoImageData } from "./layout-helper";

export interface SlipGajiData {
  employeeName: string;
  nik: string;
  jabatan: string;
  periode: string;
  bankName: string;
  bankAccount: string;
  accountName: string;
  gajiPokok: number;
  tunjanganBonus: number;
  potongan: number;
  note: string;
  status: string;
  paidAt: string | null;
  logoImageData?: LogoImageData | null;
  layout?: any;
}

function formatRupiah(n: number): string {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export function generateSlipGajiPDF(data: SlipGajiData): jsPDF {
  const s = data.layout || {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ===== Colors from layout settings =====
  const headerBg: [number, number, number] = hexToRgb(s.headerBgColor || "#1e3a8a");
  const accentLine: [number, number, number] = hexToRgb(s.accentLineColor || "#2563eb");
  const footerBg: [number, number, number] = hexToRgb(s.footerBgColor || "#1e3a8a");
  const earningsColor: [number, number, number] = hexToRgb(s.earningsColor || "#16a34a");
  const deductionsColor: [number, number, number] = hexToRgb(s.deductionsColor || "#ef4444");
  const sectionHeaderBg: [number, number, number] = hexToRgb(s.sectionHeaderBgColor || "#eff6ff");
  const sectionHeaderText: [number, number, number] = hexToRgb(s.sectionHeaderTextColor || "#1e3a8a");
  const netSalaryBg: [number, number, number] = hexToRgb(s.netSalaryBgColor || "#1e3a8a");
  const docTitleColor: [number, number, number] = hexToRgb(s.docTitleColor || "#1e3a8a");
  const logoColor: [number, number, number] = hexToRgb(s.logoColor || "#1e3a8a");
  const bodyText: [number, number, number] = hexToRgb(s.bodyTextColor || "#334155");
  const footerTextColor: [number, number, number] = hexToRgb(s.footerTextColor || "#ffffff");

  const BORDER: [number, number, number] = [226, 232, 240];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];

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

    // Company info (right, white text) — positioned dynamically based on headerHeight
    const infoX = pageWidth - margin;
    const nameY = headerHeight * 0.3;
    const addrY = headerHeight * 0.55;
    const contactY = headerHeight * 0.8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.text(companyName, infoX, nameY, { align: "right" });

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 230, 245);
    doc.text(companyAddress, infoX, addrY, { align: "right" });

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(180, 200, 230);
    doc.text(companyContact, infoX, contactY, { align: "right" });

    y = headerHeight + 8; // 8mm gap after header for clean spacing
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

  // ===== DOCUMENT TITLE (in body, clean centered title) =====
  if (s.docTitleShow !== false) {
    const ta = s.docTitlePosition || "center";
    const tx = ta === "right" ? pageWidth - margin : ta === "center" ? pageWidth / 2 : margin;
    doc.setFontSize(s.docTitleFontSize || 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    doc.text(s.docTitleText || "SLIP GAJI", tx, y + 2, ta === "right" ? { align: "right" } : ta === "center" ? { align: "center" } : {});
    // Subtitle: periode
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Periode: ${data.periode}`, tx, y + 7, ta === "right" ? { align: "right" } : ta === "center" ? { align: "center" } : {});
    y += 12;
  }

  // ===== EMPLOYEE INFO CARD (clean rounded card) =====
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "S");
  // Header bar
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, "F");
  doc.rect(margin, y + 3, contentWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMASI KARYAWAN", margin + 4, y + 4);

  // Info grid (2 columns)
  const col1X = margin + 4;
  const col2X = margin + contentWidth / 2 + 4;
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Nama", col1X, y + 10);
  doc.text("Jabatan", col1X, y + 15);
  doc.text("Periode", col2X, y + 10);
  doc.text("Bank", col2X, y + 15);

  doc.setTextColor(...bodyText);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, col1X + 22, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text(data.jabatan || "-", col1X + 22, y + 15);
  doc.text(data.periode, col2X + 22, y + 10);
  doc.text(data.bankName ? `${data.bankName} - ${data.bankAccount}` : "Transfer Bank", col2X + 22, y + 15);

  y += 25;

  // ===== EARNINGS & DEDUCTIONS (side-by-side clean cards) =====
  const colWidth = (contentWidth - 5) / 2;
  const cardHeight = 38;

  // === EARNINGS (left) ===
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, colWidth, cardHeight, 2, 2, "S");
  // Colored header
  doc.setFillColor(...earningsColor);
  doc.roundedRect(margin, y, colWidth, 7, 2, 2, "F");
  doc.rect(margin, y + 4, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN", margin + 4, y + 5);

  // Items
  doc.setTextColor(...bodyText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gaji Pokok", margin + 4, y + 13);
  doc.text(formatRupiah(data.gajiPokok), margin + colWidth - 4, y + 13, { align: "right" });
  doc.text("Tunjangan & Bonus", margin + 4, y + 19);
  doc.text(formatRupiah(data.tunjanganBonus), margin + colWidth - 4, y + 19, { align: "right" });

  // Separator
  doc.setDrawColor(...BORDER);
  doc.line(margin + 2, y + 24, margin + colWidth - 2, y + 24);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...earningsColor);
  doc.text("Total Pendapatan", margin + 4, y + 31);
  doc.text(formatRupiah(data.gajiPokok + data.tunjanganBonus), margin + colWidth - 4, y + 31, { align: "right" });

  // === DEDUCTIONS (right) ===
  const rightX = margin + colWidth + 5;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(rightX, y, colWidth, cardHeight, 2, 2, "S");
  doc.setFillColor(...deductionsColor);
  doc.roundedRect(rightX, y, colWidth, 7, 2, 2, "F");
  doc.rect(rightX, y + 4, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("POTONGAN", rightX + 4, y + 5);

  doc.setTextColor(...bodyText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Potongan Keterlambatan", rightX + 4, y + 13);
  doc.text("BPJS / Absensi", rightX + 4, y + 19);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 19, { align: "right" });

  doc.setDrawColor(...BORDER);
  doc.line(rightX + 2, y + 24, rightX + colWidth - 2, y + 24);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...deductionsColor);
  doc.text("Total Potongan", rightX + 4, y + 31);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 31, { align: "right" });

  y += cardHeight + 6;

  // ===== NET SALARY (full-width colored box) =====
  const netSalary = data.gajiPokok + data.tunjanganBonus - data.potongan;
  doc.setFillColor(...netSalaryBg);
  doc.roundedRect(margin, y, contentWidth, 13, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("GAJI BERSIH DITERIMA", margin + 5, y + 6);
  doc.setFontSize(6.5);
  doc.text("(Take Home Pay)", margin + 5, y + 10);
  doc.setFontSize(s.netSalaryFontSize || 13);
  doc.setFont("helvetica", "bold");
  doc.text(formatRupiah(netSalary), pageWidth - margin - 5, y + 8, { align: "right" });
  y += 18;

  // ===== NOTE (clean card) =====
  if (data.note) {
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "S");
    doc.setFillColor(...sectionHeaderBg);
    doc.roundedRect(margin, y, 25, 10, 2, 2, "F");
    doc.rect(margin + 12, y, 13, 10, "F");
    doc.setTextColor(...sectionHeaderText);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CATATAN", margin + 4, y + 6);
    doc.setTextColor(...bodyText);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const splitNote = doc.splitTextToSize(data.note, contentWidth - 31);
    doc.text(splitNote.slice(0, 2), margin + 29, y + 6);
    y += 14;
  }

  // ===== STATUS PEMBAYARAN =====
  const isPaid = data.status === "PAID";
  const statusLabel = isPaid ? "LUNAS / PAID" : data.status === "APPROVED" ? "DISETUJUI" : "DRAFT";
  const statusBg: [number, number, number] = isPaid ? [220, 252, 231] : [254, 249, 195];
  const statusTxt: [number, number, number] = isPaid ? [22, 101, 52] : [161, 98, 7];

  doc.setFillColor(...statusBg);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setTextColor(...statusTxt);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS PEMBAYARAN: ${statusLabel}`, margin + 5, y + 5.5);
  if (isPaid && data.paidAt) {
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal: ${data.paidAt}`, pageWidth - margin - 5, y + 5.5, { align: "right" });
  }
  y += 13;

  // ===== SIGNATURE SECTION (3 columns, clean) =====
  const signWidth = (contentWidth - 8) / 3;
  const signHeight = 24;

  // Penerima Gaji
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(margin, y, signWidth, 6, 2, 2, "F");
  doc.rect(margin, y + 3, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("PENERIMA GAJI", margin + 3, y + 4);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", margin + 3, y + 12);
  // Dashed line for signature
  doc.setDrawColor(...BORDER);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin + 3, y + 18, margin + signWidth - 3, y + 18);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(...bodyText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, margin + 3, y + 22);

  // Owner
  const ownerX = margin + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(ownerX, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(ownerX, y, signWidth, 6, 2, 2, "F");
  doc.rect(ownerX, y + 3, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("OWNER PT. HAN", ownerX + 3, y + 4);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", ownerX + 3, y + 12);
  doc.setDrawColor(...BORDER);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(ownerX + 3, y + 18, ownerX + signWidth - 3, y + 18);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(...bodyText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("M. Aqil Baihaqi", ownerX + 3, y + 22);

  // HRD / Finance
  const hrdX = ownerX + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(hrdX, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(hrdX, y, signWidth, 6, 2, 2, "F");
  doc.rect(hrdX, y + 3, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("HRD / FINANCE", hrdX + 3, y + 4);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", hrdX + 3, y + 12);
  doc.setDrawColor(...BORDER);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(hrdX + 3, y + 18, hrdX + signWidth - 3, y + 18);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(...bodyText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Nur Hidayah", hrdX + 3, y + 22);

  y += signHeight + 4;

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

export function downloadSlipGajiPDF(data: SlipGajiData) {
  const doc = generateSlipGajiPDF(data);
  const fileName = `Slip-Gaji-${data.employeeName.replace(/\s+/g, "-")}-${data.periode.replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
}
