import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const runtime = "nodejs";

// GET report of completed work (DONE cards) as PDF
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all"; // all, month, week

    const where: any = { status: "DONE", completedAt: { not: null } };
    const now = new Date();
    if (period === "month") {
      where.completedAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.completedAt = { gte: weekAgo };
    }

    const cards = await db.kanbanCard.findMany({
      where,
      orderBy: { completedAt: "desc" },
    });

    // Generate PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 15;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PT. HAFARA AQIBA NUSANTARA", margin, 12);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Laporan Pekerjaan Selesai (Kanban Board)", margin, 20);
    doc.setFontSize(8);
    doc.text(`Periode: ${period === "month" ? "Bulan Ini" : period === "week" ? "7 Hari Terakhir" : "Semua Waktu"}`, pageWidth - margin, 12, { align: "right" });
    doc.text(`Dibuat: ${now.toLocaleString("id-ID")}`, pageWidth - margin, 20, { align: "right" });

    let y = 35;

    // Summary
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total Pekerjaan Selesai: ${cards.length}`, margin, y);
    y += 4;
    const highPriority = cards.filter((c) => c.priority === "HIGH" || c.priority === "URGENT").length;
    doc.text(`Prioritas Tinggi: ${highPriority}`, margin, y);
    y += 4;
    const categories = [...new Set(cards.map((c) => c.category).filter(Boolean))];
    doc.text(`Kategori: ${categories.join(", ") || "-"}`, margin, y);
    y += 8;

    // Table of completed work
    autoTable(doc, {
      head: [["#", "Judul Pekerjaan", "Kategori", "Prioritas", "Selesai Pada"]],
      body: cards.map((c, i) => [
        String(i + 1),
        c.title,
        c.category || "-",
        c.priority,
        c.completedAt ? new Date(c.completedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-",
      ]),
      startY: y,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: margin, right: margin },
    });

    // Footer
    const pageHeight = 297;
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("PT. HAFARA AQIBA NUSANTARA - HBOS", margin, pageHeight - 10);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    const pdfBuffer = doc.output("arraybuffer");

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan-Pekerjaan-Selesai-${period}.pdf"`,
      },
    });
  });
}
