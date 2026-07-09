import { db } from "../src/lib/db";

interface SeedCriteria {
  name: string;
  description: string;
  weight: number;
  dataSource: "MANUAL" | "ATTENDANCE" | "KPI" | "SOCIAL_MEDIA" | "VIRAL";
  order: number;
}

const DEFAULT_CRITERIA: SeedCriteria[] = [
  {
    name: "Kehadiran Tepat Waktu",
    description: "Persentase kehadiran tepat waktu berdasarkan data absensi (HADIR vs TERLAMBAT/ALPHA).",
    weight: 15,
    dataSource: "ATTENDANCE",
    order: 1,
  },
  {
    name: "Pencapaian Target KPI",
    description: "Skor KPI bulanan (gabungan harian, mingguan, bulanan, deadline, kualitas).",
    weight: 10,
    dataSource: "KPI",
    order: 2,
  },
  {
    name: "Aktivitas Social Media",
    description: "Total engagement (likes + shares + comments + saves) dari konten yang dipublikasikan.",
    weight: 15,
    dataSource: "SOCIAL_MEDIA",
    order: 3,
  },
  {
    name: "Konten Viral",
    description: "Jumlah konten dengan views > 10.000. Setiap konten viral = 20 poin (maks 100).",
    weight: 10,
    dataSource: "VIRAL",
    order: 4,
  },
  {
    name: "Kreativitas Konten",
    description: "Penilaian manual owner terhadap kreativitas ide & eksekusi konten tim.",
    weight: 10,
    dataSource: "MANUAL",
    order: 5,
  },
  {
    name: "Fast Response",
    description: "Kecepatan respon terhadap chat, email, dan permintaan dari owner atau tim.",
    weight: 10,
    dataSource: "MANUAL",
    order: 6,
  },
  {
    name: "Siap Kerja Malam",
    description: "Ketersediaan & fleksibilitas bekerja di luar jam kantor saat dibutuhkan.",
    weight: 10,
    dataSource: "MANUAL",
    order: 7,
  },
  {
    name: "Inisiatif & Masukan",
    description: "Inisiatif memberikan masukan konstruktif dan proaktif dalam menyelesaikan masalah.",
    weight: 10,
    dataSource: "MANUAL",
    order: 8,
  },
  {
    name: "Kolaborasi Tim",
    description: "Kualitas kolaborasi dengan anggota tim lain dan dukungan antar divisi.",
    weight: 10,
    dataSource: "MANUAL",
    order: 9,
  },
];

async function main() {
  console.log("Seeding default AssessmentCriteria...");

  let inserted = 0;
  let updated = 0;

  for (const c of DEFAULT_CRITERIA) {
    // Find by name + dataSource as natural key
    const existing = await db.assessmentCriteria.findFirst({
      where: { name: c.name, dataSource: c.dataSource },
    });
    if (existing) {
      await db.assessmentCriteria.update({
        where: { id: existing.id },
        data: {
          description: c.description,
          weight: c.weight,
          order: c.order,
          isActive: true,
        },
      });
      updated++;
    } else {
      await db.assessmentCriteria.create({
        data: {
          name: c.name,
          description: c.description,
          weight: c.weight,
          dataSource: c.dataSource,
          order: c.order,
          isActive: true,
        },
      });
      inserted++;
    }
  }

  // Seed default bonus multiplier setting
  const SETTING_KEY = "assessment_bonus_per_point";
  const existingSetting = await db.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!existingSetting) {
    await db.appSetting.create({
      data: {
        key: SETTING_KEY,
        value: "100000",
        category: "ASSESSMENT",
        type: "NUMBER",
        description: "Bonus multiplier (Rp) per point penilaian tim",
      },
    });
    console.log("Created default assessment_bonus_per_point setting (Rp 100.000/point).");
  } else {
    console.log(`assessment_bonus_per_point already set: Rp ${Number(existingSetting.value).toLocaleString("id-ID")}`);
  }

  const totalWeight = DEFAULT_CRITERIA.reduce((s, c) => s + c.weight, 0);
  console.log(`Assessment criteria seed complete. Inserted: ${inserted}, Updated: ${updated}.`);
  console.log(`Total weight: ${totalWeight}% (expected 100%).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
