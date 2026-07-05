// Professional PDF document generator with company letterhead (kop surat)
// For SPT Badan supporting documents: Neraca, Laba Rugi, Bukti Potong, SSP
import { jsPDF } from "jspdf";

export const COMPANY_INFO = {
  name: "PT. HAFARA AQIBA NUSANTARA",
  address: "Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur",
  phone: "081324511570",
  email: "Info@hafaragroup.com",
  website: "www.HafaraGroup.com",
  npwp: "01.234.567.8-091.000",
};

// Draw professional company letterhead (kop surat) at top of page
export function drawKopSurat(doc: jsPDF): number {
  const pageWidth = 210;
  let y = 15;

  // Outer border for letterhead
  doc.setDrawColor(37, 99, 235); // blue-600
  doc.setLineWidth(1.5);
  doc.line(15, y - 8, pageWidth - 15, y - 8);
  doc.setLineWidth(0.3);
  doc.line(15, y + 32, pageWidth - 15, y + 32);

  // Logo box (left)
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(18, y - 4, 22, 22, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("HF", 29, y + 9, { align: "center" });

  // Company name (center-left)
  doc.setTextColor(30, 64, 110);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, 45, y + 3);

  // Company details
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.address, 45, y + 9);
  doc.text(`Telp: ${COMPANY_INFO.phone}  |  Email: ${COMPANY_INFO.email}  |  Web: ${COMPANY_INFO.website}`, 45, y + 14);
  doc.text(`NPWP: ${COMPANY_INFO.npwp}`, 45, y + 19);

  return y + 38; // return Y position after letterhead
}

// Draw document title bar
function drawTitleBar(doc: jsPDF, title: string, subtitle: string, y: number): number {
  const pageWidth = 210;
  const margin = 15;

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageWidth / 2, y + 9, { align: "center" });

  return y + 18;
}

// Draw footer with page number and signature line
export function drawFooter(doc: jsPDF, pageContent: string) {
  const pageWidth = 210;
  const pageHeight = 297;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.name, 15, pageHeight - 10);
  doc.text(pageContent, pageWidth - 15, pageHeight - 10, { align: "right" });
}

