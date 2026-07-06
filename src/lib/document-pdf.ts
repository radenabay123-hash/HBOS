// Unified Document PDF Generator — reads element positions from Layout Dokumen
// This guarantees preview = download because both use the same element data
import { jsPDF } from "jspdf";
import { hexToRgb } from "./layout-helper";
import type { LayoutElement, DocumentLayoutData } from "./document-elements";

export interface LogoImageData {
  dataUrl: string;
  width: number;
  height: number;
}

export interface DocumentContent {
  // Surat content
  suratType?: string;
  suratNumber?: string;
  issueDate?: string;
  city?: string;
  perihal?: string;
  lampiran?: string;
  recipientName?: string;
  recipientInstansi?: string;
  recipientAddress?: string;
  body?: string;
  includeActivity?: boolean;
  activityDate?: string;
  activityLocation?: string;
  activityTime?: string;
  includePayment?: boolean;
  paymentAmount?: number;
  paymentAmountText?: string;
  bookingAmount?: number;
  bookingAmountText?: string;
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  // Invoice content
  invoiceNumber?: string;
  clientName?: string;
  clientAddress?: string;
  items?: { description: string; qty: number; price: number; total: number }[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  status?: string;
  directorName?: string;
  directorTitle?: string;
  // Slip Gaji content
  employeeName?: string;
  nik?: string;
  jabatan?: string;
  periode?: string;
  gajiPokok?: number;
  tunjanganBonus?: number;
  potongan?: number;
  note?: string;
  paidAt?: string | null;
}

/**
 * Generate PDF from element-based layout.
 * Each element is rendered at its exact (x, y) position in mm.
 * This guarantees the PDF matches the drag & drop editor preview.
 */
export function generateDocumentPDF(
  layout: DocumentLayoutData,
  content: DocumentContent,
  docType: string,
  logoImageData?: LogoImageData | null,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;

  // Sort elements by z-index (render bottom to top)
  const elements = [...layout.elements].sort((a, b) => (a.z || 0) - (b.z || 0));

  // Find the body element to know where to render document content
  const bodyElement = elements.find((e) => e.type === "body");
  const sigElement = elements.find((e) => e.type === "signature");

  // Render each element
  for (const elem of elements) {
    renderElement(doc, elem, logoImageData);
  }

  // Render document-specific content at body element position
  if (bodyElement) {
    if (docType === "SURAT") {
      renderSuratContent(doc, content, bodyElement, sigElement);
    } else if (docType === "INVOICE") {
      renderInvoiceContent(doc, content, bodyElement, sigElement);
    } else if (docType === "SLIP_GAJI") {
      renderSlipGajiContent(doc, content, bodyElement, sigElement);
    }
  }

  return doc;
}

// ===== Render individual element =====
function renderElement(doc: jsPDF, elem: LayoutElement, logoImageData?: LogoImageData | null) {
  const { x, y, w, h } = elem;

  if (elem.type === "rect") {
    const bg = hexToRgb(elem.bgColor || "#e0e0e0");
    doc.setFillColor(...bg);
    doc.rect(x, y, w, h, "F");
  }

  else if (elem.type === "logo") {
    const logoSize = elem.logoSize || 14;
    if (logoImageData && logoImageData.dataUrl) {
      const ar = logoImageData.width / logoImageData.height;
      let imgH = logoSize;
      let imgW = logoSize * ar;
      if (imgW > 45) { imgW = 45; imgH = 45 / ar; }
      const offsetY = (h - imgH) / 2;
      const imgFormat = logoImageData.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      try {
        doc.addImage(logoImageData.dataUrl, imgFormat, x, y + offsetY, imgW, imgH, undefined, "FAST");
      } catch {}
    } else {
      // Circle fallback
      const logoColor = hexToRgb(elem.logoColor || "#ff8000");
      doc.setFillColor(...logoColor);
      doc.circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(elem.logoText || "H", x + logoSize / 2 - 0.5, y + logoSize / 2 + 1.5, { align: "center" });
    }
  }

  else if (elem.type === "text") {
    const fontSize = elem.fontSize || 10;
    const color = hexToRgb(elem.color || "#000000");
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", elem.bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const align = elem.align || "left";
    const textX = align === "right" ? x + w : align === "center" ? x + w / 2 : x;
    // Handle multi-line text
    const lines = doc.splitTextToSize(elem.content || "", w);
    let textY = y + fontSize * 0.35; // approximate baseline
    for (const line of lines) {
      doc.text(line, textX, textY, align === "right" ? { align: "right" } : align === "center" ? { align: "center" } : {});
      textY += fontSize * 0.4;
    }
  }

  else if (elem.type === "signature") {
    const fontSize = elem.fontSize || 10;
    const color = hexToRgb(elem.color || "#000000");
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...color);

    // "Hormat kami," text
    let sigY = y + 5;
    doc.text("Hormat kami,", x, sigY);
    sigY += 18; // Space for signature

    // Signature line
    if (elem.lineStyle !== "none") {
      const lineColor = hexToRgb(elem.lineColor || "#d1d5db");
      doc.setDrawColor(...lineColor);
      doc.setLineWidth(0.3);
      if (elem.lineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
      doc.line(x, sigY, x + w, sigY);
      doc.setLineDashPattern([], 0);
    }
    sigY += 4;

    // Name and title (will be overridden by actual content in renderContent)
    // These are just placeholders; actual values come from DocumentContent
  }
}

// ===== Render Surat content at body position =====
function renderSuratContent(doc: jsPDF, content: DocumentContent, body: LayoutElement, sig: LayoutElement | undefined) {
  const margin = body.x;
  let y = body.y;
  const contentWidth = body.w;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb("#2d3748"));

