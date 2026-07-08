import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { hexToRgb } from "@/lib/layout-helper";

export const runtime = "nodejs";

// GET — Export Arus Kas (finance transactions) as PDF with year/month filter
// Params: year (0=all), month (0=all months in that year)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const year = yearParam ? Number(yearParam) : 0;
    const month = monthParam ? Number(monthParam) : 0;

    // Build where clause
    const where: any = {};
    if (year > 0 && month > 0) {
      where.date = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    } else if (year > 0) {
      where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    // year=0 → no filter, get all transactions

    const txns = await db.financeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { user: { select: { name: true } } },
    });

    // Fetch layout settings for header
    let layoutSettings: any = null;
    let logoUrl = "";
    try {
      const layoutRecord = await db.documentLayout.findUnique({ where: { docType: "SLIP_GAJI" } });
      if (layoutRecord) layoutSettings = JSON.parse(layoutRecord.settings);
      const logoSetting = await db.appSetting.findUnique({ where: { key: "company_logo" } });
      if (logoSetting) logoUrl = logoSetting.value;
    } catch {}

    // Load logo
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
          if (!isJpeg && buffer.length > 20) {
            logoWidth = buffer.readUInt32BE(16);
            logoHeight = buffer.readUInt32BE(20);
          } else { logoWidth = 200; logoHeight = 200; }
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
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;

    // ===== HEADER =====
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    if (logoDataUrl) {
      const ar = logoWidth / logoHeight;
      let imgH = 14, imgW = 14 * ar;
      if (imgW > 45) { imgW = 45; imgH = 45 / ar; }
      const imgFormat = logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      try { doc.addImage(logoDataUrl, imgFormat, margin, (headerHeight - imgH) / 2, imgW, imgH, undefined, "FAST"); } catch {}
    }
    const infoX = pageWidth - margin;
    const nameY = headerHeight * 0.3, addrY = headerHeight * 0.55, contactY = headerHeight * 0.8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, infoX, nameY, { align: "right" });
    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 230, 245);
    doc.text(companyAddress, infoX, addrY, { align: "right" });
    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(180, 200, 230);
    doc.text(companyContact, infoX, contactY, { align: "right" });

    let y = headerHeight + 1.5;
    doc.setFillColor(...accentLine);
    doc.rect(0, y, pageWidth, s.accentLineHeight || 1.5, "F");
    y += (s.accentLineHeight || 1.5) + 8;

    // ===== TITLE =====
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("LAPORAN ARUS KAS", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    let periodLabel = "Semua Tahun (Akumulasi)";
    if (year > 0 && month > 0) {
      const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else if (year > 0) {
      periodLabel = `Tahun ${year}`;
    }
    doc.text(`Periode: ${periodLabel}`, margin, y);
    y += 2;
    doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, margin, y);
    y += 2;
    doc.text(`Total Transaksi: ${txns.length}`, margin, y);
    y += 8;

    // ===== SUMMARY =====
    const pemasukan = txns.filter(t => t.type === "PEMASUKAN");
    const pengeluaran = txns.filter(t => t.type === "PENGELUARAN");
    const totalMasuk = pemasukan.reduce((s, t) => s + t.amount, 0);
    const totalKeluar = pengeluaran.reduce((s, t) => s + t.amount, 0);
    const saldo = totalMasuk - totalKeluar;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("RINGKASAN", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Pemasukan:`, margin + 4, y + 10);
    doc.setTextColor(22, 163, 74);
    doc.text(`Rp ${totalMasuk.toLocaleString("id-ID")}`, margin + 50, y + 10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Pengeluaran:`, margin + 90, y + 10);
    doc.setTextColor(239, 68, 68);
    doc.text(`Rp ${totalKeluar.toLocaleString("id-ID")}`, margin + 140, y + 10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Saldo:`, margin + 4, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(saldo >= 0 ? [22, 163, 74] : [239, 68, 68]) as [number, number, number]);
    doc.text(`Rp ${saldo.toLocaleString("id-ID")}`, margin + 50, y + 14);
    y += 22;

    // ===== TABLE =====
    const tableData = txns.map((t, i) => [
      String(i + 1),
      t.date.toISOString().slice(0, 10),
      t.type === "PEMASUKAN" ? "Masuk" : "Keluar",
      t.description || "-",
      t.category || "-",
      t.accountType || "-",
      `Rp ${t.amount.toLocaleString("id-ID")}`,
    ]);

    autoTable(doc, {
      head: [["#", "Tanggal", "Tipe", "Deskripsi", "Kategori", "Akun", "Jumlah"]],
      body: tableData,
      startY: y,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: headerBg, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        6: { cellWidth: 28, halign: "right" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          if (data.cell.text[0] === "Masuk") data.cell.styles.textColor = [22, 163, 74];
          else data.cell.styles.textColor = [239, 68, 68];
        }
        if (data.section === "body" && data.column.index === 6) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // ===== FOOTER =====
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
      if (s.footerSubText) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(s.footerSubText, pageWidth / 2, fy + 10, { align: "center" });
      }
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, fy - 2, { align: "right" });
    }

    const pdfBuffer = doc.output("arraybuffer");
    const fileName = `Arus-Kas-${periodLabel.replace(/\s+/g, "-")}.pdf`;
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  });
}
