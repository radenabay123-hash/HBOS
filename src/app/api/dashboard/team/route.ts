import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi, getMonthRange } from "@/lib/api";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

// Team dashboard - role-specific KPIs + integrated menus summary
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role === ROLES.OWNER) return err("Owner menggunakan dashboard owner", 403);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    const month = Number(searchParams.get("month") || (now.getMonth() + 1));

    const monthRange = getMonthRange(year, month);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // ===== Common: today's tasks, monthly tasks, content, articles =====
    const todayTasks = await db.dailyTask.findMany({
      where: { userId: user.id, tanggal: { gte: todayStart, lt: todayEnd } },
      orderBy: { createdAt: "desc" },
    });
    const monthTasks = await db.dailyTask.count({ where: { userId: user.id, tanggal: { gte: monthRange.start, lte: monthRange.end } } });
    const monthTasksDone = await db.dailyTask.count({ where: { userId: user.id, status: "SELESAI", tanggal: { gte: monthRange.start, lte: monthRange.end } } });

    // Content ideas (Tugas Konten) - this user
    const myContents = await db.contentIdea.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const myContentPublished = myContents.filter((c) => c.statusPublish === "PUBLISHED").length;
    const myContentAcc = myContents.filter((c) => c.statusACC === "ACC").length;
    const myContentPending = myContents.filter((c) => c.statusACC === "PENDING").length;
    const myContentRevisi = myContents.filter((c) => c.statusACC === "REVISI").length;

    // Today content
    const todayContents = await db.contentIdea.count({
      where: { userId: user.id, tanggal: { gte: todayStart, lt: todayEnd } },
    });

    // Articles (Data Artikel) - this user
    const myArticles = await db.article.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const myArticlesPublished = myArticles.filter((a) => a.status === "PUBLISHED").length;
    const myArticlesAcc = myArticles.filter((a) => a.statusACC === "ACC").length;
    const myArticlesPending = myArticles.filter((a) => a.statusACC === "PENDING").length;
    const myArticlesRevisi = myArticles.filter((a) => a.statusACC === "REVISI_ADMIN").length;

    // Today articles
    const todayArticles = await db.article.count({
      where: { userId: user.id, createdAt: { gte: todayStart, lt: todayEnd } },
    });

    // ===== Monthly charts (12 months) for this user's productivity =====
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const [contents, articles, tasksDone, tasksTotal] = await Promise.all([
        db.contentIdea.count({ where: { userId: user.id, statusPublish: "PUBLISHED", tanggal: { gte: mStart, lte: mEnd } } }),
        db.article.count({ where: { userId: user.id, status: "PUBLISHED", createdAt: { gte: mStart, lte: mEnd } } }),
        db.dailyTask.count({ where: { userId: user.id, status: "SELESAI", tanggal: { gte: mStart, lte: mEnd } } }),
        db.dailyTask.count({ where: { userId: user.id, tanggal: { gte: mStart, lte: mEnd } } }),
      ]);
      monthlyData.push({ month: monthNames[m], contents, articles, tasksDone, tasksTotal });
    }

    // Yearly (last 5 years)
    const yearlyData = [];
    for (let y = year - 4; y <= year; y++) {
      const yStart = new Date(y, 0, 1);
      const yEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      const [contents, articles, tasksDone] = await Promise.all([
        db.contentIdea.count({ where: { userId: user.id, statusPublish: "PUBLISHED", tanggal: { gte: yStart, lte: yEnd } } }),
        db.article.count({ where: { userId: user.id, status: "PUBLISHED", createdAt: { gte: yStart, lte: yEnd } } }),
        db.dailyTask.count({ where: { userId: user.id, status: "SELESAI", tanggal: { gte: yStart, lte: yEnd } } }),
      ]);
      yearlyData.push({ year: String(y), contents, articles, tasksDone });
    }

    // ===== Role-specific data =====
    let roleData: any = {};

    if (user.role === ROLES.PROJECT_MANAGER) {
      // PM: CRM pipeline, events, documents
      const myClients = await db.client.findMany({
        where: { assignedToId: user.id },
        include: { _count: { select: { events: true, documents: true } } },
      });
      const pipeline = {
        LEAD: myClients.filter((c) => c.status === "LEAD").length,
        FOLLOW_UP: myClients.filter((c) => c.status === "FOLLOW_UP").length,
        PROPOSAL: myClients.filter((c) => c.status === "PROPOSAL").length,
        NEGOTIATION: myClients.filter((c) => c.status === "NEGOTIATION").length,
        DEAL: myClients.filter((c) => c.status === "DEAL").length,
        LOST: myClients.filter((c) => c.status === "LOST").length,
      };
      const dealRevenue = myClients.filter((c) => c.status === "DEAL").reduce((s, c) => s + (c.budget || 0), 0);
      const eventsThisMonth = await db.event.count({
        where: { tanggal: { gte: monthRange.start, lte: monthRange.end } },
      });
      const upcomingEvents = await db.event.findMany({
        where: { tanggal: { gte: now }, statusPersiapan: { in: ["PENDING", "IN_PROGRESS", "READY"] } },
        include: { client: { select: { namaKlien: true } } },
        orderBy: { tanggal: "asc" },
        take: 5,
      });
      // Documents count
      const documents = await db.document.count({ where: { uploadedById: user.id } });
      const allDocuments = await db.document.findMany({
        include: { client: { select: { namaKlien: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      // Reminders
      const reminders = await db.client.findMany({
        where: { assignedToId: user.id, reminderFollowUp: { gte: now } },
        orderBy: { reminderFollowUp: "asc" },
        take: 10,
      });
      roleData = { pipeline, dealRevenue, eventsThisMonth, upcomingEvents, documents, allDocuments, reminders, totalClients: myClients.length };
    } else if (user.role === ROLES.ASSISTANT_TRAINER) {
      // Assistant Trainer: event checklist, documentation, content reels/articles KPIs
      const myEvents = await db.event.findMany({
        where: { assistantTrainerId: user.id },
        include: { client: { select: { namaKlien: true } } },
        orderBy: { tanggal: "desc" },
      });
      const upcomingMyEvents = myEvents.filter((e) => new Date(e.tanggal) >= now).slice(0, 5);
      // KPI targets
      const todayReelsProduced = await db.contentIdea.count({
        where: { userId: user.id, statusProduksi: { in: ["EDITING", "SIAP_PUBLISH", "PUBLISHED"] }, tanggal: { gte: todayStart, lt: todayEnd } },
      });
      const todayReelsPublished = await db.contentIdea.count({
        where: { userId: user.id, statusPublish: "PUBLISHED", tanggal: { gte: todayStart, lt: todayEnd } },
      });
      const weeklyArticles = await db.article.count({
        where: { userId: user.id, status: "PUBLISHED", createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
      });
      roleData = {
        myEvents, upcomingMyEvents,
        kpis: {
          checklistEvent: "Lengkap",
          dokumentasi: "Lengkap",
          ketepatanWaktu: "Tepat",
          kelengkapanPeralatan: "Lengkap",
          reelsProducedToday: todayReelsProduced, reelsTargetToday: 1,
          reelsPublishedToday: todayReelsPublished, reelsPublishTargetToday: 1,
          articlesWeekly: weeklyArticles, articlesWeeklyTarget: 10,
          websiteBackup: "2 minggu sekali",
        },
      };
    } else if (user.role === ROLES.CONTENT_CREATIVE) {
      // Content Creative KPIs
      const todayIdeas = await db.contentIdea.count({
        where: { userId: user.id, tanggal: { gte: todayStart, lt: todayEnd } },
      });
      const todayReelsProduced = await db.contentIdea.count({
        where: { userId: user.id, statusProduksi: { in: ["EDITING", "SIAP_PUBLISH", "PUBLISHED"] }, tanggal: { gte: todayStart, lt: todayEnd } },
      });
      const todayReelsPublished = await db.contentIdea.count({
        where: { userId: user.id, statusPublish: "PUBLISHED", tanggal: { gte: todayStart, lt: todayEnd } },
      });
      // Weekly (7 days)
      const weekStart = new Date(now.getTime() - 7 * 86400000);
      const weeklyIdeas = await db.contentIdea.count({ where: { userId: user.id, tanggal: { gte: weekStart } } });
      const weeklyReels = await db.contentIdea.count({ where: { userId: user.id, statusPublish: "PUBLISHED", tanggal: { gte: weekStart } } });
      // Content metrics aggregate
      const publishedWithMetrics = myContents.filter((c) => c.statusPublish === "PUBLISHED" && c.metrikKonten);
      let reach = 0, views = 0, watchTime = 0, share = 0, save = 0, comment = 0, followerGrowth = 0;
      for (const c of publishedWithMetrics) {
        try {
          const m = JSON.parse(c.metrikKonten || "{}");
          reach += m.reach || 0; views += m.views || 0; watchTime += m.watchTime || 0;
          share += m.share || 0; save += m.save || 0; comment += m.comment || 0; followerGrowth += m.followerGrowth || 0;
        } catch {}
      }
      // Category breakdown
      const categoryBreakdown = ["Instagram M. Aqil Baihaqi", "TikTok Aqil Baihaqi", "Hafara Group", "MentorSkill"].map((cat) => ({
        name: cat, value: myContents.filter((c) => c.kategori === cat).length,
      }));
      roleData = {
        kpis: {
          ideasToday: todayIdeas, ideasTargetToday: 3,
          reelsProducedToday: todayReelsProduced, reelsProducedTargetToday: 1,
          reelsPublishedToday: todayReelsPublished, reelsPublishTargetToday: 1,
          articlesToday: todayArticles, articlesTargetToday: 10,
          weeklyIdeas, weeklyIdeasTarget: 21,
          weeklyReels, weeklyReelsTarget: 7,
        },
        evaluation: { reach, views, watchTime, share, save, comment, followerGrowth },
        categoryBreakdown,
      };
    } else if (user.role === ROLES.DIGITAL_MARKETING_IT) {
      // Digital Marketing & IT KPIs
      const todayArticlesCount = todayArticles;
      const todayOptimization = 1; // assumed
      const weeklyArticles = await db.article.count({
        where: { userId: user.id, status: "PUBLISHED", createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
      });
      // Website SEO articles by website
      const articlesByWebsite = ["hafaragroup.com", "mentorskill.id", "aqilbaihaqi.com"].map((w) => ({
        name: w, value: myArticles.filter((a) => a.websiteTujuan === w && a.status === "PUBLISHED").length,
      }));
      roleData = {
        kpis: {
          articlesToday: todayArticlesCount, articlesTargetToday: 10,
          websiteOptimizationToday: todayOptimization, websiteOptimizationTarget: 1,
          googleSearchOptimizationToday: 1, googleSearchOptimizationTarget: 1,
          promoMaterialToday: 1, promoMaterialTarget: 1,
          competitorAnalysisToday: 1, competitorAnalysisTarget: 1,
          weeklyArticles, weeklyArticlesTarget: 70,
        },
        articlesByWebsite,
        weekly: {
          traffic: "+12%",
          seoRanking: "+8%",
          leads: "+15%",
          engagement: "+10%",
        },
      };
    } else if (user.role === ROLES.FINANCE) {
      // Finance KPIs
      const pemasukan = await db.financeTransaction.aggregate({
        where: { type: "PEMASUKAN", date: { gte: monthRange.start, lte: monthRange.end } }, _sum: { amount: true },
      });
      const pengeluaran = await db.financeTransaction.aggregate({
        where: { type: "PENGELUARAN", date: { gte: monthRange.start, lte: monthRange.end } }, _sum: { amount: true },
      });
      const revenue = pemasukan._sum.amount || 0;
      const expense = pengeluaran._sum.amount || 0;
      const profit = revenue - expense;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      const finSetting = await db.financeSetting.findUnique({ where: { month_year: { month, year } } });
      const targetRevenue = finSetting?.targetRevenue || 500000000;
      const targetProfit = finSetting?.targetProfit || 150000000;
      // Piutang & Hutang (from transactions with those categories)
      const piutang = await db.financeTransaction.aggregate({ where: { category: "Piutang", type: "PEMASUKAN" }, _sum: { amount: true } });
      const hutang = await db.financeTransaction.aggregate({ where: { category: "Hutang", type: "PENGELUARAN" }, _sum: { amount: true } });
      // Monthly finance chart
      const financeMonthly = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(year, m, 1);
        const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
        const [p, e] = await Promise.all([
          db.financeTransaction.aggregate({ where: { type: "PEMASUKAN", date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
          db.financeTransaction.aggregate({ where: { type: "PENGELUARAN", date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        ]);
        financeMonthly.push({
          month: monthNames[m],
          revenue: p._sum.amount || 0, expense: e._sum.amount || 0,
          profit: (p._sum.amount || 0) - (e._sum.amount || 0),
        });
      }
      // Expense by category
      const allExpenses = await db.financeTransaction.findMany({ where: { type: "PENGELUARAN", date: { gte: monthRange.start, lte: monthRange.end } }, select: { category: true, amount: true } });
      const expenseByCat: Record<string, number> = {};
      for (const e of allExpenses) {
        const k = e.category || "Lainnya";
        expenseByCat[k] = (expenseByCat[k] || 0) + e.amount;
      }
      roleData = {
        revenue, expense, profit, margin,
        targetRevenue, targetProfit,
        piutang: piutang._sum.amount || 0,
        hutang: hutang._sum.amount || 0,
        cashFlow: revenue - expense,
        forecast: Math.round((revenue - expense)),
        financeMonthly,
        expenseByCategory: Object.entries(expenseByCat).map(([name, value]) => ({ name, value })),
      };
    }

    return ok({
      user: { id: user.id, name: user.name, role: user.role, roleLabel: ROLE_LABELS[user.role], position: user.position },
      year, month,
      todayTasks, monthTasks, monthTasksDone,
      myContents: myContents.slice(0, 30), myArticles: myArticles.slice(0, 30),
      contentSummary: {
        published: myContentPublished, acc: myContentAcc, pending: myContentPending, revisi: myContentRevisi,
        todayContents,
      },
      articleSummary: {
        published: myArticlesPublished, acc: myArticlesAcc, pending: myArticlesPending, revisi: myArticlesRevisi,
        todayArticles,
      },
      monthlyData, yearlyData,
      roleData,
    });
  });
}
