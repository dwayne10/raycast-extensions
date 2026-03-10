import { HistoryEntry, SearchResult, SupportedBrowsers } from "../interfaces";

const getVisitedTime = (entry: HistoryEntry) => new Date(entry.lastVisited).getTime();

export function mergeAndSortHistoryEntries(
  results: SearchResult[],
  firstInResults?: SupportedBrowsers,
): HistoryEntry[] {
  return results
    .flatMap((result) => result.data ?? [])
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const visitTimeDifference = getVisitedTime(right.entry) - getVisitedTime(left.entry);
      if (visitTimeDifference !== 0) {
        return visitTimeDifference;
      }

      if (firstInResults) {
        const leftPreferred = left.entry.browser === firstInResults;
        const rightPreferred = right.entry.browser === firstInResults;
        if (leftPreferred !== rightPreferred) {
          return leftPreferred ? -1 : 1;
        }
      }

      const browserDifference = left.entry.browser.localeCompare(right.entry.browser);
      if (browserDifference !== 0) {
        return browserDifference;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}
