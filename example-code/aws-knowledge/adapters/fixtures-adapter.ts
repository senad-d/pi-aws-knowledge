import fs from "node:fs";
import path from "node:path";
import { FIXTURE_DATASET_VERSION } from "../constants.ts";
import { ToolExecutionError, type RecommendationRow, type RegionRow } from "../contracts.ts";

type SearchFixtureRow = {
  url: string;
  title: string;
  context: string;
  topics: string[];
  sop_name?: string;
};

type ReadPageFixtureRow = {
  url: string;
  title: string;
  content: string;
  redirected_url?: string;
};

type RecommendationFixtureFile = {
  fixture_version?: string;
  exact: Array<{ source_url: string; recommendations: RecommendationRow[] }>;
  service_fallback: Array<{ service: string; recommendations: RecommendationRow[] }>;
};

type AvailabilityFixtureItem = {
  id: string;
  name: string;
  service?: string;
  statuses: Record<string, string>;
};

type AvailabilityFixtureFile = {
  fixture_version?: string;
  product: AvailabilityFixtureItem[];
  api: AvailabilityFixtureItem[];
  cfn: AvailabilityFixtureItem[];
};

type SopsFixtureRow = {
  sop_name: string;
  title: string;
  content: string;
};

export type FixtureAdapter = {
  kind: "fixtures";
  fixtureVersion: string;
  getSearchRows: () => SearchFixtureRow[];
  getReadPageByUrl: (url: string) => ReadPageFixtureRow | undefined;
  getRecommendationsByUrl: (url: string) => RecommendationRow[];
  getRecommendationsByService: (service: string) => RecommendationRow[];
  getRegions: () => RegionRow[];
  getAvailabilityItems: (resourceType: "product" | "api" | "cfn") => AvailabilityFixtureItem[];
  getSopByName: (sopName: string) => SopsFixtureRow | undefined;
};

function readJsonFile<T>(fixtureRoot: string, fileName: string): T {
  const filePath = path.join(fixtureRoot, fileName);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new ToolExecutionError(
      "downstream_error",
      `Failed to load fixture file: ${filePath}`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

function normalizeUrl(value: string): string {
  return value.trim();
}

export function createFixtureAdapter(fixtureRoot: string): FixtureAdapter {
  const searchFile = readJsonFile<{ fixture_version?: string; hits: SearchFixtureRow[] }>(fixtureRoot, "search.json");
  const readFile = readJsonFile<{ fixture_version?: string; pages: ReadPageFixtureRow[] }>(fixtureRoot, "read-pages.json");
  const recommendFile = readJsonFile<RecommendationFixtureFile>(fixtureRoot, "recommendations.json");
  const regionsFile = readJsonFile<{ fixture_version?: string; regions: RegionRow[] }>(fixtureRoot, "regions.json");
  const availabilityFile = readJsonFile<AvailabilityFixtureFile>(fixtureRoot, "availability.json");
  const sopsFile = readJsonFile<{ fixture_version?: string; items: SopsFixtureRow[] }>(fixtureRoot, "sops.json");

  const fixtureVersion =
    searchFile.fixture_version ||
    readFile.fixture_version ||
    recommendFile.fixture_version ||
    regionsFile.fixture_version ||
    availabilityFile.fixture_version ||
    sopsFile.fixture_version ||
    FIXTURE_DATASET_VERSION;

  const readPageIndex = new Map<string, ReadPageFixtureRow>();
  for (const page of readFile.pages) {
    readPageIndex.set(normalizeUrl(page.url), page);
  }

  const recommendationExactIndex = new Map<string, RecommendationRow[]>();
  for (const entry of recommendFile.exact) {
    recommendationExactIndex.set(normalizeUrl(entry.source_url), [...entry.recommendations]);
  }

  const recommendationServiceIndex = new Map<string, RecommendationRow[]>();
  for (const entry of recommendFile.service_fallback) {
    recommendationServiceIndex.set(entry.service.trim().toLowerCase(), [...entry.recommendations]);
  }

  const sopIndex = new Map<string, SopsFixtureRow>();
  for (const sop of sopsFile.items) {
    sopIndex.set(sop.sop_name, sop);
  }

  const sortedSearchRows = [...searchFile.hits].sort((a, b) => a.url.localeCompare(b.url));
  const sortedRegions = [...regionsFile.regions].sort((a, b) => a.region_id.localeCompare(b.region_id));

  const sortedAvailability: AvailabilityFixtureFile = {
    fixture_version: availabilityFile.fixture_version,
    product: [...availabilityFile.product].sort((a, b) => a.id.localeCompare(b.id)),
    api: [...availabilityFile.api].sort((a, b) => a.id.localeCompare(b.id)),
    cfn: [...availabilityFile.cfn].sort((a, b) => a.id.localeCompare(b.id)),
  };

  return {
    kind: "fixtures",
    fixtureVersion,
    getSearchRows: () => sortedSearchRows.map((row) => ({ ...row, topics: [...row.topics] })),
    getReadPageByUrl: (url) => {
      const row = readPageIndex.get(normalizeUrl(url));
      return row ? { ...row } : undefined;
    },
    getRecommendationsByUrl: (url) => [...(recommendationExactIndex.get(normalizeUrl(url)) ?? [])],
    getRecommendationsByService: (service) => [...(recommendationServiceIndex.get(service.trim().toLowerCase()) ?? [])],
    getRegions: () => sortedRegions.map((region) => ({ ...region })),
    getAvailabilityItems: (resourceType) => sortedAvailability[resourceType].map((item) => ({
      ...item,
      statuses: { ...item.statuses },
    })),
    getSopByName: (sopName) => {
      const row = sopIndex.get(sopName);
      return row ? { ...row } : undefined;
    },
  };
}