// Draw signature block (right side)
function drawSignature(doc: jsPDF, y: number, title: string, name: string) {
  const pageWidth = 210;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(title, pageWidth - 60, y, { align: "center" });
  doc.text("Jombang, " + new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }), pageWidth - 60, y + 5, { align: "center" });

  // Signature space
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  for (let i = 0; i < 3; i++) {
    doc.line(pageWidth - 80, y + 12 + i * 5, pageWidth - 40, y + 12 + i * 5);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(name, pageWidth - 60, y + 30, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Direktur Utama", pageWidth - 60, y + 34, { align: "center" });
}

// ============================================================
// 1. LAPORAN NERACA (Balance Sheet) - SPT Badan
// ============================================================
export function generateNeracaPDF(data: {
  asOf: string;
  aset: { kas: number; bank: number; ewallet: number; piutang: number; totalAsetLancar: number; inventaris: number; akumulasiPenyusutan: number; totalAsetTetap: number; totalAset: number };
  kewajiban: { hutang: number; pajakTerutang: number; totalKewajiban: number };
  modal: { labaDitahan: number; totalModal: number };
  totalEkuitas: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;

  let y = drawKopSurat(doc);
  y = drawTitleBar(doc, "LAPORAN NERACA (BALANCE SHEET)", `Per ${data.asOf} - Lampiran SPT Badan`, y);

  y += 3;

  // ASET section
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ASET", margin + 3, y + 5);
  y += 10;

  // Aset Lancar
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  doc.text("Aset Lancar", margin + 3, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawRow(doc, y, "Kas", data.aset.kas);
  y = drawRow(doc, y, "Bank", data.aset.bank);
  y = drawRow(doc, y, "Dompet Digital", data.aset.ewallet);
  y = drawRow(doc, y, "Piutang Usaha", data.aset.piutang);
  y = drawRow(doc, y, "Total Aset Lancar", data.aset.totalAsetLancar, true);
  y += 3;

  // Aset Tetap
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text("Aset Tetap", margin + 3, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawRow(doc, y, "Inventaris & Peralatan", data.aset.inventaris);
  y = drawRow(doc, y, "Akumulasi Penyusutan", -data.aset.akumulasiPenyusutan);
  y = drawRow(doc, y, "Total Aset Tetap", data.aset.totalAsetTetap, true);
  y += 3;
  y = drawRow(doc, y, "TOTAL ASET", data.aset.totalAset, true, true);
  y += 6;

  // KEWAJIBAN
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(180, 83, 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("KEWAJIBAN", margin + 3, y + 5);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawRow(doc, y, "Hutang Usaha", data.kewajiban.hutang);
  y = drawRow(doc, y, "Pajak Terutang", data.kewajiban.pajakTerutang);
  y = drawRow(doc, y, "Total Kewajiban", data.kewajiban.totalKewajiban, true);
  y += 6;

  // MODAL
  doc.setFillColor(219, 234, 254);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("MODAL", margin + 3, y + 5);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawRow(doc, y, "Laba Ditahan", data.modal.labaDitahan);
  y = drawRow(doc, y, "Total Modal", data.modal.totalModal, true);
  y += 3;
  y = drawRow(doc, y, "TOTAL KEWAJIBAN & MODAL", data.totalEkuitas, true, true);

  // Signature
  drawSignature(doc, y + 15, "Hormat kami,", "M. Aqil Baihaqi");
  drawFooter(doc, "Lampiran SPT Badan - Laporan Neraca");

  return doc;
}

// ============================================================
// 2. LAPORAN LABA RUGI (Income Statement) - SPT Badan
//    Uses new format from laba-rugi-pdf.ts
// ============================================================
export function generateLabaRugiPDF(data: {
  periode: string;
  pendapatanItems?: { akun: string; jumlah: number }[];
  biayaItems?: { akun: string; jumlah: number }[];
  pendapatanByCat?: Record<string, number>;
  totalPendapatan: number;
  biayaByCat?: Record<string, number>;
  totalPengeluaran?: number;
  totalBiaya?: number;
  labaKotor?: number;
  labaOperasi?: number;
  labaSebelumPajak?: number;
  pajakEstimasi: number;
  pajakPenghasilan?: number;
  pphBadanRate?: number;
  pajakNote?: string;
  labaBersih: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;

  let y = drawKopSurat(doc);
  y = drawTitleBar(doc, "LAPORAN LABA RUGI (INCOME STATEMENT)", `Periode ${data.periode} - Lampiran SPT Badan`, y);

  y += 3;

  // PENDAPATAN
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN", margin + 3, y + 5);
  y += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const pendapatanItems = data.pendapatanItems || Object.entries(data.pendapatanByCat || {}).map(([k, v]: any) => ({ akun: k, jumlah: v }));
  for (const item of pendapatanItems) {
    y = drawRow(doc, y, item.akun, item.jumlah);
  }
  y = drawRow(doc, y, "Total Pendapatan", data.totalPendapatan, true);
  y += 6;

  // BEBAN
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BEBAN OPERASIONAL", margin + 3, y + 5);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const biayaItems = data.biayaItems || Object.entries(data.biayaByCat || {}).map(([k, v]: any) => ({ akun: k, jumlah: v }));
  for (const item of biayaItems) {
    y = drawRow(doc, y, item.akun, -item.jumlah, false, false, true);
  }
  const totalBiaya = data.totalBiaya ?? data.totalPengeluaran ?? 0;
  y = drawRow(doc, y, "Total Beban", -totalBiaya, true, false, true);
  y += 6;

  // RINGKASAN
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN LABA RUGI", margin + 3, y + 5);
  y += 10;

  const labaSebelumPajak = data.labaSebelumPajak ?? data.labaOperasi ?? 0;
  const pajak = data.pajakPenghasilan ?? data.pajakEstimasi;
  y = drawRow(doc, y, "Laba Sebelum Pajak", labaSebelumPajak, true);
  y = drawRow(doc, y, `Pajak Penghasilan Badan (${data.pphBadanRate ?? 22}%)`, -pajak, false, false, true);
  y += 3;
  y = drawRow(doc, y, "LABA BERSIH SETELAH PAJAK", data.labaBersih, true, true);

  if (data.pajakNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("* " + data.pajakNote, margin + 3, y + 2);
  }

  drawSignature(doc, y + 10, "Hormat kami,", "M. Aqil Baihaqi");
  drawFooter(doc, "Lampiran SPT Badan - Laporan Laba Rugi");

  return doc;
}

// ============================================================
// 3. BUKTI PEMOTONGAN PPh (Tax Withholding Proof)
// ============================================================
export function generateBuktiPotongPDF(data: {
  formNumber: string;
  taxType: string; // PPh 23, PPh 22, PPh 4(2)
  masaPajak: string;
  tahun: string;
  // Pemotong (withholding party)
  pemotongName: string;
  pemotongNpwp: string;
  // Wajib Pajak (subject)
  wpName: string;
  wpNpwp: string;
  wpAddress: string;
  // Transaction
  jenisPenghasilan: string;
  jumlahBruto: number;
  tarif: number; // percentage
  pphDipotong: number;
  tanggalPotong: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;

  let y = drawKopSurat(doc);
  y = drawTitleBar(doc, `BUKTI PEMOTONGAN PAJAK - ${data.taxType}`, `Masa Pajak ${data.masaPajak} ${data.tahun}`, y);

  y += 3;

  // Form number box
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, 60, 8, 1, 1);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`No: ${data.formNumber}`, margin + 3, y + 5);
  doc.setLineWidth(0.2);

  y += 13;

  // Pemotong section
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("A. IDENTITAS PEMOTONG (Pihak yang memotong pajak)", margin + 3, y + 4);
  y += 9;

  y = drawFieldRow(doc, y, "Nama", data.pemotongName);
  y = drawFieldRow(doc, y, "NPWP", data.pemotongNpwp);
  y += 3;

  // Wajib Pajak section
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text("B. IDENTITAS WAJIB PAJAK (Pihak yang dipotong pajak)", margin + 3, y + 4);
  y += 9;

  y = drawFieldRow(doc, y, "Nama", data.wpName);
  y = drawFieldRow(doc, y, "NPWP", data.wpNpwp);
  y = drawFieldRow(doc, y, "Alamat", data.wpAddress);
  y += 3;

  // Pemotongan section
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text("C. RINCIAN PEMOTONGAN PAJAK", margin + 3, y + 4);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawFieldRow(doc, y, "Jenis Penghasilan", data.jenisPenghasilan);
  y = drawFieldRow(doc, y, "Tanggal Potong", data.tanggalPotong);
  y += 2;

  // Amount table
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 1, 1);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("URAIAN", margin + 3, y + 5);
  doc.text("JUMLAH (Rp)", pageWidth - margin - 3, y + 5, { align: "right" });
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("Jumlah Penghasilan Bruto", margin + 3, y + 12);
  doc.text(data.jumlahBruto.toLocaleString("id-ID"), pageWidth - margin - 3, y + 12, { align: "right" });

  doc.text(`Tarif PPh (${data.tarif}%)`, margin + 3, y + 17);
  doc.text(`${data.tarif}%`, pageWidth - margin - 3, y + 17, { align: "right" });

  doc.line(margin, y + 19, pageWidth - margin, y + 19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("PPh YANG DIPOTONG", margin + 3, y + 23);
  doc.text(data.pphDipotong.toLocaleString("id-ID"), pageWidth - margin - 3, y + 23, { align: "right" });

  y += 30;

  // Note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Catatan: Bukti potong ini digunakan sebagai kredit pajak dalam pelaporan SPT Tahunan PPh Badan.", margin, y);

  // Signature
  drawSignature(doc, y + 10, "Pemotong Pajak,", data.pemotongName);
  drawFooter(doc, `Lampiran SPT Badan - Bukti Potong ${data.taxType}`);

  return doc;
}

// ============================================================
// 4. SURAT SETORAN PAJAK (SSP) - Tax Payment Proof
// ============================================================
export function generateSSPPDF(data: {
  sspNumber: string;
  taxType: string;
  masaPajak: string;
  tahun: string;
  // Wajib Pajak
  wpName: string;
  wpNpwp: string;
  wpAddress: string;
  // Setoran
  jenisPajak: string;
  kodeAkun: string;
  kodeJenisSetoran: string;
  jumlahSetoran: number;
  tanggalSetor: string;
  bankPenerima: string;
  ntpn: string; // Nomor Transaksi Penerimaan Negara
  status: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = 210;

  let y = drawKopSurat(doc);
  y = drawTitleBar(doc, "SURAT SETORAN PAJAK (SSP)", `Masa Pajak ${data.masaPajak} Tahun ${data.tahun}`, y);

  y += 3;

  // SSP Number + status
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, 70, 8, 1, 1);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`No. SSP: ${data.sspNumber}`, margin + 3, y + 5);

  // Status box
  doc.setFillColor(data.status === "PAID" || data.status === "LUNAS" ? 220 : 254, data.status === "PAID" || data.status === "LUNAS" ? 252 : 243, data.status === "PAID" || data.status === "LUNAS" ? 231 : 199);
  doc.roundedRect(pageWidth - margin - 40, y, 40, 8, 1, 1, "F");
  doc.setTextColor(data.status === "PAID" || data.status === "LUNAS" ? 22 : 180, data.status === "PAID" || data.status === "LUNAS" ? 101 : 83, data.status === "PAID" || data.status === "LUNAS" ? 52 : 9);
  doc.setFontSize(9);
  doc.text(data.status.toUpperCase(), pageWidth - margin - 20, y + 5, { align: "center" });
  doc.setLineWidth(0.2);
  y += 13;

  // Wajib Pajak
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("A. IDENTITAS WAJIB PAJAK", margin + 3, y + 4);
  y += 9;

  y = drawFieldRow(doc, y, "Nama Wajib Pajak", data.wpName);
  y = drawFieldRow(doc, y, "NPWP", data.wpNpwp);
  y = drawFieldRow(doc, y, "Alamat", data.wpAddress);
  y += 3;

  // Detail Setoran
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text("B. RINCIAN SETORAN PAJAK", margin + 3, y + 4);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  y = drawFieldRow(doc, y, "Jenis Pajak", data.jenisPajak);
  y = drawFieldRow(doc, y, "Kode Akun", data.kodeAkun);
  y = drawFieldRow(doc, y, "Kode Jenis Setoran", data.kodeJenisSetoran);
  y = drawFieldRow(doc, y, "Masa Pajak", `${data.masaPajak} ${data.tahun}`);
  y = drawFieldRow(doc, y, "Tanggal Setor", data.tanggalSetor);
  y = drawFieldRow(doc, y, "Bank Penerima", data.bankPenerima);
  y = drawFieldRow(doc, y, "NTPN (No. Transaksi Penerimaan Negara)", data.ntpn);
  y += 3;

  // Amount box
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2);
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, 70, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("JUMLAH SETORAN", margin + 3, y + 6);
  doc.text("PAJAK (Rp)", margin + 3, y + 11);

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.text(`Rp ${data.jumlahSetoran.toLocaleString("id-ID")}`, pageWidth - margin - 3, y + 9, { align: "right" });
  doc.setLineWidth(0.2);

  y += 20;

  // Note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Catatan: SSP ini merupakan bukti pembayaran pajak yang dapat digunakan sebagai kredit pajak dalam SPT Tahunan.", margin, y);
  doc.text("Wajib dilampirkan jika SPT berstatus Kurang Bayar (PPh Pasal 29).", margin, y + 4);

  drawSignature(doc, y + 12, "Wajib Pajak,", data.wpName);
  drawFooter(doc, "Lampiran SPT Badan - Surat Setoran Pajak (SSP)");

  return doc;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatRupiah(n: number): string {
  return "Rp " + Math.abs(n).toLocaleString("id-ID");
}

function drawRow(doc: jsPDF, y: number, label: string, value: number, bold?: boolean, highlight?: boolean, isNegative?: boolean): number {
  const margin = 15;
  const pageWidth = 210;

  if (highlight) {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 7, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
  } else if (bold) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 7, 1, 1, "F");
    doc.setTextColor(30, 64, 110);
  } else {
    doc.setTextColor(51, 65, 85);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", bold || highlight ? "bold" : "normal");
  doc.text(label, margin + 3, y);

  const valText = (isNegative ? "(-) " : "") + formatRupiah(value);
  doc.setTextColor(value < 0 && !isNegative ? (highlight ? 255 : 220) : highlight ? 255 : bold ? 30 : 51, value < 0 && !isNegative ? (highlight ? 255 : 38) : highlight ? 255 : bold ? 64 : 65, value < 0 && !isNegative ? (highlight ? 255 : 38) : highlight ? 255 : bold ? 110 : 85);
  if (!isNegative && value < 0) {
    doc.setTextColor(highlight ? 255 : 220, highlight ? 255 : 38, highlight ? 255 : 38);
  }
  doc.text(valText, pageWidth - margin - 3, y, { align: "right" });

  return y + 5.5;
}

function drawFieldRow(doc: jsPDF, y: number, label: string, value: string): number {
  const margin = 15;
  const pageWidth = 210;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(label, margin + 3, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(": " + value, margin + 50, y);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);

  return y + 6;
}
