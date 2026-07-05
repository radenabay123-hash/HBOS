// Finance aggregation engine - computes dashboard data, neraca, laporan
import { db } from "./db";

export async function getFinanceDashboard(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const now = new Date();

  // ===== All transactions =====
  const allTxns = await db.financeTransaction.findMany({});
  const pemasukan = allTxns.filter((t) => t.type === "PEMASUKAN" && t.isPaid);
  const pengeluaran = allTxns.filter((t) => t.type === "PENGELUARAN" && t.isPaid);

  // ===== Saldo by account type =====
  const totalSaldo = pemasukan.reduce((s, t) => s + t.amount, 0) - pengeluaran.reduce((s, t) => s + t.amount, 0);
  const kasSaldo = allTxns.filter((t) => t.accountType === "KAS" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const bankSaldo = allTxns.filter((t) => t.accountType === "BANK" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);
  const ewalletSaldo = allTxns.filter((t) => t.accountType === "EWALLET" && t.isPaid).reduce((s, t) => s + (t.type === "PEMASUKAN" ? t.amount : t.type === "PENGELUARAN" ? -t.amount : 0), 0);

  // ===== Piutang & Hutang =====
  const piutangTxns = allTxns.filter((t) => t.type === "PEMASUKAN" && !t.isPaid);
  const hutangTxns = allTxns.filter((t) => t.type === "PENGELUARAN" && !t.isPaid);
  const totalPiutang = piutangTxns.reduce((s, t) => s + t.amount, 0);
  const totalHutang = hutangTxns.reduce((s, t) => s + t.amount, 0);

  // ===== Month-specific =====
  const monthPemasukan = pemasukan.filter((t) => t.date >= monthStart && t.date <= monthEnd).reduce((s, t) => s + t.amount, 0);
  const monthPengeluaran = pengeluaran.filter((t) => t.date >= monthStart && t.date <= monthEnd).reduce((s, t) => s + t.amount, 0);
  const monthLaba = monthPemasukan - monthPengeluaran;

  // ===== Tax due =====
  const taxPayments = await db.taxPayment.findMany({});
  const taxDue = taxPayments.filter((t) => t.status === "TERUTANG").reduce((s, t) => s + (t.taxDue - t.taxPaid), 0);
  const taxPaid = taxPayments.filter((t) => t.status === "DIBAYAR").reduce((s, t) => s + t.taxPaid, 0);

  // ===== Monthly chart (12 months) =====
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthlyData = [];
  for (let m = 0; m < 12; m++) {
    const mStart = new Date(year, m, 1);
    const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const mPem = pemasukan.filter((t) => t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
    const mPeng = pengeluaran.filter((t) => t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
    monthlyData.push({ month: monthNames[m], pemasukan: mPem, pengeluaran: mPeng, laba: mPem - mPeng });
  }

  // ===== Expense by category =====
  const expenseByCat: Record<string, number> = {};
  for (const t of pengeluaran.filter((t) => t.date >= monthStart && t.date <= monthEnd)) {
    const k = t.category || "Lainnya";
    expenseByCat[k] = (expenseByCat[k] || 0) + t.amount;
  }

  // ===== Income by category =====
  const incomeByCat: Record<string, number> = {};
  for (const t of pemasukan.filter((t) => t.date >= monthStart && t.date <= monthEnd)) {
    const k = t.category || "Lainnya";
    incomeByCat[k] = (incomeByCat[k] || 0) + t.amount;
  }

  // ===== Reminders =====
  const upcomingTax = taxPayments.filter((t) => t.status !== "DIBAYAR" && t.dueDate >= now).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5);
  const upcomingPiutang = piutangTxns.filter((t) => t.dueDate && t.dueDate >= now).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)).slice(0, 5);
  const upcomingHutang = hutangTxns.filter((t) => t.dueDate && t.dueDate >= now).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)).slice(0, 5);

  // ===== Forecast (simple linear: avg of last 3 months) =====
  const last3 = monthlyData.slice(Math.max(0, now.getMonth() - 2), now.getMonth() + 1).filter((m) => now.getMonth() >= 0);
  const avgPemasukan = last3.length > 0 ? last3.reduce((s, m) => s + m.pemasukan, 0) / Math.max(last3.length, 1) : monthPemasukan;
  const avgPengeluaran = last3.length > 0 ? last3.reduce((s, m) => s + m.pengeluaran, 0) / Math.max(last3.length, 1) : monthPengeluaran;
  const avgLaba = avgPemasukan - avgPengeluaran;
  const forecastCashFlow = totalSaldo + avgLaba;
  const forecastProfit = avgLaba;
  // Forecast pajak: estimate PPh Badan 22% of profit
  const yearProfit = monthlyData.reduce((s, m) => s + m.laba, 0);
  const forecastTax = Math.max(0, yearProfit) * 0.22;

  return {
    totalSaldo, kasSaldo, bankSaldo, ewalletSaldo,
    totalPiutang, totalHutang,
    monthPemasukan, monthPengeluaran, monthLaba,
    taxDue, taxPaid,
    monthlyData, expenseByCat, incomeByCat,
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

// ===== LABA RUGI =====
export async function getLabaRugi(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const txns = await db.financeTransaction.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } });

  const pemasukan = txns.filter((t) => t.type === "PEMASUKAN" && t.isPaid);
  const pengeluaran = txns.filter((t) => t.type === "PENGELUARAN" && t.isPaid);
  const totalPendapatan = pemasukan.reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.amount, 0);

  // Pendapatan by category
  const pendapatanByCat: Record<string, number> = {};
  for (const t of pemasukan) {
    const k = t.category || "Lainnya";
    pendapatanByCat[k] = (pendapatanByCat[k] || 0) + t.amount;
  }
  // Biaya by category
  const biayaByCat: Record<string, number> = {};
  for (const t of pengeluaran) {
    const k = t.category || "Lainnya";
    biayaByCat[k] = (biayaByCat[k] || 0) + t.amount;
  }

  const labaKotor = totalPendapatan - (biayaByCat["Honor Training"] || 0);
  const labaOperasi = totalPendapatan - totalPengeluaran;
  const pajakEstimasi = Math.max(0, labaOperasi) * 0.22;
  const labaBersih = labaOperasi - pajakEstimasi;

  return {
    totalPendapatan, totalPengeluaran,
    pendapatanByCat, biayaByCat,
    labaKotor, labaOperasi, pajakEstimasi, labaBersih,
  };
}
