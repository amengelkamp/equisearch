export interface Nation {
  id: string;
  ioc: string;
}

export interface Person {
  apiId: string;
  name: string;
  firstName: string | null;
  familyName: string | null;
  nation: Nation;
}

export interface Horse {
  apiId: string;
  name: string;
  permanentBridleNumber: string | null;
}

export interface Athlete {
  apiId: string;
  person: Person;
}

// ── Show search ──────────────────────────────────────────────────────────────

export interface ShowSearchResult {
  id: string;
  name: string;
  nationIoc: string;
  firstDay: string;
  lastDay: string;
  disciplines: string[];
}

export interface FindShowsResponse {
  foundShows: {
    shows: ShowSearchResult[];
    totalPages: number;
    totalElements: number;
  };
}

// ── Show masterlist ──────────────────────────────────────────────────────────

export interface CompetitionStub {
  id: string;
  name: string;
  number: string;
  discipline: "JUMPING" | "DRESSAGE" | "EVENTING" | "DRIVING" | "RECREATIONAL" | string;
  status: string;
  numberOfCompetitors: number;
  numberOfFinishedCompetitors: number;
  publishingStatus: string;
}

export interface ShowMasterlist {
  showId: number;
  name: string;
  nationIoc: string;
  firstDay: string;
  lastDay: string;
  competitions: CompetitionStub[];
}

export interface GetShowMasterlistResponse {
  masterlist: ShowMasterlist;
}

// ── Competition results ──────────────────────────────────────────────────────

export interface JumpingCompetitor {
  id: string;
  status: string;
  rankOfficial: number | null;
  placed: boolean;
  horsConcours: boolean;
  athlete: Athlete;
  horse: Horse | null;
}

export interface DressageCompetitor {
  id: string;
  status: string;
  rankOfficial: number | null;
  placed: boolean;
  horsConcours: boolean;
  resultOfficial: number | null;
  resultOfficialPoints: number | null;
  athlete: Athlete;
  horse: Horse | null;
}

export interface EventingCompetitor {
  id: string;
  status: string;
  rankOfficial: number | null;
  placed: boolean;
  horsConcours: boolean;
  resultOfficial: number | null;
  athlete: Athlete;
  horse: Horse | null;
}

export interface JumpingCompetition {
  id: string;
  name: string;
  number: string;
  discipline: "JUMPING";
  status: string;
  zonedInstant: { instant: string };
  show: { id?: string; name?: string; firstDay?: string; lastDay?: string };
  competitors: JumpingCompetitor[];
}

export interface DressageCompetition {
  id: string;
  name: string;
  number: string;
  discipline: "DRESSAGE";
  status: string;
  zonedInstant: { instant: string };
  show: { id?: string; name?: string; firstDay?: string; lastDay?: string };
  competitors: DressageCompetitor[];
}

export interface EventingCompetition {
  id: string;
  name: string;
  number: string;
  discipline: "EVENTING";
  status: string;
  zonedInstant: { instant: string };
  show: { id?: string; name?: string; firstDay?: string; lastDay?: string };
  competitors: EventingCompetitor[];
}

export type AnyCompetition = JumpingCompetition | DressageCompetition | EventingCompetition;