  // Nomor, Lampiran, Perihal
  doc.text(`Nomor   : ${content.suratNumber || "-"}`, margin, y);
  doc.text(`${content.city || ""}, ${content.issueDate || ""}`, 210 - margin, y, { align: "right" });
  y += 6;
  if (content.lampiran) { doc.text(`Lampiran : ${content.lampiran}`, margin, y); y += 6; }
  doc.text(`Perihal  : ${content.perihal || "-"}`, margin, y);
  y += 10;

  // Kepada Yth
  doc.text("Kepada Yth,", margin, y); y += 6;
  if (content.recipientName) { doc.setFont("helvetica", "bold"); doc.text(content.recipientName, margin, y); y += 6; }
  doc.setFont("helvetica", "normal");
  if (content.recipientInstansi) { doc.text(content.recipientInstansi, margin, y); y += 6; }
  if (content.recipientAddress) { const a = doc.splitTextToSize(content.recipientAddress, contentWidth - 10); doc.text(a, margin, y); y += a.length * 5; }
  y += 8;

  // Isi surat
  const bodyHTML = content.body || "";
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
      if (isCenter) doc.text(line, 105, y, { align: "center" });
      else if (isRight) doc.text(line, 210 - margin, y, { align: "right" });
      else doc.text(line, margin, y);
      y += 6;
    }
    y += 3;
  }
  y += 4;

  // Activity details
  if (content.includeActivity) {
    y += 2; doc.setFont("helvetica", "normal");
    if (content.activityDate) { doc.text(`Tanggal   : ${content.activityDate}`, margin, y); y += 6; }
    if (content.activityLocation) { doc.text(`Lokasi    : ${content.activityLocation}`, margin, y); y += 6; }
    if (content.activityTime) { doc.text(`Waktu     : ${content.activityTime}`, margin, y); y += 6; }
    y += 6;
  }

  // Payment info
  if (content.includePayment) {
    y += 2;
    let pt = "";
    if (content.paymentAmount && content.paymentAmount > 0) {
      pt = `Maka kami mengirimkan surat penawaran untuk mengundang Motivator sebesar Rp. ${content.paymentAmount.toLocaleString("id-ID")}`;
      if (content.paymentAmountText) pt += ` (${content.paymentAmountText})`;
      pt += ".";
    }
    if (content.bookingAmount && content.bookingAmount > 0) {
      pt += ` Adapun biaya tersebut dibayarkan sebesar Rp. ${content.bookingAmount.toLocaleString("id-ID")}`;
      if (content.bookingAmountText) pt += ` (${content.bookingAmountText})`;
      pt += ` sebagai tanda booking date yang dapat dibayarkan melalui rekening ${content.bankName || "Bank"} : ${content.bankAccount || "-"}`;
      if (content.accountName) pt += ` A/N : ${content.accountName}`;
      pt += `. Selanjutnya sisa pembayaranya dapat dilakukan saat hari H.`;
    }
    const pl = doc.splitTextToSize(pt, contentWidth);
    doc.text(pl, margin, y); y += pl.length * 6 + 6;
  }

  // Signature
  if (sig) {
    const sigX = sig.x;
    let sigY = sig.y + 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...hexToRgb("#2d3748"));
    doc.text("Hormat kami,", sigX, sigY);
    sigY += 18;
    // Line
    if (sig.lineStyle !== "none") {
      doc.setDrawColor(...hexToRgb(sig.lineColor || "#d1d5db"));
      doc.setLineWidth(0.3);
      if (sig.lineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
      doc.line(sigX, sigY, sigX + sig.w, sigY);
      doc.setLineDashPattern([], 0);
    }
    sigY += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(sig.color || "#0f234b"));
    doc.text(content.signatoryName || "", sigX, sigY);
    sigY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(content.signatoryTitle || "", sigX, sigY);
  }
}

