// Slip Gaji PDF Generator - CLEAN implementation using ONLY DocumentLayout settings
// Old design elements (hardcoded logo/title in header) have been cleared.
// All design comes from Layout Dokumen settings, matching LivePreview exactly.
import { jsPDF } from "jspdf";
import { hexToRgb, shadeColor } from "./layout-helper";

export interface SlipGajiData {
  // Employee
  employeeName: string;
  nik: string;
  jabatan: string;
  // Payroll
  periode: string;
  bankName: string;
  bankAccount: string;
  accountName: string;
  // Earnings
  gajiPokok: number;
  tunjanganBonus: number;
  // Deductions
  potongan: number;
  // Notes & status
  note: string;
  status: string;
  paidAt: string | null;
  // Layout settings (from DocumentLayout) - ALL design comes from here
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

  // ===== ALL colors from layout settings =====
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
  const bodyTextColor: [number, number, number] = hexToRgb(s.bodyTextColor || "#334155");
  const footerTextColor: [number, number, number] = hexToRgb(s.footerTextColor || "#ffffff");
  const companyNameColor: [number, number, number] = hexToRgb(s.companyNameColor || "#1e3a8a");
  const companyAddrColor: [number, number, number] = hexToRgb(s.companyAddressColor || "#64748b");
  const companyContactColor: [number, number, number] = hexToRgb(s.companyContactColor || "#94a3b8");

