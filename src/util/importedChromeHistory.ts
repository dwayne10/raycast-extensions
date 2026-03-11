import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { HistoryEntry, SupportedBrowsers } from "../interfaces";

const IMPORTED_CHROME_HISTORY_LIMIT = 30;

type ImportedChromeHistoryCacheEntry = {
  readonly entries: HistoryEntry[];
  readonly mtimeMs: number;
};

const importedChromeHistoryCache = new Map<string, ImportedChromeHistoryCacheEntry>();

export const IMPORTED_CHROME_HISTORY_PROFILE_NAME = "Imported TSV";

const normalizeQueryTerms = (query?: string): string[] =>
  query ? query.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];

const matchesAllTerms = (value: string, terms: string[]) => terms.every((term) => value.includes(term));

const toTimestampMs = (rawTimestamp: string): number => {
  if (!rawTimestamp.startsWith("U")) {
    return Number.NaN;
  }

  return Number(rawTimestamp.slice(1));
};

export function resolveImportedChromeHistoryPath(tsvPath: string): string {
  if (tsvPath === "~") {
    return homedir();
  }

  if (tsvPath.startsWith("~/")) {
    return resolve(homedir(), tsvPath.slice(2));
  }

  return resolve(tsvPath);
}

export function parseImportedChromeHistoryTsv(content: string): HistoryEntry[] {
  return content
    .split(/\r?\n/)
    .flatMap((line, index) => {
      if (!line.trim()) {
        return [];
      }

      const [url = "", rawTimestamp = "", , title = ""] = line.split("\t");
      const timestampMs = toTimestampMs(rawTimestamp);

      if (!url || !Number.isFinite(timestampMs)) {
        return [];
      }

      return [
        {
          id: `ImportedChrome-${index}-${timestampMs}`,
          url,
          title,
          lastVisited: new Date(timestampMs),
          browser: SupportedBrowsers.Chrome,
          profileName: IMPORTED_CHROME_HISTORY_PROFILE_NAME,
        },
      ];
    })
    .sort((left, right) => new Date(right.lastVisited).getTime() - new Date(left.lastVisited).getTime());
}

export function getImportedChromeHistoryEntries(tsvPath: string): HistoryEntry[] {
  const resolvedPath = resolveImportedChromeHistoryPath(tsvPath);
  const { mtimeMs } = statSync(resolvedPath);
  const cached = importedChromeHistoryCache.get(resolvedPath);

  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.entries;
  }

  const entries = parseImportedChromeHistoryTsv(readFileSync(resolvedPath, "utf-8"));
  importedChromeHistoryCache.set(resolvedPath, { entries, mtimeMs });
  return entries;
}

export function filterImportedChromeHistoryEntries(entries: HistoryEntry[], query?: string): HistoryEntry[] {
  const terms = normalizeQueryTerms(query);

  if (terms.length === 0) {
    return entries.slice(0, IMPORTED_CHROME_HISTORY_LIMIT);
  }

  return entries
    .filter((entry) => {
      const normalizedTitle = entry.title.toLowerCase();
      const normalizedUrl = entry.url.toLowerCase();

      return matchesAllTerms(normalizedTitle, terms) || matchesAllTerms(normalizedUrl, terms);
    })
    .slice(0, IMPORTED_CHROME_HISTORY_LIMIT);
}
