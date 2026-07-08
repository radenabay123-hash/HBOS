import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { hexToRgb } from "@/lib/layout-helper";

export const runtime = "nodejs";

// GET — Export Daftar Pajak as PDF with year filter
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : 0;

    const where: any = {};
    if (year > 0) where.year = year;

    const taxPayments = await db.taxPayment.findMany({ where, orderBy: { dueDate: "desc" } });

    // Fetch layout settings
    let layoutSettings: any = null;
    let logoUrl = "";
    try {
      const layoutRecord = await db.documentLayout.findUnique({ where: { docType: "SLIP_GAJI" } });
      if (layoutRecord) layoutSettings = JSON.parse(layoutRecord.settings);
      // For documents: prefer document_logo, fall back to legacy company_logo
      const logoSettings = await db.appSetting.findMany({ where: { key: { in: ["document_logo", "company_logo"] } } });
      const logoMap: Record<string, string> = {};
      for (const s of logoSettings) logoMap[s.key] = s.value;
      logoUrl = logoMap.document_logo || logoMap.company_logo || "";
    } catch {}

    let logoDataUrl: string | null = null;
    let logoWidth = 0, logoHeight = 0;
    if (logoUrl) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", logoUrl);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const isJpeg = filePath.endsWith(".jpg") || filePath.endsWith(".jpeg");
          logoDataUrl = `data:image/${isJpeg ? "jpeg" : "png"};base64,${buffer.toString("base64")}`;
          if (!isJpeg && buffer.length > 20) { logoWidth = buffer.readUInt32BE(16); logoHeight = buffer.readUInt32BE(20); }
          else { logoWidth = 200; logoHeight = 200; }
        }
      } catch {}
    }

    const s = layoutSettings || {};
    const headerBg = hexToRgb(s.headerBgColor || "#0f234b");
    const accentLine = hexToRgb(s.accentLineColor || "#ff8000");
    const footerBg = hexToRgb(s.footerBgColor || "#0f234b");
    const footerTextColor = hexToRgb(s.footerTextColor || "#ffffff");
    const companyName = s.companyNameText || "PT. HAFARA AQIBA NUSANTARA";
    const companyAddress = s.companyAddressText || "";
    const companyContact = s.companyContactText || "";
    const headerHeight = s.headerHeight || 28;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210, pageHeight = 297, margin = 15;

    // Header
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    if (logoDataUrl) {
      const ar = logoWidth / logoHeight;
      let imgH = 14, imgW = 14 * ar;
      if (imgW > 45) { imgW = 45; imgH = 45 / ar; }
      try { doc.addImage(logoDataUrl, logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", margin, (headerHeight - imgH) / 2, imgW, imgH, undefined, "FAST"); } catch {}
    }
    const infoX = pageWidth - margin;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, infoX, headerHeight * 0.3, { align: "right" });
    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 230, 245);
    doc.text(companyAddress, infoX, headerHeight * 0.55, { align: "right" });
    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(180, 200, 230);
    doc.text(companyContact, infoX, headerHeight * 0.8, { align: "right" });

    let y = headerHeight + 1.5;
    doc.setFillColor(...accentLine);
    doc.rect(0, y, pageWidth, s.accentLineHeight || 1.5, "F");
    y += (s.accentLineHeight || 1.5) + 8;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("LAPORAN DAFTAR PAJAK", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const periodLabel = year > 0 ? `Tahun ${year}` : "Semua Tahun";
    doc.text(`Periode: ${periodLabel}`, margin, y);
    y += 4;
    doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, margin, y);
    y += 4;
    doc.text(`Total: ${taxPayments.length} pajak`, margin, y);
    y += 8;

    // Summary
    const totalTerutang = taxPayments.filter(t => t.status === "TERUTANG").reduce((s, t) => s + (t.taxDue - t.taxPaid), 0);
    const totalDibayar = taxPayments.filter(t => t.status === "DIBAYAR").reduce((s, t) => s + t.taxPaid, 0);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("RINGKASAN", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(239, 68, 68);
    doc.text(`Terutang: Rp ${totalTerutang.toLocaleString("id-ID")}`, margin + 4, y + 9);
    doc.setTextColor(22, 163, 74);
    doc.text(`Dibayar: Rp ${totalDibayar.toLocaleString("id-ID")}`, margin + 80, y + 9);
    y += 18;

    // Table
    const tableData = taxPayments.map((t, i) => [
      String(i + 1),
      t.taxType,
      t.masaPajak,
      t.dueDate.toISOString().slice(0, 10),
      `Rp ${t.taxDue.toLocaleString("id-ID")}`,
      `Rp ${t.taxPaid.toLocaleString("id-ID")}`,
      `Rp ${(t.taxDue - t.taxPaid).toLocaleString("id-ID")}`,
      t.status,
    ]);

    autoTable(doc, {
      head: [["#", "Jenis", "Masa Pajak", "Jatuh Tempo", "Terutang", "Dibayar", "Sisa", "Status"]],
      body: tableData,
      startY: y,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: headerBg, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          if (data.cell.text[0] === "DIBAYAR") data.cell.styles.textColor = [22, 163, 74];
          else data.cell.styles.textColor = [239, 68, 68];
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    const footerHeight = s.footerHeight || 14;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const fy = pageHeight - footerHeight;
      doc.setFillColor(...footerBg);
      doc.rect(0, fy, pageWidth, footerHeight, "F");
      doc.setFillColor(...accentLine);
      doc.rect(0, fy, pageWidth, 1, "F");
      doc.setTextColor(...footerTextColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(s.footerText || "Terima Kasih!", pageWidth / 2, fy + 6, { align: "center" });
      if (s.footerSubText) { doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.text(s.footerSubText, pageWidth / 2, fy + 10, { align: "center" }); }
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, fy - 2, { align: "right" });
    }

    const pdfBuffer = doc.output("arraybuffer");
    return new Response(pdfBuffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Daftar-Pajak-${periodLabel.replace(/\s+/g, "-")}.pdf"` } });
  });
}
