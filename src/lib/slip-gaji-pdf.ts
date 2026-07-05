// Slip Gaji PDF Generator - sesuai template PT. HAFARA AIQBA NUSANTARA
import { jsPDF } from "jspdf";

export interface SlipGajiData {
  // Company
  companyName: string;
  companyEmail: string;
  companyWebsite: string;
  companyPhone: string;
  companyAddress: string;
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
  status: string; // LUNAS / PAID / DRAFT
  paidAt: string | null;
}

function formatRupiah(n: number): string {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export function generateSlipGajiPDF(data: SlipGajiData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Colors
  const BLUE_DARK: [number, number, number] = [30, 64, 110]; // blue-900-ish
  const BLUE: [number, number, number] = [37, 99, 235]; // blue-600
  const GREEN: [number, number, number] = [22, 163, 74];
  const RED: [number, number, number] = [220, 38, 38];
  const LIGHT_BG: [number, number, number] = [239, 246, 255]; // blue-50
  const BORDER: [number, number, number] = [203, 213, 225]; // slate-300
  const TEXT_DARK: [number, number, number] = [30, 41, 59];
  const TEXT_MUTED: [number, number, number] = [100, 116, 139];

  // ===== HEADER (Company info bar) =====
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Logo circle (left)
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 10, 16, 8, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("HF", margin + 10, 18, { align: "center" });

  // Company name (left)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName, margin + 22, 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(data.companyAddress, margin + 22, 17);
  doc.text(`Email: ${data.companyEmail}  |  Web: ${data.companyWebsite}`, margin + 22, 21);
  doc.text(`Telp: ${data.companyPhone}`, margin + 22, 25);

  // SLIP GAJI title (right side of header)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SLIP GAJI", pageWidth - margin, 20, { align: "right" });

  y = 40;

  // ===== EMPLOYEE INFO SECTION =====
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, "S");
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, 45, 30, 2, 2, "F");

  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("KARYAWAN", margin + 4, y + 6);

  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Nama     : ${data.employeeName}`, margin + 50, y + 6);
  doc.text(`NIK       : ${data.nik || "-"}`, margin + 50, y + 12);
  doc.text(`Jabatan  : ${data.jabatan || "-"}`, margin + 50, y + 18);

  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.text("Info Karyawan", margin + 4, y + 27);

  y += 35;

  // ===== PERIODE & TRANSFER SECTION =====
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "S");
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, 45, 24, 2, 2, "F");

  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("PERIODE", margin + 4, y + 6);

  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode Gaji    : ${data.periode}`, margin + 50, y + 6);
  doc.text(`Metode Transfer : ${data.bankName ? data.bankName + " - " + data.bankAccount : "Transfer Bank"}`, margin + 50, y + 12);
  doc.text(`Atas Nama        : ${data.accountName || data.employeeName}`, margin + 50, y + 18);

  y += 29;

  // ===== PENDAPATAN & POTONGAN (two columns) =====
  const colWidth = (contentWidth - 4) / 2;
  const colHeight = 42;

  // === PENDAPATAN (left column) ===
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, colWidth, colHeight, 2, 2, "S");

  // Header with green dot
  doc.setFillColor(...GREEN);
  doc.circle(margin + 5, y + 5, 1.8, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN (EARNINGS)", margin + 9, y + 6);

  // Separator line
  doc.setDrawColor(...BORDER);
  doc.line(margin + 2, y + 9, margin + colWidth - 2, y + 9);

  // Gaji Pokok
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gaji Pokok", margin + 4, y + 14);
  doc.text(formatRupiah(data.gajiPokok), margin + colWidth - 4, y + 14, { align: "right" });

  // Tunjangan & Bonus
  doc.text("Tunjangan & Bonus", margin + 4, y + 20);
  doc.text(formatRupiah(data.tunjanganBonus), margin + colWidth - 4, y + 20, { align: "right" });

  // Separator
  doc.setDrawColor(...BORDER);
  doc.line(margin + 2, y + 24, margin + colWidth - 2, y + 24);

  // Total Pendapatan
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Total Pendapatan", margin + 4, y + 30);
  doc.text(formatRupiah(data.gajiPokok + data.tunjanganBonus), margin + colWidth - 4, y + 30, { align: "right" });

  // === POTONGAN (right column) ===
  const rightX = margin + colWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(rightX, y, colWidth, colHeight, 2, 2, "S");

  // Header with red dot
  doc.setFillColor(...RED);
  doc.circle(rightX + 5, y + 5, 1.8, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("POTONGAN (DEDUCTIONS)", rightX + 9, y + 6);

  doc.setDrawColor(...BORDER);
  doc.line(rightX + 2, y + 9, rightX + colWidth - 2, y + 9);

  // Potongan
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Potongan Keterlambatan", rightX + 4, y + 14);
  doc.text("BPJS / Absensi", rightX + 4, y + 19);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 19, { align: "right" });

  doc.setDrawColor(...BORDER);
  doc.line(rightX + 2, y + 24, rightX + colWidth - 2, y + 24);

  // Total Potongan
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...RED);
  doc.text("Total Potongan", rightX + 4, y + 30);
  doc.text(formatRupiah(data.potongan), rightX + colWidth - 4, y + 30, { align: "right" });

  y += colHeight + 5;

  // ===== CATATAN INTERNAL =====
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "S");
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, 45, 14, 2, 2, "F");

  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CATATAN", margin + 4, y + 5);

  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const noteText = data.note || "Gaji bulanan resmi ditransfer secara otomatis.";
  const splitNote = doc.splitTextToSize(noteText, contentWidth - 52);
  doc.text(splitNote.slice(0, 2), margin + 50, y + 5);

  y += 19;

  // ===== TAKE HOME PAY =====
  const netSalary = data.gajiPokok + data.tunjanganBonus - data.potongan;
  doc.setFillColor(...BLUE_DARK);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TAKE HOME PAY (GAJI BERSIH)", margin + 5, y + 9);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(formatRupiah(netSalary), pageWidth - margin - 5, y + 9, { align: "right" });

  y += 20;

  // ===== STATUS PEMBAYARAN =====
  const isPaid = data.status === "PAID";
  const statusLabel = isPaid ? "LUNAS / PAID" : data.status === "APPROVED" ? "DISETUJUI" : "DRAFT";
  const statusColor: [number, number, number] = isPaid ? [220, 252, 231] : [254, 249, 195];
  const statusText: [number, number, number] = isPaid ? [22, 101, 52] : [161, 98, 7];

  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
  doc.setTextColor(...statusText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS PEMBAYARAN: ${statusLabel}`, margin + 5, y + 6.5);
  if (isPaid && data.paidAt) {
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal: ${data.paidAt}`, pageWidth - margin - 5, y + 6.5, { align: "right" });
  }

  y += 16;

  // ===== TANDA TANGAN =====
  const signWidth = (contentWidth - 8) / 3;

  // Penerima Gaji
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, signWidth, 26, 2, 2, "S");
  doc.setFillColor(251, 146, 60); // orange-400
  doc.circle(margin + 6, y + 7, 2.5, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Penerima Gaji", margin + 10, y + 8);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", margin + 4, y + 14);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.employeeName, margin + 4, y + 22);

  // Owner
  const ownerX = margin + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(ownerX, y, signWidth, 26, 2, 2, "S");
  doc.setFillColor(251, 146, 60);
  doc.circle(ownerX + 6, y + 7, 2.5, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Owner PT. HAN", ownerX + 10, y + 8);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", ownerX + 4, y + 14);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("M. Aqil Baihaqi", ownerX + 4, y + 22);

  // HRD / Finance
  const hrdX = ownerX + signWidth + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(hrdX, y, signWidth, 26, 2, 2, "S");
  doc.setFillColor(251, 146, 60);
  doc.circle(hrdX + 6, y + 7, 2.5, "F");
  doc.setTextColor(...BLUE_DARK);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("HRD / Finance", hrdX + 10, y + 8);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda tangan:", hrdX + 4, y + 14);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Nur Hidayah", hrdX + 4, y + 22);

  y += 32;

  // ===== FOOTER =====
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Terima kasih atas dedikasi dan kerja keras Anda untuk PT. HAFARA AIQBA NUSANTARA", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Page number
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, margin, pageHeight - 14);

  return doc;
}

export function downloadSlipGajiPDF(data: SlipGajiData) {
  const doc = generateSlipGajiPDF(data);
  const fileName = `Slip-Gaji-${data.employeeName.replace(/\s+/g, "-")}-${data.periode.replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
}
