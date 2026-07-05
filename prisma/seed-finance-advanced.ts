import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding Finance categories, inventory, and tax config...");

  // ===== KATEGORI PEMASUKAN =====
  const pemasukanCats = [
    { name: "Honor Training", icon: "GraduationCap", color: "blue" },
    { name: "Consulting", icon: "Lightbulb", color: "cyan" },
    { name: "Workshop", icon: "Users", color: "violet" },
    { name: "Seminar", icon: "Presentation", color: "amber" },
    { name: "Coaching", icon: "Target", color: "green" },
    { name: "Mentoring", icon: "Compass", color: "teal" },
    { name: "Penjualan Modul", icon: "BookOpen", color: "pink" },
    { name: "Penjualan Buku", icon: "Book", color: "rose" },
    { name: "Membership", icon: "Crown", color: "indigo" },
    { name: "Affiliate", icon: "Share2", color: "sky" },
    { name: "Investasi", icon: "TrendingUp", color: "emerald" },
    { name: "Lainnya", icon: "MoreHorizontal", color: "slate" },
  ];
  for (const c of pemasukanCats) {
    await db.financeCategory.upsert({
      where: { name_type: { name: c.name, type: "PEMASUKAN" } },
      update: {},
      create: { ...c, type: "PEMASUKAN", isDefault: true },
    });
  }

  // ===== KATEGORI PENGELUARAN =====
  const pengeluaranCats = [
    { name: "Transportasi", icon: "Car", color: "blue" },
    { name: "Hotel", icon: "Building", color: "cyan" },
    { name: "Konsumsi", icon: "UtensilsCrossed", color: "amber" },
    { name: "Marketing", icon: "Megaphone", color: "rose" },
    { name: "Iklan", icon: "MousePointerClick", color: "pink" },
    { name: "Gaji", icon: "Wallet", color: "green" },
    { name: "Internet", icon: "Wifi", color: "violet" },
    { name: "Hosting", icon: "Server", color: "indigo" },
    { name: "Domain", icon: "Globe", color: "sky" },
    { name: "Operasional", icon: "Briefcase", color: "slate" },
    { name: "Pajak", icon: "Receipt", color: "red" },
    { name: "Peralatan", icon: "Tool", color: "teal" },
    { name: "Laptop", icon: "Laptop", color: "blue" },
    { name: "Software", icon: "Download", color: "cyan" },
    { name: "AI Subscription", icon: "Bot", color: "violet" },
    { name: "Listrik", icon: "Zap", color: "amber" },
    { name: "Air", icon: "Droplets", color: "sky" },
    { name: "Sewa Kantor", icon: "Home", color: "emerald" },
    { name: "Lainnya", icon: "MoreHorizontal", color: "slate" },
  ];
  for (const c of pengeluaranCats) {
    await db.financeCategory.upsert({
      where: { name_type: { name: c.name, type: "PENGELUARAN" } },
      update: {},
      create: { ...c, type: "PENGELUARAN", isDefault: true },
    });
  }
  console.log("Categories seeded");

  // ===== INVENTARIS (contoh aset) =====
  const inventaris = [
    { name: "Laptop MacBook Pro M2", category: "LAPTOP", location: "Kantor Jombang", pic: "M. Aqil Baihaqi", purchaseDate: new Date(2024, 2, 15), purchasePrice: 28000000, usefulLife: 4 },
    { name: "Laptop ASUS VivoBook", category: "LAPTOP", location: "Kantor Jombang", pic: "Dewi Lestari", purchaseDate: new Date(2024, 5, 10), purchasePrice: 12000000, usefulLife: 4 },
    { name: "Kamera Canon EOS M50", category: "KAMERA", location: "Studio", pic: "Ahmad Fauzi", purchaseDate: new Date(2024, 0, 20), purchasePrice: 15000000, usefulLife: 5 },
    { name: "Printer Epson L3110", category: "PRINTER", location: "Kantor Jombang", pic: "Nur Hidayah", purchaseDate: new Date(2024, 8, 5), purchasePrice: 2500000, usefulLife: 5 },
    { name: "Proyektor Epson EB-X51", category: "PROYEKTOR", location: "Ruang Training", pic: "Siti Rahma", purchaseDate: new Date(2024, 3, 12), purchasePrice: 8000000, usefulLife: 6 },
    { name: "Monitor LG 27 inch", category: "MONITOR", location: "Kantor Jombang", pic: "Rizki Pratama", purchaseDate: new Date(2024, 6, 18), purchasePrice: 3500000, usefulLife: 5 },
    { name: "Meja Kerja Eksekutif", category: "MEJA", location: "Kantor Jombang", pic: "M. Aqil Baihaqi", purchaseDate: new Date(2023, 11, 1), purchasePrice: 5000000, usefulLife: 10 },
    { name: "Kursi Ergonomis", category: "KURSI", location: "Kantor Jombang", pic: "M. Aqil Baihaqi", purchaseDate: new Date(2023, 11, 1), purchasePrice: 3000000, usefulLife: 8 },
    { name: "Mobil Toyota Avanza", category: "MOBIL", location: "Garasi Kantor", pic: "M. Aqil Baihaqi", purchaseDate: new Date(2023, 5, 20), purchasePrice: 220000000, usefulLife: 8 },
    { name: "Motor Honda Vario", category: "MOTOR", location: "Garasi Kantor", pic: "Ahmad Fauzi", purchaseDate: new Date(2024, 1, 14), purchasePrice: 25000000, usefulLife: 7 },
  ];

  for (const item of inventaris) {
    // Calculate depreciation (straight line)
    const now = new Date();
    const yearsElapsed = (now.getTime() - item.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const annualDepreciation = item.purchasePrice / item.usefulLife;
    const accumulatedDep = Math.min(annualDepreciation * yearsElapsed, item.purchasePrice);
    const currentValue = Math.max(item.purchasePrice - accumulatedDep, 0);
    const nextMaintenance = new Date(now.getFullYear(), now.getMonth() + 3, 1);

    await db.inventory.create({
      data: {
        ...item,
        currentValue: Math.round(currentValue),
        accumulatedDepreciation: Math.round(accumulatedDep),
        depreciationMethod: "STRAIGHT_LINE",
        status: "AKTIF",
        nextMaintenance,
      },
    });
  }
  console.log("Inventory seeded:", inventaris.length, "items");

  // ===== TAX CONFIG (Indonesia 2025/2026) =====
  // PPh 21 - progressive brackets (PTKP TK/0 = 54jt/year)
  const pph21Brackets = JSON.stringify([
    { min: 0, max: 60000000, rate: 5 },
    { min: 60000000, max: 250000000, rate: 15 },
    { min: 250000000, max: 500000000, rate: 25 },
    { min: 500000000, max: 5000000000, rate: 30 },
    { min: 5000000000, max: null, rate: 35 },
  ]);
  const ptkp = JSON.stringify({
    TK0: 54000000, TK1: 58500000, TK2: 63000000, TK3: 67500000,
    K0: 58500000, K1: 63000000, K2: 67500000, K3: 72000000,
  });

  await db.taxConfig.create({
    data: {
      taxType: "PPH21", name: "PPh 21 - Penghasilan Karyawan",
      rate: 0, description: "Pajak penghasilan karyawan progresif (Pasal 21)",
      brackets: pph21Brackets, ptkp,
    },
  });

  await db.taxConfig.create({
    data: {
      taxType: "PPH23", name: "PPh 23 - Pajak atas Jasa",
      rate: 2, description: "Pajak 2% atas jasa profesional/consulting (PP 51/2008)",
    },
  });

  await db.taxConfig.create({
    data: {
      taxType: "PPH_BADAN", name: "PPh Badan",
      rate: 22, description: "Pajak penghasilan badan 22% (UU HPP 2022)",
    },
  });

  await db.taxConfig.create({
    data: {
      taxType: "PPN", name: "PPN - Pajak Pertambahan Nilai",
      rate: 11, description: "PPN 11% (UU HPP 2022, berlaku sejak April 2022)",
    },
  });

  console.log("Tax config seeded (PPh 21, 23, Badan, PPN)");

  // ===== Sample tax payments =====
  const now = new Date();
  const taxPayments = [
    { taxType: "PPH23", period: "2026-06", periodType: "BULANAN", masaPajak: "Juni 2026", taxableAmount: 50000000, taxRate: 2, taxDue: 1000000, status: "DIBAYAR", dueDate: new Date(2026, 6, 10), paidAt: new Date(2026, 6, 8), npwp: "01.234.567.8-091.000" },
    { taxType: "PPH21", period: "2026-06", periodType: "BULANAN", masaPajak: "Juni 2026", taxableAmount: 35000000, taxRate: 5, taxDue: 1750000, status: "DIBAYAR", dueDate: new Date(2026, 6, 10), paidAt: new Date(2026, 6, 9), npwp: "01.234.567.8-091.000" },
    { taxType: "PPH_BADAN", period: "2026-Q2", periodType: "KUARTAL", masaPajak: "Q2 2026", taxableAmount: 200000000, taxRate: 22, taxDue: 44000000, status: "TERUTANG", dueDate: new Date(2026, 8, 30), npwp: "01.234.567.8-091.000" },
    { taxType: "PPN", period: "2026-06", periodType: "BULANAN", masaPajak: "Juni 2026", taxableAmount: 80000000, taxRate: 11, taxDue: 8800000, status: "DILAPORKAN", dueDate: new Date(2026, 6, 20), npwp: "01.234.567.8-091.000" },
    { taxType: "PPH23", period: "2026-07", periodType: "BULANAN", masaPajak: "Juli 2026", taxableAmount: 45000000, taxRate: 2, taxDue: 900000, status: "TERUTANG", dueDate: new Date(2026, 7, 10), npwp: "01.234.567.8-091.000" },
  ];
  for (const tp of taxPayments) {
    await db.taxPayment.create({ data: tp });
  }
  console.log("Tax payments seeded:", taxPayments.length);

  console.log("Seed complete!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
