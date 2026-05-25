import { NextRequest, NextResponse } from "next/server";
import { getDb, searchPersons, searchHorses } from "@/lib/db";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "rider";

  if (q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const db = getDb();
  const results = type === "horse" ? searchHorses(db, q) : searchPersons(db, q);
  return NextResponse.json(results);
}
