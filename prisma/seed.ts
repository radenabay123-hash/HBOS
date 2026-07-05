import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding HBOS database...");

  // ============ USERS ============
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await db.user.upsert({
    where: { email: "owner@hafara.com" },
    update: {},
    create: {
      email: "owner@hafara.com",
      password: passwordHash,
      name: "M. Aqil Baihaqi",
      role: "OWNER",
      phone: "081234567890",
      position: "Owner & Founder",
    },
  });

  const pm = await db.user.upsert({
    where: { email: "pm@hafara.com" },
    update: {},
    create: {
      email: "pm@hafara.com",
      password: passwordHash,
      name: "Siti Rahma",
      role: "PROJECT_MANAGER",
      phone: "081234567891",
      position: "Project Manager",
    },
  });

  const trainer = await db.user.upsert({
    where: { email: "trainer@hafara.com" },
    update: {},
    create: {
      email: "trainer@hafara.com",
      password: passwordHash,
      name: "Ahmad Fauzi",
      role: "ASSISTANT_TRAINER",
      phone: "081234567892",
      position: "Assistant Trainer",
    },
  });

  const creative = await db.user.upsert({
    where: { email: "creative@hafara.com" },
    update: {},
    create: {
      email: "creative@hafara.com",
      password: passwordHash,
      name: "Dewi Lestari",
      role: "CONTENT_CREATIVE",
      phone: "081234567893",
      position: "Content Creative",
    },
  });

  const digital = await db.user.upsert({
    where: { email: "digital@hafara.com" },
    update: {},
    create: {
      email: "digital@hafara.com",
      password: passwordHash,
      name: "Rizki Pratama",
      role: "DIGITAL_MARKETING_IT",
      phone: "081234567894",
      position: "Digital Marketing & IT",
    },
  });

  const finance = await db.user.upsert({
    where: { email: "finance@hafara.com" },
    update: {},
    create: {
      email: "finance@hafara.com",
      password: passwordHash,
      name: "Nur Hidayah",
      role: "FINANCE",
      phone: "081234567895",
      position: "Finance Officer",
    },
  });

  console.log("Users created:", {
    owner: owner.email,
    pm: pm.email,
    trainer: trainer.email,
    creative: creative.email,
    digital: digital.email,
    finance: finance.email,
  });

  // ============ CLIENTS (CRM) ============
  const clientData = [
    { namaKlien: "PT Maju Bersama", instansi: "PT Maju Bersama", pic: "Budi Santoso", nomorWA: "081111111111", email: "budi@majubersama.com", jenisTraining: "Leadership Training", jumlahPeserta: 30, budget: 25000000, lokasi: "Jakarta", status: "DEAL", assignedToId: pm.id, tanggalEvent: new Date(2025, new Date().getMonth(), 15) },
    { namaKlien: "Dinas Pendidikan Bandung", instansi: "Pemkot Bandung", pic: "Dra. Endang", nomorWA: "082222222222", email: "endang@disdik-bandung.go.id", jenisTraining: "Public Speaking", jumlahPeserta: 50, budget: 40000000, lokasi: "Bandung", status: "NEGOTIATION", assignedToId: pm.id },
    { namaKlien: "Bank Mandiri Cabang Surabaya", instansi: "Bank Mandiri", pic: "Hendra Wijaya", nomorWA: "083333333333", email: "hendra@mandiri.co.id", jenisTraining: "Soft Skill & Communication", jumlahPeserta: 25, budget: 30000000, lokasi: "Surabaya", status: "PROPOSAL", assignedToId: pm.id },
    { namaKlien: "Universitas Indonesia", instansi: "UI", pic: "Dr. Surya", nomorWA: "084444444444", email: "surya@ui.ac.id", jenisTraining: "Career Development", jumlahPeserta: 100, budget: 60000000, lokasi: "Depok", status: "FOLLOW_UP", assignedToId: pm.id },
    { namaKlien: "PT Unilever Indonesia", instansi: "Unilever", pic: "Maya Anggraini", nomorWA: "085555555555", email: "maya@unilever.com", jenisTraining: "Team Building", jumlahPeserta: 40, budget: 45000000, lokasi: "Tangerang", status: "LEAD", assignedToId: pm.id },
    { namaKlien: "Gojek Indonesia", instansi: "Gojek", pic: "Andi Pratama", nomorWA: "086666666666", email: "andi@gojek.com", jenisTraining: "Customer Service Excellence", jumlahPeserta: 60, budget: 50000000, lokasi: "Jakarta", status: "DEAL", assignedToId: pm.id, tanggalEvent: new Date(2025, new Date().getMonth(), 22) },
    { namaKlien: "PT Telkom Indonesia", instansi: "Telkom", pic: "Rina Marlina", nomorWA: "087777777777", email: "rina@telkom.co.id", jenisTraining: "Digital Leadership", jumlahPeserta: 35, budget: 55000000, lokasi: "Bandung", status: "LOST", assignedToId: pm.id },
    { namaKlien: "Kementerian Kesehatan", instansi: "Kemenkes", pic: "Bapak Yusuf", nomorWA: "088888888888", email: "yusuf@kemenkes.go.id", jenisTraining: "Stress Management", jumlahPeserta: 80, budget: 70000000, lokasi: "Jakarta", status: "DEAL", assignedToId: pm.id, tanggalEvent: new Date(2025, new Date().getMonth(), 8) },
  ];

  const clients = [];
  for (const c of clientData) {
    const client = await db.client.create({ data: c });
    clients.push(client);
  }

  // ============ EVENTS ============
  const events = [
    { namaEvent: "Leadership Training PT Maju Bersama", clientId: clients[0].id, tanggal: new Date(2025, new Date().getMonth(), 15), lokasi: "Hotel Pullman Jakarta", trainer: "M. Aqil Baihaqi", assistantTrainerId: trainer.id, statusPersiapan: "READY", checklist: JSON.stringify([{ item: "Materi Training", done: true }, { item: "Konsumsi", done: true }, { item: "LCD & Sound System", done: true }, { item: "Sertifikat", done: false }]) },
    { namaEvent: "Customer Service Excellence Gojek", clientId: clients[5].id, tanggal: new Date(2025, new Date().getMonth(), 22), lokasi: "Gojek HQ Jakarta", trainer: "M. Aqil Baihaqi", assistantTrainerId: trainer.id, statusPersiapan: "IN_PROGRESS", checklist: JSON.stringify([{ item: "Materi Training", done: true }, { item: "Konsumsi", done: false }, { item: "LCD & Sound System", done: false }, { item: "Sertifikat", done: false }]) },
    { namaEvent: "Stress Management Kemenkes", clientId: clients[7].id, tanggal: new Date(2025, new Date().getMonth(), 8), lokasi: "Kemenkes Jakarta", trainer: "M. Aqil Baihaqi", assistantTrainerId: trainer.id, statusPersiapan: "COMPLETED", checklist: JSON.stringify([{ item: "Materi Training", done: true }, { item: "Konsumsi", done: true }, { item: "LCD & Sound System", done: true }, { item: "Sertifikat", done: true }]) },
  ];
  for (const e of events) {
    await db.event.create({ data: e });
  }

  // ============ DAILY TASKS (last 14 days) ============
  const taskTitles = [
    "Persiapan materi training Leadership",
    "Follow up klien Bank Mandiri",
    "Edit video reels Instagram",
    "Tulis 10 artikel SEO MentorSkill",
    "Optimasi website hafaragroup.com",
    "Backup database website",
    "Input data keuangan bulanan",
    "Buat proposal training baru",
    "Desain slide presentasi",
    "Analisis kompetitor SEO",
    "Publikasi reels TikTok",
    "Rekap invoice klien",
  ];
  const allStaff = [pm, trainer, creative, digital, finance];
  for (let d = 0; d < 14; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    for (const staff of allStaff) {
      // 2-3 tasks per day per staff
      const numTasks = 2 + Math.floor(Math.random() * 2);
      for (let t = 0; t < numTasks; t++) {
        const title = taskTitles[Math.floor(Math.random() * taskTitles.length)];
        const status = ["BELUM", "SEDANG", "SELESAI"][Math.floor(Math.random() * 3)];
        const pct = status === "SELESAI" ? 100 : status === "SEDANG" ? 50 : 0;
        await db.dailyTask.create({
          data: {
            userId: staff.id,
            taskHariIni: title,
            progress: status === "SELESAI" ? "Selesai dikerjakan" : status === "SEDANG" ? "Sedang berjalan" : "",
            persentaseSelesai: pct,
            hambatan: status === "SEDANG" && Math.random() > 0.5 ? "Menunggu konfirmasi klien" : null,
            jamMulai: "08:00",
            jamSelesai: status === "SELESAI" ? "17:00" : null,
            status,
            tanggal: date,
          },
        });
      }
    }
  }

  // ============ CONTENT IDEAS ============
  const categories = ["Instagram M. Aqil Baihaqi", "TikTok Aqil Baihaqi", "Hafara Group", "MentorSkill"];
  const ideaTitles = [
    "5 Tips Public Speaking untuk Pemula",
    "Cara Menjadi Leader yang Dihormati",
    "Mindset Sukses ala Aqil Baihaqi",
    "Tutorial Soft Skill di Tempat Kerja",
    "Kisah Inspiratif Karier",
    "Training Communication Excellence",
    "Rahasia Career Development",
    "Team Building Activities",
    "Stress Management Tips",
    "Digital Leadership 2025",
  ];
  for (let i = 0; i < 40; i++) {
    const cat = categories[i % categories.length];
    const title = ideaTitles[i % ideaTitles.length] + " #" + (i + 1);
    const statusACC = ["PENDING", "ACC", "REVISI"][Math.floor(Math.random() * 3)];
    const isPublished = statusACC === "ACC" && Math.random() > 0.4;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const submitter = [trainer, creative, digital][i % 3];
    await db.contentIdea.create({
      data: {
        userId: submitter.id,
        kategori: cat,
        judul: title,
        link: "https://drive.google.com/example/" + i,
        ideKonten: "Ide konten tentang " + title,
        script: "Script lengkap untuk " + title,
        caption: "Caption menarik untuk " + title + " #motivasi #training",
        statusProduksi: isPublished ? "PUBLISHED" : statusACC === "ACC" ? "SIAP_PUBLISH" : "IDE",
        statusEditing: isPublished ? "DONE" : "PENDING",
        statusPublish: isPublished ? "PUBLISHED" : "PENDING",
        linkKonten: isPublished ? "https://instagram.com/p/example" + i : null,
        metrikKonten: isPublished ? JSON.stringify({ reach: 1000 + Math.floor(Math.random() * 10000), views: 500 + Math.floor(Math.random() * 5000), watchTime: 30 + Math.floor(Math.random() * 120), share: 10 + Math.floor(Math.random() * 100), save: 20 + Math.floor(Math.random() * 200), comment: 5 + Math.floor(Math.random() * 50), followerGrowth: 5 + Math.floor(Math.random() * 50) }) : null,
        statusACC,
        catatanRevisi: statusACC === "REVISI" ? "Mohon perbaiki caption dan tambahkan CTA yang lebih jelas" : null,
        accAt: statusACC === "ACC" ? new Date() : null,
        accById: statusACC === "ACC" ? owner.id : null,
        tanggal: date,
      },
    });
  }

  // ============ ARTICLES (SEO) ============
  const articleTitles = [
    "Pentingnya Soft Skill di Era Digital",
    "Cara Meningkatkan Kemampuan Public Speaking",
    "Strategi Leadership Modern",
    "Tips Komunikasi Efektif di Tempat Kerja",
    "Pengembangan Diri untuk Karier",
    "Manajemen Waktu Profesional",
    "Emotional Intelligence untuk Leader",
    "Mindset Growth untuk Sukses",
    "Training dan Development Karyawan",
    "Negotiation Skills untuk Bisnis",
  ];
  const websites = ["hafaragroup.com", "mentorskill.id", "aqilbaihaqi.com"];
  const articleWriters = [creative, digital];
  for (let i = 0; i < 60; i++) {
    const title = articleTitles[i % articleTitles.length] + " Part " + (Math.floor(i / 10) + 1);
    const statusACC = ["PENDING", "ACC", "REVISI_ADMIN"][Math.floor(Math.random() * 3)];
    const published = statusACC === "ACC" && Math.random() > 0.4;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    await db.article.create({
      data: {
        userId: articleWriters[i % 2].id,
        judulArtikel: title,
        keyword: "training, leadership, soft skill",
        websiteTujuan: websites[i % 3],
        tanggalPublish: published ? date : null,
        linkArtikel: published ? "https://" + websites[i % 3] + "/article/" + i : null,
        statusACC,
        catatanRevisi: statusACC === "REVISI_ADMIN" ? "Keyword perlu ditambah dan struktur heading diperbaiki" : null,
        accAt: statusACC === "ACC" ? new Date() : null,
        accById: statusACC === "ACC" ? owner.id : null,
        status: published ? "PUBLISHED" : "DRAFT",
        createdAt: date,
      },
    });
  }

  // ============ FINANCE TRANSACTIONS ============
  const now = new Date();
  // Pemasukan dari klien deal
  for (const client of clients) {
    if (client.status === "DEAL" && client.budget) {
      const date = new Date(now.getFullYear(), now.getMonth(), 5 + Math.floor(Math.random() * 20));
      await db.financeTransaction.create({
        data: { type: "PEMASUKAN", amount: client.budget, description: "Pembayaran training " + client.namaKlien, category: "Pendapatan Training", date, userId: finance.id, clientId: client.id },
      });
    }
  }
  // Pengeluaran
  const expenses = [
    { amount: 5000000, description: "Gaji karyawan", category: "Gaji" },
    { amount: 2000000, description: "Operasional kantor", category: "Operasional" },
    { amount: 1500000, description: "Marketing & Iklan", category: "Marketing" },
    { amount: 800000, description: "Konsumsi event", category: "Event" },
    { amount: 1200000, description: "Sewa tempat training", category: "Event" },
    { amount: 500000, description: "Internet & Listrik", category: "Operasional" },
    { amount: 300000, description: "Alat tulis kantor", category: "Operasional" },
    { amount: 2000000, description: "Software & Tools", category: "IT" },
  ];
  for (let m = 0; m < 6; m++) {
    const month = now.getMonth() - m;
    const year = now.getFullYear() + Math.floor(month / 12);
    const adjMonth = ((month % 12) + 12) % 12;
    for (const exp of expenses) {
      const date = new Date(year, adjMonth, 3 + Math.floor(Math.random() * 20));
      await db.financeTransaction.create({
        data: { type: "PENGELUARAN", amount: exp.amount, description: exp.description, category: exp.category, date, userId: finance.id },
      });
    }
    // Additional income
    await db.financeTransaction.create({
      data: { type: "PEMASUKAN", amount: 15000000 + Math.floor(Math.random() * 20000000), description: "Konsultasi & Mentoring", category: "Pendapatan Konsultasi", date: new Date(year, adjMonth, 10), userId: finance.id },
    });
  }

  // ============ FINANCE SETTINGS ============
  for (let m = 0; m < 12; m++) {
    await db.financeSetting.upsert({
      where: { month_year: { month: m + 1, year: 2025 } },
      update: {},
      create: { month: m + 1, year: 2025, targetRevenue: 500000000, targetProfit: 150000000 },
    });
  }

  // ============ DOCUMENTS ============
  const dealClients = clients.filter((c) => c.status === "DEAL");
  for (const client of dealClients) {
    await db.document.create({
      data: { clientId: client.id, documentType: "INVOICE", documentName: "Invoice " + client.namaKlien, documentNumber: "INV/2025/" + Math.floor(Math.random() * 999), link: "https://drive.google.com/invoice/" + client.id, description: "Invoice pembayaran training", uploadedById: pm.id },
    });
    await db.document.create({
      data: { clientId: client.id, documentType: "SPK", documentName: "SPK " + client.namaKlien, documentNumber: "SPK/2025/" + Math.floor(Math.random() * 999), link: "https://drive.google.com/spk/" + client.id, description: "Surat Penawaran Kerja", uploadedById: pm.id },
    });
    await db.document.create({
      data: { clientId: client.id, documentType: "SURAT", documentName: "Surat Perjanjian " + client.namaKlien, documentNumber: "SRT/2025/" + Math.floor(Math.random() * 999), link: "https://drive.google.com/surat/" + client.id, description: "Surat perjanjian kerjasama", uploadedById: pm.id },
    });
  }

  // ============ SCORE LOGS ============
  const staffList = [pm, trainer, creative, digital, finance];
  const scoreCategories = ["PRODUKTIF", "DISIPLIN", "KERJA_SAMA"];
  for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    for (const staff of staffList) {
      const numScores = 1 + Math.floor(Math.random() * 3);
      for (let s = 0; s < numScores; s++) {
        await db.scoreLog.create({
          data: {
            scorerId: owner.id,
            targetUserId: staff.id,
            points: 5 + Math.floor(Math.random() * 15),
            reason: "Menyelesaikan tugas harian",
            category: scoreCategories[Math.floor(Math.random() * 3)],
            date,
          },
        });
      }
    }
  }

  console.log("Seed completed successfully!");
  console.log("\n=== LOGIN CREDENTIALS ===");
  console.log("Owner: owner@hafara.com / password123");
  console.log("Project Manager: pm@hafara.com / password123");
  console.log("Assistant Trainer: trainer@hafara.com / password123");
  console.log("Content Creative: creative@hafara.com / password123");
  console.log("Digital Marketing & IT: digital@hafara.com / password123");
  console.log("Finance: finance@hafara.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
