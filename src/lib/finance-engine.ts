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
  // If month=0 (Semua Bulan), use end of year as "as of" date
  const asOf = month === 0
    ? new Date(year, 11, 31, 23, 59, 59, 999)
    : new Date(year, month, 0, 23, 59, 59, 999);
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

// Mapping kategori transaksi → akun laba rugi (expanded to match actual DB categories)
// Categories not in this map will be added as their own line items (catch-all)
// to ensure 100% sync with Arus Kas data.
export const PENDAPATAN_AKUN = [
  { akun: "Pendapatan Training & Motivation", categories: ["Honor Training", "Workshop", "Seminar", "Coaching", "Mentoring", "Pendapatan Training", "Training Fee", "Training"] },
  { akun: "Pendapatan Jasa Konsultasi", categories: ["Consulting", "Pendapatan Konsultasi", "Konsultasi"] },
  { akun: "Pendapatan Sertifikasi", categories: ["Membership", "Penjualan Modul", "Penjualan Buku", "Sertifikasi"] },
  { akun: "Pendapatan Lain-lain", categories: ["Affiliate", "Investasi", "Lainnya", "Other", "Lain-lain"] },
];

export const BIAYA_AKUN = [
  { akun: "Beban Gaji & Bonus", categories: ["Gaji", "Gaji karyawan", "Gaji Karyawan", "Bonus", "Salary", "Associate Trainer"] },
  { akun: "Biaya Operasional Kantor", categories: ["Operasional", "Sewa Kantor", "Event", "Kebutuhan Kantor", "Over Kredit Kantor", "Investasi Pembangunan Kantor"] },
  { akun: "Biaya Internet & Komunikasi", categories: ["Internet", "Hosting", "Domain", "IT", "Website", "Wifi", "Subcription", "Subscription", "AI Subscription"] },
  { akun: "Biaya Listrik, Air & Kebersihan", categories: ["Listrik", "Air", "Sampah dan Air"] },
  { akun: "Biaya Konsumsi", categories: ["Konsumsi", "Belanja Bulanan"] },
  { akun: "Biaya Transportasi & Perjalanan", categories: ["Transportasi", "Transport Akomodasi", "Hotel"] },
  { akun: "Biaya Cicilan & Kredit", categories: ["Cicilan", "Pajak", "BPJS Kesehatan"] },
  { akun: "Biaya Marketing & Promosi", categories: ["Marketing", "Iklan"] },
  { akun: "Biaya ATK & Peralatan", categories: ["Peralatan", "Software", "Laptop"] },
  { akun: "Biaya Pendidikan & Pengembangan", categories: ["Pendidikan"] },
  { akun: "Biaya Lain-lain", categories: ["Lainnya", "Lain-lain"] },
];

export async function getLabaRugi(year: number, month: number, periodType: string = "BULANAN", customStart?: Date, customEnd?: Date) {
  // Determine date range based on period type
  let start: Date, end: Date, periodeLabel: string;
  // If month=0 (Semua Bulan), treat as TAHUNAN regardless of periodType
  const pt = (month === 0 && periodType === "BULANAN") ? "TAHUNAN" : periodType;
  if (pt === "CUSTOM" && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    periodeLabel = `${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")}`;
  } else if (pt === "TAHUNAN") {
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31, 23, 59, 59, 999);
    periodeLabel = `Tahun ${year}`;
  } else if (pt === "SEMESTER") {
    // Semester 1: Jan-Jun, Semester 2: Jul-Dec
    if (month <= 6) { start = new Date(year, 0, 1); end = new Date(year, 5, 30, 23, 59, 59, 999); periodeLabel = `Semester 1 ${year}`; }
    else { start = new Date(year, 6, 1); end = new Date(year, 11, 31, 23, 59, 59, 999); periodeLabel = `Semester 2 ${year}`; }
  } else if (pt === "TRIWULAN") {
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

  // ===== PENDAPATAN per akun (with catch-all for unmapped categories) =====
  // Build a reverse map: category → akun name
  const pemCatToAkun: Record<string, string> = {};
  for (const p of PENDAPATAN_AKUN) {
    for (const cat of p.categories) pemCatToAkun[cat] = p.akun;
  }
  // Aggregate pemasukan by akun
  const pemByAkun: Record<string, number> = {};
  for (const t of pemasukan) {
    const cat = t.category || "Lainnya";
    const akun = pemCatToAkun[cat] || `Pendapatan ${cat}`; // unmapped → own line item
    pemByAkun[akun] = (pemByAkun[akun] || 0) + t.amount;
  }
  // Build pendapatanItems in the order of PENDAPATAN_AKUN, then append any extra akuns
  const pendapatanItems: { akun: string; jumlah: number }[] = [];
  for (const p of PENDAPATAN_AKUN) {
    if (pemByAkun[p.akun] !== undefined) {
      pendapatanItems.push({ akun: p.akun, jumlah: pemByAkun[p.akun] });
      delete pemByAkun[p.akun];
    }
  }
  // Append any remaining unmapped akuns (ensures ALL transactions are counted)
  for (const [akun, jumlah] of Object.entries(pemByAkun).sort()) {
    pendapatanItems.push({ akun, jumlah });
  }
  const totalPendapatan = pendapatanItems.reduce((s, p) => s + p.jumlah, 0);

  // ===== BIAYA per akun (with catch-all for unmapped categories) =====
  // Get depreciation from inventory
  const inventory = await db.inventory.findMany({});
  const totalDepreciation = inventory.reduce((s, i) => {
    const annualDep = i.purchasePrice / i.usefulLife;
    // prorate to period (approximate: monthly depreciation * months in period)
    const monthsInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return s + (annualDep / 12) * monthsInPeriod;
  }, 0);

  // Build reverse map: category → akun name
  const pengCatToAkun: Record<string, string> = {};
  for (const b of BIAYA_AKUN) {
    for (const cat of b.categories) pengCatToAkun[cat] = b.akun;
  }
  // Aggregate pengeluaran by akun
  const pengByAkun: Record<string, number> = {};
  for (const t of pengeluaran) {
    const cat = t.category || "Lainnya";
    const akun = pengCatToAkun[cat] || `Biaya ${cat}`; // unmapped → own line item
    pengByAkun[akun] = (pengByAkun[akun] || 0) + t.amount;
  }
  // Build biayaItems in the order of BIAYA_AKUN, then append any extra akuns
  const biayaItems: { akun: string; jumlah: number }[] = [];
  for (const b of BIAYA_AKUN) {
    if (b.akun === "Biaya Penyusutan") continue; // handled separately below
    if (pengByAkun[b.akun] !== undefined) {
      biayaItems.push({ akun: b.akun, jumlah: pengByAkun[b.akun] });
      delete pengByAkun[b.akun];
    }
  }
  // Append any remaining unmapped akuns (ensures ALL transactions are counted)
  for (const [akun, jumlah] of Object.entries(pengByAkun).sort()) {
    biayaItems.push({ akun, jumlah });
  }
  // Add depreciation as last biaya item
  biayaItems.push({ akun: "Biaya Penyusutan", jumlah: Math.round(totalDepreciation) });

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
    periodType: pt,
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

