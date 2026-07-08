// Finance aggregation engine - computes dashboard data, neraca, laporan
import { db } from "./db";

export async function getFinanceDashboard(year: number, month: number) {
  const now = new Date();
  const isAllYears = year === 0; // year=0 means "Semua Tahun" (accumulate all years)
  const isAllMonths = month === 0; // month=0 means "Semua Bulan" (accumulate all months in that year)

  // Determine date range for month/period-specific data
  let periodStart: Date, periodEnd: Date;
  if (isAllYears) {
    // All years: use full range
    periodStart = new Date(2000, 0, 1);
    periodEnd = new Date(2100, 11, 31, 23, 59, 59, 999);
  } else if (isAllMonths) {
    // All months in a specific year
    periodStart = new Date(year, 0, 1);
    periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  } else {
    // Specific month in a specific year
    periodStart = new Date(year, month - 1, 1);
    periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  }

  // ===== All transactions =====
  const allTxns = await db.financeTransaction.findMany({});
  const pemasukan = allTxns.filter((t) => t.type === "PEMASUKAN" && t.isPaid);
  const pengeluaran = allTxns.filter((t) => t.type === "PENGELUARAN" && t.isPaid);

  // ===== Saldo by account type (always accumulated from ALL transactions) =====
  const totalSaldo = pemasukan.reduce((s, t) => s + t.amount, 0) - pengeluaran.reduce((s, t) => s + t.amount, 0);
  const kasSaldo = allTxns.filter((t) => t.accountType === "KAS" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const bankSaldo = allTxns.filter((t) => t.accountType === "BANK" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const ewalletSaldo = allTxns.filter((t) => t.accountType === "EWALLET" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);

  // ===== Piutang & Hutang =====
  const piutangTxns = allTxns.filter((t) => t.type === "PEMASUKAN" && !t.isPaid);
  const hutangTxns = allTxns.filter((t) => t.type === "PENGELUARAN" && !t.isPaid);
  const totalPiutang = piutangTxns.reduce((s, t) => s + t.amount, 0);
  const totalHutang = hutangTxns.reduce((s, t) => s + t.amount, 0);

  // ===== Period-specific (month or year or all) =====
  const periodPemasukan = pemasukan.filter((t) => t.date >= periodStart && t.date <= periodEnd).reduce((s, t) => s + t.amount, 0);
  const periodPengeluaran = pengeluaran.filter((t) => t.date >= periodStart && t.date <= periodEnd).reduce((s, t) => s + t.amount, 0);
  const periodLaba = periodPemasukan - periodPengeluaran;

  // ===== Tax due =====
  const taxPayments = await db.taxPayment.findMany({});
  const taxDue = taxPayments.filter((t) => t.status === "TERUTANG").reduce((s, t) => s + (t.taxDue - t.taxPaid), 0);
  const taxPaid = taxPayments.filter((t) => t.status === "DIBAYAR").reduce((s, t) => s + t.taxPaid, 0);

  // ===== Chart data =====
  let chartData: { month: string; pemasukan: number; pengeluaran: number; laba: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  if (isAllYears) {
    // Show yearly accumulation when "Semua Tahun" selected
    const yearSet = new Set<number>();
    for (const t of allTxns) {
      yearSet.add(t.date.getFullYear());
    }
    const years = Array.from(yearSet).sort((a, b) => a - b);
    for (const y of years) {
      const yStart = new Date(y, 0, 1);
      const yEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      const yPem = pemasukan.filter((t) => t.date >= yStart && t.date <= yEnd).reduce((s, t) => s + t.amount, 0);
      const yPeng = pengeluaran.filter((t) => t.date >= yStart && t.date <= yEnd).reduce((s, t) => s + t.amount, 0);
      chartData.push({ month: String(y), pemasukan: yPem, pengeluaran: yPeng, laba: yPem - yPeng });
    }
  } else {
    // Show 12 months of the selected year
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const mPem = pemasukan.filter((t) => t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
      const mPeng = pengeluaran.filter((t) => t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
      chartData.push({ month: monthNames[m], pemasukan: mPem, pengeluaran: mPeng, laba: mPem - mPeng });
    }
  }

  // ===== Expense by category (for selected period) =====
  const expenseByCat: Record<string, number> = {};
  for (const t of pengeluaran.filter((t) => t.date >= periodStart && t.date <= periodEnd)) {
    const k = t.category || "Lainnya";
    expenseByCat[k] = (expenseByCat[k] || 0) + t.amount;
  }

  // ===== Income by category (for selected period) =====
  const incomeByCat: Record<string, number> = {};
  for (const t of pemasukan.filter((t) => t.date >= periodStart && t.date <= periodEnd)) {
    const k = t.category || "Lainnya";
    incomeByCat[k] = (incomeByCat[k] || 0) + t.amount;
  }

  // ===== Reminders =====
  const upcomingTax = taxPayments.filter((t) => t.status !== "DIBAYAR" && t.dueDate >= now).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5);
  const upcomingPiutang = piutangTxns.filter((t) => t.dueDate && t.dueDate >= now).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)).slice(0, 5);
  const upcomingHutang = hutangTxns.filter((t) => t.dueDate && t.dueDate >= now).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)).slice(0, 5);

  // ===== Forecast =====
  const recentData = isAllYears ? chartData.slice(-3) : chartData.slice(Math.max(0, now.getMonth() - 2), now.getMonth() + 1).filter((m) => now.getMonth() >= 0);
  const avgPemasukan = recentData.length > 0 ? recentData.reduce((s, m) => s + m.pemasukan, 0) / Math.max(recentData.length, 1) : periodPemasukan;
  const avgPengeluaran = recentData.length > 0 ? recentData.reduce((s, m) => s + m.pengeluaran, 0) / Math.max(recentData.length, 1) : periodPengeluaran;
  const avgLaba = avgPemasukan - avgPengeluaran;
  const forecastCashFlow = totalSaldo + avgLaba;
  const forecastProfit = avgLaba;
  const periodProfit = chartData.reduce((s, m) => s + m.laba, 0);
  const forecastTax = Math.max(0, periodProfit) * 0.22;

  return {
    totalSaldo, kasSaldo, bankSaldo, ewalletSaldo,
    totalPiutang, totalHutang,
    monthPemasukan: periodPemasukan, monthPengeluaran: periodPengeluaran, monthLaba: periodLaba,
    taxDue, taxPaid,
    monthlyData: chartData, expenseByCat, incomeByCat,
    reminders: { upcomingTax, upcomingPiutang, upcomingHutang },
    forecast: { cashFlow: forecastCashFlow, profit: forecastProfit, tax: forecastTax },
  };
}

