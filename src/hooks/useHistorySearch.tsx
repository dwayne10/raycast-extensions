import { copyFileSync, existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { useSQL } from "@raycast/utils";
import { HistoryEntry, HistoryQueryFunction, Preferences, SearchResult, SupportedBrowsers } from "../interfaces";
import { getChromeProfiles, getHistoryDateColumn, getHistoryDbPath, getHistoryTable } from "../util";
import { NotInstalledError } from "../components";
import { getPreferenceValues } from "@raycast/api";

const whereClauses = (tableTitle: string, terms: string[], tableUrl?: string) => {
  const urlTable = tableUrl || tableTitle;
  return (
    "(" +
    terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ") +
    ") OR (" +
    terms.map((t) => `${urlTable}.url LIKE '%${t}%'`).join(" AND ") +
    ")"
  );
};

const getWebKitHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT history_items.id as id, url, history_visits.title as title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
    INNER JOIN history_visits
    ON history_visits.history_item = history_items.id
  WHERE ${whereClauses("history_visits", terms, "history_items")}
  GROUP BY url
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;

const getOrionHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT ID as id, URL as url, TITLE as title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;

const getChromiumGeckoHistoryQuery = (table: string, date_field: string, terms: string[], daysLimit?: number) => {
  const dateFilter = daysLimit
    ? ` AND ${date_field} > (strftime('%s', 'now', '-${daysLimit} days') - strftime('%s', '1601-01-01')) * 1000000`
    : "";
  return `SELECT
    id, url, title,
    datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
  FROM ${table}
  WHERE (${whereClauses(table, terms)})${dateFilter}
  ORDER BY ${date_field} DESC LIMIT 30;`;
};

const getHistoryQuery = (browser: SupportedBrowsers): HistoryQueryFunction => {
  switch (browser) {
    case SupportedBrowsers.Safari:
      return getWebKitHistoryQuery;
    case SupportedBrowsers.Orion:
      return getOrionHistoryQuery;
    default:
      return (table, date_field, terms) => getChromiumGeckoHistoryQuery(table, date_field, terms);
  }
};

const searchHistory = (
  browser: SupportedBrowsers,
  table: string,
  date_field: string,
  queryBuilder: (table: string, date_field: string, terms: string[]) => string,
  query?: string,
): SearchResult => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = queryBuilder(table, date_field, terms);
  const dbPath = getHistoryDbPath(browser);

  if (!existsSync(dbPath)) {
    return {
      browser,
      data: [],
      isLoading: false,
      permissionView: <NotInstalledError browser={browser} />,
    };
  }

  const { data, isLoading, permissionView } = useSQL<HistoryEntry>(dbPath, queries);
  return {
    browser,
    data: data?.map((d) => ({ ...d, id: `${browser}-${d.id}`, browser: browser })),
    isLoading,
    permissionView,
  };
};

// Cache for temp DB copies to avoid recreating on every render
const tempDbCache = new Map<string, string>();

function getTempDbPath(originalPath: string): string {
  if (tempDbCache.has(originalPath)) {
    return tempDbCache.get(originalPath)!;
  }
  const tempDir = mkdtempSync(join(tmpdir(), "raycast-browser-history-"));
  const tempPath = join(tempDir, "History");
  try {
    copyFileSync(originalPath, tempPath);
    tempDbCache.set(originalPath, tempPath);
    return tempPath;
  } catch {
    return originalPath; // Fall back to original if copy fails
  }
}

function useChromeProfileSearch(profilePath: string, profileName: string, profileDir: string, query?: string) {
  const terms = query ? query.trim().split(" ") : [""];
  const { historyDaysLimit, historyLimitThreshold } = getPreferenceValues<Preferences>();
  const daysLimit = historyLimitThreshold && historyDaysLimit ? historyDaysLimit : undefined;
  const sql = getChromiumGeckoHistoryQuery("urls", "last_visit_time", terms, daysLimit);

  const exists = existsSync(profilePath);
  const dbPath = exists ? getTempDbPath(profilePath) : "";
  const { data, isLoading, permissionView } = useSQL<HistoryEntry>(dbPath, exists ? sql : "");

  return {
    profileName,
    data: exists
      ? data?.map((d) => ({
          ...d,
          id: `Chrome-${profileName}-${d.id}`,
          browser: SupportedBrowsers.Chrome,
          profileName,
          profileDir,
        }))
      : [],
    isLoading: exists ? isLoading : false,
    permissionView: exists ? permissionView : undefined,
  };
}

export function useChromeMultiProfileSearch(query?: string): SearchResult[] {
  const { chromeProfiles } = getPreferenceValues<Preferences>();
  const allowedProfiles = chromeProfiles ? chromeProfiles.split(",").map((p) => p.trim().toLowerCase()) : null;

  let profiles = getChromeProfiles();

  // Filter profiles if preference is set
  if (allowedProfiles && allowedProfiles.length > 0 && allowedProfiles[0] !== "") {
    profiles = profiles.filter((p) => allowedProfiles.includes(p.profileName.toLowerCase()));
  }

  if (profiles.length === 0) {
    return [
      {
        browser: SupportedBrowsers.Chrome,
        data: [],
        isLoading: false,
        permissionView: <NotInstalledError browser={SupportedBrowsers.Chrome} />,
      },
    ];
  }

  // We need to call hooks unconditionally, so we use a fixed max number of profiles
  const maxProfiles = 10;
  const results: SearchResult[] = [];

  for (let i = 0; i < maxProfiles; i++) {
    const profile = profiles[i];
    if (profile) {
      const result = useChromeProfileSearch(profile.profilePath, profile.profileName, profile.profileDir, query);
      if (result.permissionView) {
        return [{ browser: SupportedBrowsers.Chrome, ...result }];
      }
      results.push({ browser: SupportedBrowsers.Chrome, ...result });
    }
  }

  return results;
}

export function useHistorySearch(browser: SupportedBrowsers, query: string | undefined): SearchResult {
  return searchHistory(
    browser,
    getHistoryTable(browser),
    getHistoryDateColumn(browser),
    getHistoryQuery(browser),
    query,
  );
}
