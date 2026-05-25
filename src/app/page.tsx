"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

type SearchType = "rider" | "horse";

interface PersonRow {
  api_id: string;
  name: string;
  nation_ioc: string | null;
  result_count: number;
}

interface HorseRow {
  api_id: string;
  name: string;
  bridle_number: string | null;
  result_count: number;
}

type SearchRow = PersonRow | HorseRow;

function isPersonRow(row: SearchRow): row is PersonRow {
  return "nation_ioc" in row;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("rider");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
        if (!res.ok) throw new Error("Fehler beim Laden der Ergebnisse");
        setResults(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, type]);

  function switchType(next: SearchType) {
    setType(next);
    setResults([]);
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 pt-24 pb-16">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-zinc-900 mb-1">Reitersuche</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Turnierergebnisse nach Reiter oder Pferd durchsuchen
        </p>

        {/* Type toggle */}
        <div className="flex gap-1 mb-3">
          {(["rider", "horse"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                type === t
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {t === "rider" ? "Reiter" : "Pferd"}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={type === "rider" ? "Reitername suchen…" : "Pferdename suchen…"}
          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          autoFocus
        />

        {/* Results */}
        <div className="mt-4">
          {loading && (
            <p className="text-sm text-zinc-400 text-center py-6">Suche…</p>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          )}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <p className="text-sm text-zinc-400 text-center py-6">Keine Ergebnisse gefunden</p>
          )}

          {!loading && results.length > 0 && (
            <ul className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">
              {results.map((row) => {
                const href = isPersonRow(row)
                  ? `/rider/${encodeURIComponent(row.api_id)}`
                  : `/horse/${encodeURIComponent(row.api_id)}`;

                return (
                  <li key={row.api_id}>
                    <Link
                      href={href}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-zinc-900">{row.name}</span>
                        {isPersonRow(row) && row.nation_ioc && (
                          <span className="ml-2 text-xs text-zinc-400 uppercase">{row.nation_ioc}</span>
                        )}
                        {!isPersonRow(row) && row.bridle_number && (
                          <span className="ml-2 text-xs text-zinc-400">#{row.bridle_number}</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 ml-4 shrink-0">
                        {row.result_count} {row.result_count === 1 ? "Ergebnis" : "Ergebnisse"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
