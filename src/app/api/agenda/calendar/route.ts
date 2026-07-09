import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET calendar view — returns agendas grouped by date for a month
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const bulan = Number(searchParams.get("bulan") || new Date().getMonth() + 1);
    const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());

    const start = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0);
    const end = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    const agendas = await db.dailyAgenda.findMany({
      where: {
        userId: user.id,
        tanggal: { gte: start, lte: end },
      },
      orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
      select: {
        id: true,
        tipe: true,
        judul: true,
        tanggal: true,
        jamMulai: true,
        jamSelesai: true,
        status: true,
        isOnline: true,
        lokasi: true,
      },
    });

    // Group by date string (YYYY-MM-DD)
    const byDate: Record<string, any[]> = {};
    for (const a of agendas) {
      const d = new Date(a.tanggal);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(a);
    }

    return ok({ byDate, bulan, tahun });
  });
}