// ===== NERACA (auto-generated from transactions) =====
export async function getNeraca(year: number, month: number) {
  const asOf = new Date(year, month, 0, 23, 59, 59, 999);
  const allTxns = await db.financeTransaction.findMany({ where: { date: { lte: asOf } } });
  const inventory = await db.inventory.findMany({});

  const pemasukan = allTxns.filter((t) => t.type === "PEMASUKAN" && t.isPaid);
  const pengeluaran = allTxns.filter((t) => t.type === "PENGELUARAN" && t.isPaid);

  // ASET
  const kas = allTxns.filter((t) => t.accountType === "KAS" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const bank = allTxns.filter((t) => t.accountType === "BANK" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const ewallet = allTxns.filter((t) => t.accountType === "EWALLET" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const piutang = allTxns.filter((t) => t.type === "PEMASUKAN" && !t.isPaid).reduce((s, t) => s + t.amount, 0);
  const totalAsetLancar = kas + bank + ewallet + piutang;

  const inventarisValue = inventory.reduce((s, i) => s + i.currentValue, 0);
  const inventarisCost = inventory.reduce((s, i) => s + i.purchasePrice, 0);
  const akumulasiPenyusutan = inventory.reduce((s, i) => s + i.accumulatedDepreciation, 0);
  const totalAsetTetap = inventarisValue;
  const totalAset = totalAsetLancar + totalAsetTetap;

  // KEWAJIBAN
  const hutang = allTxns.filter((t) => t.type === "PENGELUARAN" && !t.isPaid).reduce((s, t) => s + t.amount, 0);
  const pajakTerutang = await db.taxPayment.aggregate({ where: { status: "TERUTANG" }, _sum: { taxDue: true } });
  const totalKewajiban = hutang + (pajakTerutang._sum.taxDue || 0);

  // MODAL
  const labaDitahan = pemasukan.reduce((s, t) => s + t.amount, 0) - pengeluaran.reduce((s, t) => s + t.amount, 0);
  // Modal awal asumsi 0 (atau bisa dari setting)
  const totalModal = labaDitahan;

  return {
    aset: {
      kas, bank, ewallet, piutang,
      totalAsetLancar,
      inventaris: inventarisValue,
      inventarisCost,
      akumulasiPenyusutan,
      totalAsetTetap,
      totalAset,
    },
    kewajiban: {
      hutang,
      pajakTerutang: pajakTerutang._sum.taxDue || 0,
      totalKewajiban,
    },
    modal: {
      labaDitahan,
      totalModal,
    },
    totalEkuitas: totalKewajiban + totalModal,
    // Check: totalAset should equal totalEkuitas
    balanced: Math.abs(totalAset - (totalKewajiban + totalModal)) < 1000,
  };
}

// ===== LABA RUGI (sesuai format spesifikasi) =====

// Mapping kategori transaksi → akun laba rugi
export const PENDAPATAN_AKUN = [
  { akun: "Pendapatan Training & Motivation", categories: ["Honor Training", "Workshop", "Seminar", "Coaching", "Mentoring", "Pendapatan Training"] },
  { akun: "Pendapatan Jasa Konsultasi", categories: ["Consulting", "Pendapatan Konsultasi"] },
  { akun: "Pendapatan Sertifikasi", categories: ["Membership", "Penjualan Modul", "Penjualan Buku"] },
  { akun: "Pendapatan Lain-lain", categories: ["Affiliate", "Investasi", "Lainnya"] },
];

export const BIAYA_AKUN = [
  { akun: "Beban Gaji & Bonus", categories: ["Gaji"] },
  { akun: "Biaya Operasional Kantor", categories: ["Operasional", "Sewa Kantor", "Event"] },
  { akun: "Biaya Internet", categories: ["Internet", "Hosting", "Domain", "IT"] },
  { akun: "Biaya Listrik, Air & Kebersihan", categories: ["Listrik", "Air"] },
  { akun: "Biaya Sosial", categories: ["Konsumsi"] },
  { akun: "Biaya Transportasi", categories: ["Transportasi"] },
  { akun: "Biaya Kredit Bank", categories: ["Pajak"] },
  { akun: "Biaya Marketing & Promosi", categories: ["Marketing", "Iklan"] },
  { akun: "Biaya Penyusutan", categories: [] }, // auto from inventory
  { akun: "Biaya Sewa", categories: ["Sewa Kantor"] },
  { akun: "Biaya ATK", categories: ["Peralatan", "Software"] },
  { akun: "Biaya Perjalanan Dinas", categories: ["Hotel", "Transportasi"] },
  { akun: "Biaya Konsumsi", categories: ["Konsumsi"] },
  { akun: "Biaya Lain-lain", categories: ["Lainnya", "AI Subscription", "Laptop"] },
];

export async function getLabaRugi(year: number, month: number, periodType: string = "BULANAN", customStart?: Date, customEnd?: Date) {
  // Determine date range based on period type
  let start: Date, end: Date, periodeLabel: string;
  if (periodType === "CUSTOM" && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    periodeLabel = `${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")}`;
  } else if (periodType === "TAHUNAN") {
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31, 23, 59, 59, 999);
    periodeLabel = `Tahun ${year}`;
  } else if (periodType === "SEMESTER") {
    // Semester 1: Jan-Jun, Semester 2: Jul-Dec
    if (month <= 6) { start = new Date(year, 0, 1); end = new Date(year, 5, 30, 23, 59, 59, 999); periodeLabel = `Semester 1 ${year}`; }
    else { start = new Date(year, 6, 1); end = new Date(year, 11, 31, 23, 59, 59, 999); periodeLabel = `Semester 2 ${year}`; }
  } else if (periodType === "TRIWULAN") {
    const q = Math.ceil(month / 3);
    start = new Date(year, (q - 1) * 3, 1);
    end = new Date(year, q * 3, 0, 23, 59, 59, 999);
    periodeLabel = `Triwulan ${q} ${year}`;
  } else {
    // BULANAN (default)
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0, 23, 59, 59, 999);
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    periodeLabel = `${monthNames[month - 1]} ${year}`;
  }

  const txns = await db.financeTransaction.findMany({ where: { date: { gte: start, lte: end } } });
  const pemasukan = txns.filter((t) => t.type === "PEMASUKAN" && t.isPaid);
  const pengeluaran = txns.filter((t) => t.type === "PENGELUARAN" && t.isPaid);

  // ===== PENDAPATAN per akun =====
  const pendapatanItems = PENDAPATAN_AKUN.map((p) => {
    const total = pemasukan
      .filter((t) => p.categories.includes(t.category || ""))
      .reduce((s, t) => s + t.amount, 0);
    return { akun: p.akun, jumlah: total };
  });
  const totalPendapatan = pendapatanItems.reduce((s, p) => s + p.jumlah, 0);

  // ===== BIAYA per akun =====
  // Get depreciation from inventory
  const inventory = await db.inventory.findMany({});
  const totalDepreciation = inventory.reduce((s, i) => {
    const annualDep = i.purchasePrice / i.usefulLife;
    // prorate to period (approximate: monthly depreciation * months in period)
    const monthsInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return s + (annualDep / 12) * monthsInPeriod;
  }, 0);

  const biayaItems = BIAYA_AKUN.map((b) => {
    let total = pengeluaran
      .filter((t) => b.categories.includes(t.category || ""))
      .reduce((s, t) => s + t.amount, 0);
    // Add depreciation to "Biaya Penyusutan"
    if (b.akun === "Biaya Penyusutan") total = Math.round(totalDepreciation);
    return { akun: b.akun, jumlah: total };
  });
  const totalBiaya = biayaItems.reduce((s, b) => s + b.jumlah, 0);

  // ===== LABA SEBELUM PAJAK =====
  const labaSebelumPajak = totalPendapatan - totalBiaya;

  // ===== PAJAK =====
  // Get PPh Badan rate from config
  const pphBadanConfig = await db.taxConfig.findFirst({ where: { taxType: "PPH_BADAN", isActive: true } });
  const pphBadanRate = pphBadanConfig?.rate || 22;

  // Check if user has done fiscal reconciliation (rekonsiliasi fiskal)
  // For now: no fiscal reconciliation stored, so use commercial profit as estimate
  const hasFiscalReconciliation = false; // TODO: implement fiscal reconciliation feature
  const labaFiskal = hasFiscalReconciliation ? labaSebelumPajak : labaSebelumPajak; // simplified
  const pajakPenghasilan = Math.max(0, labaFiskal) * (pphBadanRate / 100);

  // ===== LABA BERSIH =====
  const labaBersih = labaSebelumPajak - pajakPenghasilan;

  return {
    periodeLabel,
    periodType,
    start, end,
    pendapatanItems,
    totalPendapatan,
    biayaItems,
    totalBiaya,
    labaSebelumPajak,
    pajakPenghasilan,
    pphBadanRate,
    hasFiscalReconciliation,
    pajakNote: hasFiscalReconciliation
      ? "Pajak dihitung dari Penghasilan Kena Pajak (Laba Fiskal) setelah rekonsiliasi fiskal."
      : "Estimasi Pajak berdasarkan laba komersial.",
    labaBersih,
  };
}