// ===== Render Invoice content =====
function renderInvoiceContent(doc: jsPDF, content: DocumentContent, body: LayoutElement, sig: LayoutElement | undefined) {
  const margin = body.x;
  let y = body.y;
  const contentWidth = body.w;

  // Invoice info + status
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("No. Invoice:", 210 - margin - 55, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(content.invoiceNumber || "", 210 - margin, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Tanggal:", 210 - margin - 55, y);
  doc.setTextColor(51, 65, 85);
  doc.text(content.issueDate || "", 210 - margin, y, { align: "right" });
  y += 5;
  // Status badge
  const statusColor = content.status === "PAID" ? [34, 197, 94] : content.status === "CANCELLED" ? [239, 68, 68] : [251, 191, 36];
  doc.setFillColor(...statusColor as [number, number, number]);
  doc.roundedRect(210 - margin - 30, y - 3, 30, 5.5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(content.status || "PENDING", 210 - margin - 15, y + 0.5, { align: "center" });
  y += 10;

  // Client info card
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("DITAGIHKAN KEPADA", margin + 4, y + 5);
  doc.setFontSize(10);
  doc.text(content.clientName || "", margin + 4, y + 10);
  if (content.clientAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const addrLines = doc.splitTextToSize(content.clientAddress, contentWidth - 8);
    doc.text(addrLines.slice(0, 2), margin + 4, y + 14);
  }
  y += 22;

  // Items table
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESKRIPSI", margin + 4, y + 5.5);
  doc.text("QTY", margin + contentWidth * 0.6, y + 5.5, { align: "center" });
  doc.text("HARGA", margin + contentWidth * 0.78, y + 5.5, { align: "center" });
  doc.text("TOTAL", 210 - margin - 4, y + 5.5, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  for (let i = 0; i < (content.items || []).length; i++) {
    const item = content.items![i];
    if (i % 2 === 0) { doc.setFillColor(239, 246, 255); doc.rect(margin, y, contentWidth, 8, "F"); }
    doc.text(item.description, margin + 4, y + 5.5);
    doc.text(String(item.qty), margin + contentWidth * 0.6, y + 5.5, { align: "center" });
    doc.text(`Rp ${item.price.toLocaleString("id-ID")}`, margin + contentWidth * 0.78, y + 5.5, { align: "center" });
    doc.text(`Rp ${item.total.toLocaleString("id-ID")}`, 210 - margin - 4, y + 5.5, { align: "right" });
    y += 8;
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  // Summary
  const summaryW = 70;
  const summaryX = 210 - margin - summaryW;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", summaryX, y);
  doc.setTextColor(51, 65, 85);
  doc.text(`Rp ${(content.subtotal || 0).toLocaleString("id-ID")}`, 210 - margin, y, { align: "right" });
  y += 6;
  if (content.discount && content.discount > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("Diskon", summaryX, y);
    doc.text(`- Rp ${content.discount.toLocaleString("id-ID")}`, 210 - margin, y, { align: "right" });
    y += 6;
  }
  // Total box
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(summaryX, y, summaryW, 9, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", summaryX + 4, y + 6);
  doc.text(`Rp ${(content.totalAmount || 0).toLocaleString("id-ID")}`, 210 - margin - 4, y + 6, { align: "right" });
  y += 15;

  // Payment info
  if (content.bankName) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("PEMBAYARAN VIA TRANSFER", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${content.bankName} — ${content.bankAccount} — ${content.accountName}`, margin + 4, y + 9);
    y += 17;
  }

  // Signature
  if (sig) {
    const sigX = sig.x;
    let sigY = sig.y + 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Hormat kami,", sigX, sigY);
    sigY += 22;
    if (sig.lineStyle !== "none") {
      doc.setDrawColor(...hexToRgb(sig.lineColor || "#d1d5db"));
      doc.setLineWidth(0.3);
      if (sig.lineStyle === "dashed") doc.setLineDashPattern([1, 0.5], 0);
      doc.line(sigX, sigY, sigX + sig.w, sigY);
      doc.setLineDashPattern([], 0);
    }
    sigY += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(sig.color || "#1e3a8a"));
    doc.text(content.directorName || "", sigX, sigY);
    sigY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(content.directorTitle || "", sigX, sigY);
  }
}

// ===== Render Slip Gaji content =====
function renderSlipGajiContent(doc: jsPDF, content: DocumentContent, body: LayoutElement, sig: LayoutElement | undefined) {
  const margin = body.x;
  let y = body.y;
  const contentWidth = body.w;

  // Periode subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${content.periode || ""}`, 105, y, { align: "center" });
  y += 8;

  // Employee info card
  const BORDER: [number, number, number] = [226, 232, 240];
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "S");
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, "F");
  doc.rect(margin, y + 3, contentWidth, 3, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMASI KARYAWAN", margin + 4, y + 4);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Nama", margin + 4, y + 10);
  doc.text("Jabatan", margin + 4, y + 15);
  doc.text("Periode", margin + contentWidth / 2 + 4, y + 10);
  doc.text("Bank", margin + contentWidth / 2 + 4, y + 15);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text(content.employeeName || "", margin + 22, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text(content.jabatan || "-", margin + 22, y + 15);
  doc.text(content.periode || "", margin + contentWidth / 2 + 22, y + 10);
  doc.text(content.bankName || "-", margin + contentWidth / 2 + 22, y + 15);
  y += 25;

  // Earnings & Deductions
  const colWidth = (contentWidth - 5) / 2;
  const cardHeight = 38;
  // Earnings
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, colWidth, cardHeight, 2, 2, "S");
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(margin, y, colWidth, 7, 2, 2, "F");
  doc.rect(margin, y + 4, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN", margin + 4, y + 5);
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gaji Pokok", margin + 4, y + 13);
  doc.text(`Rp ${(content.gajiPokok || 0).toLocaleString("id-ID")}`, margin + colWidth - 4, y + 13, { align: "right" });
  doc.text("Tunjangan & Bonus", margin + 4, y + 19);
  doc.text(`Rp ${(content.tunjanganBonus || 0).toLocaleString("id-ID")}`, margin + colWidth - 4, y + 19, { align: "right" });
  doc.setDrawColor(...BORDER);
  doc.line(margin + 2, y + 24, margin + colWidth - 2, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Total Pendapatan", margin + 4, y + 31);
  doc.text(`Rp ${((content.gajiPokok || 0) + (content.tunjanganBonus || 0)).toLocaleString("id-ID")}`, margin + colWidth - 4, y + 31, { align: "right" });

  // Deductions
  const rightX = margin + colWidth + 5;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(rightX, y, colWidth, cardHeight, 2, 2, "S");
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(rightX, y, colWidth, 7, 2, 2, "F");
  doc.rect(rightX, y + 4, colWidth, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("POTONGAN", rightX + 4, y + 5);
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Potongan Keterlambatan", rightX + 4, y + 13);
  doc.text("BPJS / Absensi", rightX + 4, y + 19);
  doc.text(`Rp ${(content.potongan || 0).toLocaleString("id-ID")}`, rightX + colWidth - 4, y + 19, { align: "right" });
  doc.setDrawColor(...BORDER);
  doc.line(rightX + 2, y + 24, rightX + colWidth - 2, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(239, 68, 68);
  doc.text("Total Potongan", rightX + 4, y + 31);
  doc.text(`Rp ${(content.potongan || 0).toLocaleString("id-ID")}`, rightX + colWidth - 4, y + 31, { align: "right" });
  y += cardHeight + 6;

  // Net salary
  const netSalary = (content.gajiPokok || 0) + (content.tunjanganBonus || 0) - (content.potongan || 0);
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(margin, y, contentWidth, 13, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("GAJI BERSIH DITERIMA", margin + 5, y + 6);
  doc.setFontSize(6.5);
  doc.text("(Take Home Pay)", margin + 5, y + 10);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Rp ${netSalary.toLocaleString("id-ID")}`, 210 - margin - 5, y + 8, { align: "right" });
  y += 18;

  // Note
  if (content.note) {
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "S");
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y, 25, 10, 2, 2, "F");
    doc.rect(margin + 12, y, 13, 10, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CATATAN", margin + 4, y + 6);
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const splitNote = doc.splitTextToSize(content.note, contentWidth - 31);
    doc.text(splitNote.slice(0, 2), margin + 29, y + 6);
    y += 14;
  }

  // Status
  const isPaid = content.status === "PAID";
  const statusLabel = isPaid ? "LUNAS / PAID" : content.status === "APPROVED" ? "DISETUJUI" : "DRAFT";
  const statusBg: [number, number, number] = isPaid ? [220, 252, 231] : [254, 249, 195];
  const statusTxt: [number, number, number] = isPaid ? [22, 101, 52] : [161, 98, 7];
  doc.setFillColor(...statusBg);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setTextColor(...statusTxt);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS PEMBAYARAN: ${statusLabel}`, margin + 5, y + 5.5);
  if (isPaid && content.paidAt) {
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal: ${content.paidAt}`, 210 - margin - 5, y + 5.5, { align: "right" });
  }
}
