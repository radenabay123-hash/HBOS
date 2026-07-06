import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { err, handleApi } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { jsPDF } from "jspdf";
import { hexToRgb } from "@/lib/layout-helper";

export const runtime = "nodejs";

// GET - Export daily work summaries as PDF (evaluation report)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};
    if (user.role !== "OWNER" && user.role !== "PROJECT_MANAGER") {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const ed = new Date(endDate);
        ed.setDate(ed.getDate() + 1);
        where.date.lt = ed;
      }
    }

    const summaries = await db.dailyWorkSummary.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, position: true } },
      },
    });

    // Fetch layout settings directly from DB (server-side)
    let layoutSettings: any = null;
    let logoUrl = "";
    try {
      const layoutRecord = await db.documentLayout.findUnique({ where: { docType: "SLIP_GAJI" } });
      if (layoutRecord) layoutSettings = JSON.parse(layoutRecord.settings);
      const logoSetting = await db.appSetting.findUnique({ where: { key: "company_logo" } });
      if (logoSetting) logoUrl = logoSetting.value;
    } catch {}

    // Load logo image for PDF (server-side: read file directly)
    let logoDataUrl: string | null = null;
    let logoWidth = 0;
    let logoHeight = 0;
    if (logoUrl) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        // logoUrl is like "/uploads/company_logo_XXX.png"
        const filePath = path.join(process.cwd(), "public", logoUrl);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const isJpeg = ext === ".jpg" || ext === ".jpeg";
          logoDataUrl = `data:image/${isJpeg ? "jpeg" : "png"};base64,${buffer.toString("base64")}`;
          // Get dimensions from PNG/JPEG header
          if (!isJpeg && buffer.length > 20) {
            logoWidth = buffer.readUInt32BE(16);
            logoHeight = buffer.readUInt32BE(20);
          } else {
            // Default for JPEG
            logoWidth = 200;
            logoHeight = 200;
          }
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

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const headerHeight = s.headerHeight || 28;

    // ===== HEADER (navy solid, info inside) =====
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo
    const logoSize = s.logoSize || 14;
    if (logoDataUrl && logoWidth && logoHeight) {
      const ar = logoWidth / logoHeight;
      let imgH = logoSize;
      let imgW = logoSize * ar;
      if (imgW > 45) { imgW = 45; imgH = 45 / ar; }
      const logoY = (headerHeight - imgH) / 2;
      const imgFormat = logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      try {
        doc.addImage(logoDataUrl, imgFormat, margin, logoY, imgW, imgH, undefined, "FAST");
      } catch {}
    }

    // Company info (right side)
    const infoX = pageWidth - margin;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(s.companyNameFontSize || 12);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, infoX, 8, { align: "right" });

    doc.setFontSize(s.companyAddressFontSize || 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 230, 245);
    doc.text(companyAddress, infoX, 14, { align: "right" });

    doc.setFontSize(s.companyContactFontSize || 7);
    doc.setTextColor(180, 200, 230);
    doc.text(companyContact, infoX, 19, { align: "right" });

    let y = headerHeight + 2;
    // Accent line
    doc.setFillColor(...accentLine);
    doc.rect(0, y, pageWidth, s.accentLineHeight || 1.5, "F");
    y += (s.accentLineHeight || 1.5) + 6;

    // ===== TITLE =====
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("LAPORAN RINGKASAN PEKERJAAN HARIAN", margin, y + 4);
    y += 10;

    // Period info
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const periodText = startDate && endDate
      ? `Periode: ${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`
      : "Periode: Semua Waktu";
    doc.text(periodText, margin, y);
    y += 4;
    doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, margin, y);
    y += 4;
    doc.text(`Total Ringkasan: ${summaries.length} hari`, margin, y);
    y += 8;

    // ===== OVERALL STATS =====
    const totalTasks = summaries.reduce((sum, s2) => sum + s2.totalCompleted, 0);
    const totalHigh = summaries.reduce((sum, s2) => sum + s2.highPriorityCount, 0);
    const totalMedium = summaries.reduce((sum, s2) => sum + s2.mediumPriorityCount, 0);
    const totalLow = summaries.reduce((sum, s2) => sum + s2.lowPriorityCount, 0);
    const uniqueUsers = new Set(summaries.map((s2) => s2.userId)).size;

    // Stats card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("RINGKASAN KESELURUHAN", margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const statsY = y + 10;
    doc.text(`Total Hari: ${summaries.length}`, margin + 4, statsY);
    doc.text(`Total Pekerjaan Selesai: ${totalTasks}`, margin + 4, statsY + 4);
    doc.text(`Anggota Tim: ${uniqueUsers}`, margin + 4, statsY + 8);
    doc.text(`Prioritas Tinggi: ${totalHigh}`, margin + 90, statsY);
    doc.text(`Prioritas Sedang: ${totalMedium}`, margin + 90, statsY + 4);
    doc.text(`Prioritas Rendah: ${totalLow}`, margin + 90, statsY + 8);
    y += 28;

    // ===== DETAILED SUMMARIES (per day per user) =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
    doc.text("DETAIL RINGKASAN HARIAN", margin, y);
    y += 6;

    for (const summary of summaries) {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      const userName = summary.user?.name || "Unknown";
      const userRole = summary.user?.role ? ROLE_LABELS[summary.user.role] || summary.user.role : "";
      const dateStr = new Date(summary.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      // Summary card header (navy bar with user name + date)
      doc.setFillColor(...hexToRgb(s.headerBgColor || "#0f234b"));
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${userName} (${userRole})`, margin + 3, y + 5);
      doc.text(dateStr, pageWidth - margin - 3, y + 5, { align: "right" });
      y += 7;

      // Stats row
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "FD");
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Total: ${summary.totalCompleted} pekerjaan`, margin + 3, y + 5);
      doc.text(`Tinggi: ${summary.highPriorityCount}`, margin + 50, y + 5);
      doc.text(`Sedang: ${summary.mediumPriorityCount}`, margin + 75, y + 5);
      doc.text(`Rendah: ${summary.lowPriorityCount}`, margin + 100, y + 5);
      doc.text(`Kategori: ${summary.categories || "-"}`, margin + 125, y + 5);
      y += 11;

      // Task list
      let taskDetails: any[] = [];
      try {
        taskDetails = JSON.parse(summary.taskDetails);
      } catch {}

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRgb(s.docTitleColor || "#0f234b"));
      doc.text("Pekerjaan yang Diselesaikan:", margin, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);

      const PRIORITY_LABELS: Record<string, string> = { LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Mendesak" };

      for (let i = 0; i < taskDetails.length; i++) {
        const task = taskDetails[i];
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
        const completedTime = task.completedAt ? new Date(task.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
        const taskLine = `${i + 1}. [${priorityLabel}] ${task.title}${task.category ? ` (${task.category})` : ""}${completedTime ? ` - ${completedTime}` : ""}`;
        const splitLines = doc.splitTextToSize(taskLine, contentWidth - 4);
        doc.text(splitLines, margin + 2, y);
        y += splitLines.length * 3.5;

        // Add description if exists
        if (task.description) {
          const descLines = doc.splitTextToSize(`   ↳ ${task.description}`, contentWidth - 8);
          doc.setTextColor(100, 116, 139);
          doc.text(descLines.slice(0, 2), margin + 4, y);
          doc.setTextColor(51, 65, 85);
          y += descLines.slice(0, 2).length * 3;
        }
      }
      y += 6;
    }

    // ===== FOOTER (on each page) =====
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
      // Page number (small, below footer)
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, fy - 2, { align: "right" });
    }

    const pdfBuffer = doc.output("arraybuffer");

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Ringkasan-Pekerjaan-Harian-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  });
}
