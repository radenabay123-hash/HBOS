import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi, getMonthRange } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Owner dashboard - full business overview with monthly + yearly charts
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    const month = Number(searchParams.get("month") || (now.getMonth() + 1));

    const monthRange = getMonthRange(year, month);
    const yearRange = getMonthRange(year);

    // ===== CRM Stats =====
    const totalLead = await db.client.count({ where: { status: "LEAD" } });
    const totalFollowUp = await db.client.count({ where: { status: "FOLLOW_UP" } });
    const totalProposal = await db.client.count({ where: { status: "PROPOSAL" } });
    const totalNegotiation = await db.client.count({ where: { status: "NEGOTIATION" } });
    const totalDeal = await db.client.count({ where: { status: "DEAL" } });
    const totalLost = await db.client.count({ where: { status: "LOST" } });
    const totalClients = await db.client.count();
    const conversionRate = totalClients > 0 ? Math.round((totalDeal / totalClients) * 100) : 0;

    // Deal revenue (sum of budget for deal clients)
    const dealClients = await db.client.findMany({
      where: { status: "DEAL" },
      select: { id: true, namaKlien: true, instansi: true, budget: true, tanggalEvent: true },
    });
    const dealRevenue = dealClients.reduce((s, c) => s + (c.budget || 0), 0);

    // ===== Events this month =====
    const eventsThisMonth = await db.event.count({
      where: { tanggal: { gte: monthRange.start, lte: monthRange.end } },
    });
    const eventsThisMonthList = await db.event.findMany({
      where: { tanggal: { gte: monthRange.start, lte: monthRange.end } },
      include: { client: { select: { namaKlien: true } }, assistantTrainer: { select: { name: true } } },
      orderBy: { tanggal: "asc" },
    });

    // ===== Finance this month =====
    const pemasukanThisMonth = await db.financeTransaction.aggregate({
      where: { type: "PEMASUKAN", date: { gte: monthRange.start, lte: monthRange.end } },
      _sum: { amount: true },
    });
    const pengeluaranThisMonth = await db.financeTransaction.aggregate({
      where: { type: "PENGELUARAN", date: { gte: monthRange.start, lte: monthRange.end } },
      _sum: { amount: true },
    });
    const revenueThisMonth = pemasukanThisMonth._sum.amount || 0;
    const expenseThisMonth = pengeluaranThisMonth._sum.amount || 0;
    const profitThisMonth = revenueThisMonth - expenseThisMonth;

    const finSetting = await db.financeSetting.findUnique({
      where: { month_year: { month, year } },
    });
    const targetRevenue = finSetting?.targetRevenue || 500000000;
    const targetProfit = finSetting?.targetProfit || 150000000;

    // ===== Content Stats =====
    const totalContentPublished = await db.contentIdea.count({ where: { statusPublish: "PUBLISHED" } });
    const totalContentProduced = await db.contentIdea.count({ where: { statusProduksi: { in: ["PUBLISHED", "SIAP_PUBLISH", "EDITING", "PRODUKSI"] } } });
    const totalReels = await db.contentIdea.count({ where: { statusPublish: "PUBLISHED" } });
    const pendingAccContents = await db.contentIdea.count({ where: { statusACC: "PENDING" } });

    // ===== Article Stats =====
    const totalArticles = await db.article.count();
    const totalArticlesPublished = await db.article.count({ where: { status: "PUBLISHED" } });
    const pendingAccArticles = await db.article.count({ where: { statusACC: "PENDING" } });

    // Followers growth & engagement from content metrics
    const publishedContents = await db.contentIdea.findMany({
      where: { statusPublish: "PUBLISHED", metrikKonten: { not: null } },
      select: { metrikKonten: true },
    });
    let totalReach = 0, totalViews = 0, totalShare = 0, totalSave = 0, totalComment = 0, totalFollowerGrowth = 0;
    for (const c of publishedContents) {
      try {
        const m = JSON.parse(c.metrikKonten || "{}");
        totalReach += m.reach || 0;
        totalViews += m.views || 0;
        totalShare += m.share || 0;
        totalSave += m.save || 0;
        totalComment += m.comment || 0;
        totalFollowerGrowth += m.followerGrowth || 0;
      } catch {}
    }
    const engagementRate = totalViews > 0 ? Math.round(((totalShare + totalSave + totalComment) / totalViews) * 100) : 0;

    // ===== Monthly Charts (12 months) =====
    const monthlyData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const [pemasukan, pengeluaran, deals, contents, articles, events, leads] = await Promise.all([
        db.financeTransaction.aggregate({ where: { type: "PEMASUKAN", date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        db.financeTransaction.aggregate({ where: { type: "PENGELUARAN", date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        db.client.count({ where: { status: "DEAL", updatedAt: { gte: mStart, lte: mEnd } } }),
        db.contentIdea.count({ where: { statusPublish: "PUBLISHED", tanggal: { gte: mStart, lte: mEnd } } }),
        db.article.count({ where: { status: "PUBLISHED", createdAt: { gte: mStart, lte: mEnd } } }),
        db.event.count({ where: { tanggal: { gte: mStart, lte: mEnd } } }),
        db.client.count({ where: { createdAt: { gte: mStart, lte: mEnd } } }),
      ]);
      monthlyData.push({
        month: monthNames[m],
        revenue: pemasukan._sum.amount || 0,
        expense: pengeluaran._sum.amount || 0,
        profit: (pemasukan._sum.amount || 0) - (pengeluaran._sum.amount || 0),
        deals, contents, articles, events, leads,
      });
    }

    // ===== Yearly Charts (last 5 years) =====
    const yearlyData = [];
    for (let y = year - 4; y <= year; y++) {
      const yStart = new Date(y, 0, 1);
      const yEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      const [pemasukan, pengeluaran, deals, contents, articles] = await Promise.all([
        db.financeTransaction.aggregate({ where: { type: "PEMASUKAN", date: { gte: yStart, lte: yEnd } }, _sum: { amount: true } }),
        db.financeTransaction.aggregate({ where: { type: "PENGELUARAN", date: { gte: yStart, lte: yEnd } }, _sum: { amount: true } }),
        db.client.count({ where: { status: "DEAL", updatedAt: { gte: yStart, lte: yEnd } } }),
        db.contentIdea.count({ where: { statusPublish: "PUBLISHED", tanggal: { gte: yStart, lte: yEnd } } }),
        db.article.count({ where: { status: "PUBLISHED", createdAt: { gte: yStart, lte: yEnd } } }),
      ]);
      yearlyData.push({
        year: String(y),
        revenue: pemasukan._sum.amount || 0,
        expense: pengeluaran._sum.amount || 0,
        profit: (pemasukan._sum.amount || 0) - (pengeluaran._sum.amount || 0),
        deals, contents, articles,
      });
    }

    // ===== Content category breakdown =====
    const contentByCategory = [];
    const categories = ["Instagram M. Aqil Baihaqi", "TikTok Aqil Baihaqi", "Hafara Group", "MentorSkill"];
    for (const cat of categories) {
      const count = await db.contentIdea.count({ where: { kategori: cat, statusPublish: "PUBLISHED" } });
      contentByCategory.push({ name: cat, value: count });
    }

    // ===== CRM pipeline distribution =====
    const crmPipeline = [
      { name: "Lead", value: totalLead },
      { name: "Follow Up", value: totalFollowUp },
      { name: "Proposal", value: totalProposal },
      { name: "Negotiation", value: totalNegotiation },
      { name: "Deal", value: totalDeal },
      { name: "Lost", value: totalLost },
    ];

    // ===== Deal clients with documents (invoice/SPK/surat) =====
    const dealClientsWithDocs = await Promise.all(
      dealClients.map(async (c) => {
        const docs = await db.document.findMany({
          where: { clientId: c.id },
          select: { documentType: true, documentName: true, documentNumber: true, link: true },
        });
        const hasInvoice = docs.some((d) => d.documentType === "INVOICE");
        const hasSpk = docs.some((d) => d.documentType === "SPK");
        const hasSurat = docs.some((d) => d.documentType === "SURAT");
        return { ...c, documents: docs, hasInvoice, hasSpk, hasSurat };
      })
    );

    // ===== Profit estimation (forecast: avg monthly profit) =====
    const avgMonthlyProfit = monthlyData.reduce((s, m) => s + m.profit, 0) / 12;
    const profitEstimation = Math.round(avgMonthlyProfit);

    // ===== Team productivity summary (for owner to monitor) =====
    const teamMembers = await db.user.findMany({
      where: { role: { in: ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] }, isActive: true },
      select: { id: true, name: true, role: true, position: true },
    });
    const teamProductivity = await Promise.all(
      teamMembers.map(async (t) => {
        const tasksDone = await db.dailyTask.count({ where: { userId: t.id, status: "SELESAI", tanggal: { gte: monthRange.start, lte: monthRange.end } } });
        const tasksTotal = await db.dailyTask.count({ where: { userId: t.id, tanggal: { gte: monthRange.start, lte: monthRange.end } } });
        const contents = await db.contentIdea.count({ where: { userId: t.id, statusPublish: "PUBLISHED", tanggal: { gte: monthRange.start, lte: monthRange.end } } });
        const articles = await db.article.count({ where: { userId: t.id, status: "PUBLISHED", createdAt: { gte: monthRange.start, lte: monthRange.end } } });
        return {
          ...t,
          tasksDone, tasksTotal, contents, articles,
          completionRate: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0,
        };
      })
    );

    return ok({
      year, month,
      crm: {
        totalLead, totalFollowUp, totalProposal, totalNegotiation, totalDeal, totalLost,
        totalClients, conversionRate, dealRevenue, crmPipeline,
      },
      events: { eventsThisMonth, eventsThisMonthList },
      finance: {
        revenueThisMonth, expenseThisMonth, profitThisMonth,
        targetRevenue, targetProfit,
        revenueAchievement: targetRevenue > 0 ? Math.round((revenueThisMonth / targetRevenue) * 100) : 0,
        profitAchievement: targetProfit > 0 ? Math.round((profitThisMonth / targetProfit) * 100) : 0,
        profitEstimation,
      },
      content: {
        totalContentPublished, totalContentProduced, totalReels,
        totalReach, totalViews, totalShare, totalSave, totalComment, totalFollowerGrowth,
        engagementRate, contentByCategory, pendingAccContents,
      },
      articles: { totalArticles, totalArticlesPublished, pendingAccArticles },
      monthlyData, yearlyData,
      dealClientsWithDocs,
      teamProductivity,
    });
  });
}
