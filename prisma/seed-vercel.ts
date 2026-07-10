// Seed script for Vercel/PostgreSQL deployment
// Creates initial users + app settings + finance categories + tax configs
// Run: npx prisma db push && npx tsx prisma/seed-vercel.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HBOS database for Vercel deployment...\n");

  // ============ USERS ============
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "owner@hafara.com", name: "M. Aqil Baihaqi", role: "OWNER", phone: "081324511570", position: "Owner & Founder" },
    { email: "ayu_project@hafara.com", name: "Ade Ayu Saputri", role: "PROJECT_MANAGER", phone: "081200000001", position: "Project Manager" },
    { email: "badar_asisten@hafara.com", name: "Muhammad Badar Haula Abdi", role: "ASSISTANT_TRAINER", phone: "081200000002", position: "Assistant Trainer" },
    { email: "istiana_creative@hafara.com", name: "Istiana Agu Saputri", role: "CONTENT_CREATIVE", phone: "081200000003", position: "Content Creative" },
    { email: "cinta_marketing@hafara.com", name: "Cinta Azzaria", role: "DIGITAL_MARKETING_IT", phone: "081200000004", position: "Digital Marketing & IT" },
    { email: "finance@hafara.com", name: "Finance Staff", role: "FINANCE", phone: "081200000005", position: "Finance Officer" },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: { password: passwordHash },
      create: { ...u, password: passwordHash },
    });
    console.log(`  ✓ User: ${u.email} (${u.role})`);
  }

  // ============ APP SETTINGS ============
  const settings = [
    { key: "app_name", value: "HBOS" },
    { key: "app_full_name", value: "Hafara Business Operating System" },
    { key: "company_name", value: "PT. HAFARA AQIBA NUSANTARA" },
    { key: "company_address", value: "Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur" },
    { key: "company_phone", value: "081324511570" },
    { key: "company_email", value: "Info@hafaragroup.com" },
    { key: "company_website", value: "www.HafaraGroup.com" },
    { key: "company_npwp", value: "01.234.567.8-091.000" },
  ];
  for (const s of settings) {
    await db.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`  ✓ ${settings.length} app settings`);

  // ============ TAX CONFIG ============
  const taxConfigs = [
    { taxType: "PPH21", name: "PPh 21 - Penghasilan Karyawan", rate: 0, isActive: true, description: "Pajak penghasilan karyawan dengan tarif progresif (UU HPP). Dipotong dari gaji bulanan karyawan.", brackets: JSON.stringify([{ min: 0, max: 60000000, rate: 0.05 }, { min: 60000000, max: 250000000, rate: 0.15 }, { min: 250000000, max: 500000000, rate: 0.25 }, { min: 500000000, max: 5000000000, rate: 0.30 }, { min: 5000000000, max: null, rate: 0.35 }]), ptkp: JSON.stringify({ TK0: 54000000, TK1: 58500000, TK2: 63000000, TK3: 67500000, K0: 58500000, K1: 63000000, K2: 67500000, K3: 72000000 }) },
    { taxType: "PPH23", name: "PPh 23 - Pajak Penghasilan 23", rate: 2, isActive: true, description: "Pajak penghasilan atas penghasilan dari jasa, sewa, dll. Tarif 2% dari bruto.", brackets: null, ptkp: null },
    { taxType: "PPH_BADAN", name: "PPh Badan", rate: 11, isActive: true, description: "Pajak penghasilan badan usaha. Tarif 11% (UU HPP 2022-2023), 12% mulai 2024.", brackets: null, ptkp: null },
    { taxType: "PPN", name: "PPN - Pajak Pertambahan Nilai", rate: 11, isActive: true, description: "Pajak Pertambahan Nilai atas penjualan barang/jasa kena pajak. Tarif 11% (UU HPP).", brackets: null, ptkp: null },
  ];
  for (const t of taxConfigs) {
    // Check if exists first, then create or update
    const existing = await db.taxConfig.findFirst({ where: { taxType: t.taxType } });
    if (existing) {
      await db.taxConfig.update({ where: { id: existing.id }, data: t });
    } else {
      await db.taxConfig.create({ data: t });
    }
  }
  console.log(`  ✓ ${taxConfigs.length} tax configs`);

  // ============ FINANCE CATEGORIES ============
  const categories = [
    // Pemasukan
    { name: "Honor Training", type: "PEMASUKAN", icon: "GraduationCap", color: "blue" },
    { name: "Workshop", type: "PEMASUKAN", icon: "Users", color: "violet" },
    { name: "Seminar", type: "PEMASUKAN", icon: "Presentation", color: "amber" },
    { name: "Coaching", type: "PEMASUKAN", icon: "Target", color: "green" },
    { name: "Consulting", type: "PEMASUKAN", icon: "Lightbulb", color: "cyan" },
    { name: "Mentoring", type: "PEMASUKAN", icon: "Compass", color: "teal" },
    { name: "Membership", type: "PEMASUKAN", icon: "Crown", color: "indigo" },
    { name: "Penjualan Modul", type: "PEMASUKAN", icon: "BookOpen", color: "pink" },
    { name: "Penjualan Buku", type: "PEMASUKAN", icon: "Book", color: "rose" },
    { name: "Affiliate", type: "PEMASUKAN", icon: "Share2", color: "sky" },
    { name: "Investasi", type: "PEMASUKAN", icon: "TrendingUp", color: "emerald" },
    { name: "Lainnya", type: "PEMASUKAN", icon: "MoreHorizontal", color: "slate" },
    // Pengeluaran
    { name: "Gaji", type: "PENGELUARAN", icon: "Wallet", color: "green" },
    { name: "Operasional", type: "PENGELUARAN", icon: "Briefcase", color: "slate" },
    { name: "Sewa Kantor", type: "PENGELUARAN", icon: "Home", color: "emerald" },
    { name: "Internet", type: "PENGELUARAN", icon: "Wifi", color: "violet" },
    { name: "Hosting", type: "PENGELUARAN", icon: "Server", color: "indigo" },
    { name: "Domain", type: "PENGELUARAN", icon: "Globe", color: "sky" },
    { name: "Listrik", type: "PENGELUARAN", icon: "Zap", color: "amber" },
    { name: "Air", type: "PENGELUARAN", icon: "Droplets", color: "sky" },
    { name: "Konsumsi", type: "PENGELUARAN", icon: "UtensilsCrossed", color: "amber" },
    { name: "Transportasi", type: "PENGELUARAN", icon: "Car", color: "blue" },
    { name: "Marketing", type: "PENGELUARAN", icon: "Megaphone", color: "rose" },
    { name: "Iklan", type: "PENGELUARAN", icon: "MousePointerClick", color: "pink" },
    { name: "Peralatan", type: "PENGELUARAN", icon: "Tool", color: "teal" },
    { name: "Software", type: "PENGELUARAN", icon: "Download", color: "cyan" },
    { name: "AI Subscription", type: "PENGELUARAN", icon: "Bot", color: "violet" },
    { name: "Laptop", type: "PENGELUARAN", icon: "Laptop", color: "blue" },
    { name: "Pajak", type: "PENGELUARAN", icon: "Receipt", color: "red" },
    { name: "Hotel", type: "PENGELUARAN", icon: "Building", color: "cyan" },
    { name: "Lainnya", type: "PENGELUARAN", icon: "MoreHorizontal", color: "slate" },
  ];
  for (const c of categories) {
    // Check if exists first
    const existing = await db.financeCategory.findFirst({ where: { name: c.name, type: c.type } });
    if (existing) {
      await db.financeCategory.update({ where: { id: existing.id }, data: c });
    } else {
      await db.financeCategory.create({ data: c });
    }
  }
  console.log(`  ✓ ${categories.length} finance categories`);

  // ============ DOCUMENT LAYOUTS ============
  const layouts = [
    { docType: "SURAT", settings: JSON.stringify({ headerStyle: "full", fontSize: 12, fontFamily: "Times" }) },
    { docType: "INVOICE", settings: JSON.stringify({ headerStyle: "logo", fontSize: 11, fontFamily: "Arial" }) },
    { docType: "SLIP_GAJI", settings: JSON.stringify({ headerStyle: "simple", fontSize: 10, fontFamily: "Arial" }) },
  ];
  for (const l of layouts) {
    // Check if exists first
    const existing = await db.documentLayout.findFirst({ where: { docType: l.docType } });
    if (existing) {
      await db.documentLayout.update({ where: { id: existing.id }, data: l });
    } else {
      await db.documentLayout.create({ data: l });
    }
  }
  console.log(`  ✓ ${layouts.length} document layouts`);

  console.log("\n✅ Seed selesai!");
  console.log("\n📋 Akun Login (password semua: password123):");
  console.log("  • owner@hafara.com (Owner)");
  console.log("  • ayu_project@hafara.com (Project Manager)");
  console.log("  • badar_asisten@hafara.com (Assistant Trainer)");
  console.log("  • istiana_creative@hafara.com (Content Creative)");
  console.log("  • cinta_marketing@hafara.com (Digital Marketing & IT)");
  console.log("  • finance@hafara.com (Finance)");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