  const BORDER: [number, number, number] = [203, 213, 225];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];

  const headerHeight = s.headerHeight || 32;
  const infoPos = s.companyInfoPosition || "above";
  const headerGradient = s.headerGradient !== false;
  const logoSize = s.logoSize || 16;
  const accentLineHeight = s.accentLineHeight || 1.5;

  // Company info text - ALWAYS from layout settings
  const companyNameText = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddressText = s.companyAddressText || "";
  const companyContactText = s.companyContactText || "";

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

    doc.setFontSize(s.companyNameFontSize || 13);
    doc.setFont("helvetica", s.companyNameBold ? "bold" : "normal");
    doc.setTextColor(...nameC);
    doc.text(companyNameText, nameX, y + 4, nameAlign === "right" ? { align: "right" } : nameAlign === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...addrC);
    doc.text(companyAddressText, addrX, y + 8, addrAlign === "right" ? { align: "right" } : addrAlign === "center" ? { align: "center" } : {});

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(...contactC);
    doc.text(companyContactText, contactX, y + 12, contactAlign === "right" ? { align: "right" } : contactAlign === "center" ? { align: "center" } : {});
  };

  // ===== 1. INFO ABOVE (on white paper, above navy box) =====
  if (infoPos === "above") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 2. NAVY HEADER BOX (decorative, with optional info inside) =====
  // CLEARED: No longer draws logo or "SLIP GAJI" title inside header when info is above/below
  // The document title now appears in the BODY section, matching LivePreview exactly
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

  // ===== 4. INFO BELOW (on white paper, below navy box + accent line) =====
  if (infoPos === "below") {
    drawLogo(margin, y);
    drawCompanyInfo(false);
    y += 16;
  }

  // ===== 5. DOCUMENT TITLE (in body, NOT in header - matches LivePreview) =====
  if (s.docTitleShow !== false) {
    doc.setFontSize(s.docTitleFontSize || 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...docTitleColor);
    const ta = s.docTitlePosition || "center";
    const tx = ta === "right" ? pageWidth - margin : ta === "center" ? pageWidth / 2 : margin;
    doc.text(s.docTitleText || "SLIP GAJI", tx, y, ta === "right" ? { align: "right" } : ta === "center" ? { align: "center" } : {});
    y += 8;
  }

  // ===== 6. EMPLOYEE INFO SECTION (modern card) =====
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "S");
  // Section header bar
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, "F");
  doc.setFillColor(...sectionHeaderBg);
  doc.rect(margin, y + 3, contentWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMASI KARYAWAN", margin + 4, y + 4);

  // Info grid (2 columns)
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const col1X = margin + 4;
  const col2X = margin + contentWidth / 2 + 4;
  doc.text(`Nama:`, col1X, y + 11);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, col1X + 16, y + 11);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode:`, col2X, y + 11);
  doc.setFont("helvetica", "bold");
  doc.text(data.periode, col2X + 16, y + 11);
  doc.setFont("helvetica", "normal");
  doc.text(`Jabatan:`, col1X, y + 17);
  doc.text(data.jabatan || "-", col1X + 16, y + 17);
  doc.text(`Bank:`, col2X, y + 17);
  doc.text(data.bankName ? `${data.bankName} - ${data.bankAccount}` : "Transfer Bank", col2X + 16, y + 17);

  y += 27;

  // ===== 7. EARNINGS & DEDUCTIONS (side-by-side modern cards) =====
  const colWidth = (contentWidth - 4) / 2;
  const colHeight = 36;

  // === EARNINGS (left) ===
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, colWidth, colHeight, 2, 2, "S");
  // Colored header
  doc.setFillColor(...earningsColor);
  doc.roundedRect(margin, y, colWidth, 6, 2, 2, "F");
  doc.rect(margin, y + 3, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN", margin + 4, y + 4);

  // Items
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gaji Pokok", margin + 4, y + 12);
  doc.text(formatRupiah(data.gajiPokok), margin + colWidth - 4, y + 12, { align: "right" });
  doc.text("Tunjangan & Bonus", margin + 4, y + 18);
  doc.text(formatRupiah(data.tunjanganBonus), margin + colWidth - 4, y + 18, { align: "right" });
  // Separator
  doc.setDrawColor(...BORDER);
  doc.line(margin + 2, y + 22, margin + colWidth - 2, y + 22);
  // Total
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...earningsColor);
  doc.text("Total Pendapatan", margin + 4, y + 30);
  doc.text(formatRupiah(data.gajiPokok + data.tunjanganBonus), margin + colWidth - 4, y + 30, { align: "right" });

  // === DEDUCTIONS (right) ===
  const rightX = margin + colWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(rightX, y, colWidth, colHeight, 2, 2, "S");
  // Colored header
  doc.setFillColor(...deductionsColor);
  doc.roundedRect(rightX, y, colWidth, 6, 2, 2, "F");
  doc.rect(rightX, y + 3, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("POTONGAN", rightX + 4, y + 4);

  // Items
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Potongan Keterlambatan", rightX + 4, y + 12);
  doc.text("BPJS / Absensi", rightX + 4, y + 18);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 18, { align: "right" });
  // Separator
  doc.setDrawColor(...BORDER);
  doc.line(rightX + 2, y + 22, rightX + colWidth - 2, y + 22);
  // Total
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...deductionsColor);
  doc.text("Total Potongan", rightX + 4, y + 30);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 30, { align: "right" });

  y += colHeight + 5;

  // ===== 8. NET SALARY (full-width colored box) =====
  const netSalary = data.gajiPokok + data.tunjanganBonus - data.potongan;
  doc.setFillColor(...netSalaryBg);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("GAJI BERSIH DITERIMA", margin + 5, y + 5);
  doc.setFontSize(7);
  doc.text("(Take Home Pay)", margin + 5, y + 9);
  doc.setFontSize(s.netSalaryFontSize || 13);
  doc.setFont("helvetica", "bold");
  doc.text(formatRupiah(netSalary), pageWidth - margin - 5, y + 7, { align: "right" });
  y += 17;

  // ===== 9. NOTE (modern card) =====
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(margin, y, 28, 10, 2, 2, "F");
  doc.rect(margin + 14, y, 14, 10, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CATATAN", margin + 4, y + 6);
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const noteText = data.note || "Gaji bulanan resmi ditransfer secara otomatis.";
  const splitNote = doc.splitTextToSize(noteText, contentWidth - 34);
  doc.text(splitNote.slice(0, 2), margin + 32, y + 6);
  y += 15;

  // ===== 10. STATUS PEMBAYARAN =====
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
  y += 14;

  // ===== 11. SIGNATURE SECTION (3 columns: Penerima, Owner, HRD) =====
  const signWidth = (contentWidth - 8) / 3;
  const signHeight = 24;

  // Penerima Gaji
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(margin, y, signWidth, 5, 2, 2, "F");
  doc.rect(margin, y + 2, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("PENERIMA GAJI", margin + 3, y + 3.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", margin + 3, y + 11);
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, margin + 3, y + 19);

  // Owner
  const ownerX = margin + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(ownerX, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(ownerX, y, signWidth, 5, 2, 2, "F");
  doc.rect(ownerX, y + 2, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("OWNER PT. HAN", ownerX + 3, y + 3.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", ownerX + 3, y + 11);
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("M. Aqil Baihaqi", ownerX + 3, y + 19);

  // HRD / Finance
  const hrdX = ownerX + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(hrdX, y, signWidth, signHeight, 2, 2, "S");
  doc.setFillColor(...sectionHeaderBg);
  doc.roundedRect(hrdX, y, signWidth, 5, 2, 2, "F");
  doc.rect(hrdX, y + 2, signWidth, 3, "F");
  doc.setTextColor(...sectionHeaderText);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("HRD / FINANCE", hrdX + 3, y + 3.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", hrdX + 3, y + 11);
  doc.setTextColor(...bodyTextColor);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Nur Hidayah", hrdX + 3, y + 19);

  y += signHeight + 4;

  // ===== 12. FOOTER (from layout settings) =====
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
