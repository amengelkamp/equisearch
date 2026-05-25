import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, getPersonResults } from "@/lib/db";
import type { SearchResultRow } from "@/lib/db";
import ScoreChart from "@/components/ScoreChart";

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function disciplineLabel(d: string) {
  if (d === "JUMPING") return "Springen";
  if (d === "DRESSAGE") return "Dressur";
  if (d === "EVENTING") return "Eventing";
  return d;
}

function buildChartData(results: SearchResultRow[]) {
  return results
    .filter((r) => r.discipline === "DRESSAGE" && r.score != null && r.score > 0 && r.first_day)
    .map((r) => ({
      date: formatDate(r.first_day),
      score: r.score!,
      label: `${formatDate(r.first_day)} — ${r.show_name} — ${r.competition_name}`,
    }))
    .reverse();
}

export default async function RiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const results = getPersonResults(db, id);

  if (results.length === 0) notFound();

  const rider = results[0];
  const chartData = buildChartData(results);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 mb-6 inline-flex items-center gap-1">
          ← Zurück zur Suche
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">{rider.person_name}</h1>
          {rider.person_api_id && (
            <p className="text-sm text-zinc-400 mt-0.5">{results.length} Ergebnisse</p>
          )}
        </div>

        {chartData.length >= 3 && (
          <div className="mb-6">
            <ScoreChart data={chartData} title="Dressur-Ergebnisse über Zeit" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400 uppercase tracking-wide">
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Turnier</th>
                <th className="px-4 py-3 hidden md:table-cell">Prüfung</th>
                <th className="px-4 py-3 hidden sm:table-cell">Pferd</th>
                <th className="px-4 py-3 text-right">Platz</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {results.map((r) => (
                <tr key={`${r.competition_id}-${r.horse_api_id}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{formatDate(r.first_day)}</td>
                  <td className="px-4 py-2.5 text-zinc-900 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="hidden sm:inline text-[10px] font-semibold text-zinc-400 bg-zinc-100 rounded px-1 py-0.5">
                        {disciplineLabel(r.discipline).slice(0, 3).toUpperCase()}
                      </span>
                      {r.show_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 hidden md:table-cell">{r.competition_name}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    {r.horse_name ? (
                      <Link
                        href={`/horse/${encodeURIComponent(r.horse_api_id!)}`}
                        className="text-zinc-700 hover:text-zinc-900 hover:underline"
                      >
                        {r.horse_name}
                      </Link>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.rank_official != null ? (
                      <span className={r.placed ? "font-semibold text-zinc-900" : "text-zinc-500"}>
                        {r.rank_official}.
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell text-zinc-500">
                    {r.score != null ? `${r.score.toFixed(3)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
