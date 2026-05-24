import {
  FIND_SHOWS,
  GET_SHOW_MASTERLIST,
  LOAD_DRESSAGE_COMPETITION,
  LOAD_EVENTING_COMPETITION,
  LOAD_JUMPING_COMPETITION,
} from "./queries";
import type {
  AnyCompetition,
  DressageCompetition,
  EventingCompetition,
  FindShowsResponse,
  GetShowMasterlistResponse,
  JumpingCompetition,
  ShowSearchResult,
} from "./types";

const GQL_ENDPOINT =
  "https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Origin: "https://www.fn-erfolgsdaten.de",
  Referer: "https://www.fn-erfolgsdaten.de/",
  "Accept-Language": "de",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function gql<T>(operationName: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const resp = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify([{ operationName, variables, query }]),
  });

  if (!resp.ok) {
    throw new Error(`GraphQL HTTP ${resp.status} for ${operationName}`);
  }

  const json = (await resp.json()) as Array<{ data?: Record<string, unknown>; errors?: unknown[] }>;
  const item = Array.isArray(json) ? json[0] : json;

  if (item.errors?.length) {
    throw new Error(`GraphQL errors in ${operationName}: ${JSON.stringify(item.errors)}`);
  }

  return item.data as T;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function findShows(
  from: string,
  to: string,
  page = 0,
  nationIoc?: string,
  order: "BEST" = "BEST"
): Promise<{ shows: ShowSearchResult[]; totalPages: number; totalElements: number }> {
  const data = await gql<FindShowsResponse>("FindShowsForEhV2", FIND_SHOWS, {
    term: null,
    filter: {
      isInternational: false,
      isEnterable: false,
      isFeatured: false,
      from,
      to,
      ...(nationIoc ? { nationIoc } : {}),
    },
    order,
    page,
  });
  return data.foundShows;
}

export async function getShowMasterlist(showId: string | number) {
  const data = await gql<GetShowMasterlistResponse>("GetShowMasterlist", GET_SHOW_MASTERLIST, {
    showId: String(showId),
  });
  return data.masterlist;
}

export async function loadJumpingCompetition(competitionId: string | number): Promise<JumpingCompetition | null> {
  const data = await gql<{ competition: JumpingCompetition }>(
    "LoadPublicJumpingCompetition",
    LOAD_JUMPING_COMPETITION,
    { competitionId: String(competitionId) }
  );
  return data.competition ?? null;
}

export async function loadDressageCompetition(competitionId: string | number): Promise<DressageCompetition | null> {
  const data = await gql<{ competition: DressageCompetition }>(
    "LoadPublicDressageCompetition",
    LOAD_DRESSAGE_COMPETITION,
    { competitionId: String(competitionId) }
  );
  return data.competition ?? null;
}

export async function loadEventingCompetition(competitionId: string | number): Promise<EventingCompetition | null> {
  const data = await gql<{ competition: EventingCompetition }>(
    "LoadPublicEventingCompetition",
    LOAD_EVENTING_COMPETITION,
    { competitionId: String(competitionId) }
  );
  return data.competition ?? null;
}

export async function loadCompetition(
  competitionId: string | number,
  discipline: string
): Promise<AnyCompetition | null> {
  switch (discipline) {
    case "JUMPING":
      return loadJumpingCompetition(competitionId);
    case "DRESSAGE":
      return loadDressageCompetition(competitionId);
    case "EVENTING":
      return loadEventingCompetition(competitionId);
    default:
      return null;
  }
}
