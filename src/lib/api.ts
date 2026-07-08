import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleApi(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") {
      return err("Unauthorized", 401);
    }
    if (e?.message === "FORBIDDEN") {
      return err("Forbidden: insufficient role", 403);
    }
    console.error("API Error:", e);
    return err(e?.message || "Internal Server Error", 500);
  }
}

// Parse a date range from query (month/year optional)
export function getMonthRange(year: number, month?: number) {
  if (month != null) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}
