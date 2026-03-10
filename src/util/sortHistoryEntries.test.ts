import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mergeAndSortHistoryEntries } from "./sortHistoryEntries";
import { SearchResult, SupportedBrowsers } from "../interfaces";

test("mergeAndSortHistoryEntries sorts entries by most recent visit across browsers", () => {
  const results: SearchResult[] = [
    {
      browser: SupportedBrowsers.Chrome,
      isLoading: false,
      data: [
        {
          id: "chrome-1",
          url: "https://chrome.example/recent",
          title: "Chrome recent",
          lastVisited: new Date("2026-03-09T16:00:00.000Z"),
          browser: SupportedBrowsers.Chrome,
        },
        {
          id: "chrome-2",
          url: "https://chrome.example/older",
          title: "Chrome older",
          lastVisited: new Date("2026-03-09T10:00:00.000Z"),
          browser: SupportedBrowsers.Chrome,
        },
      ],
    },
    {
      browser: SupportedBrowsers.Safari,
      isLoading: false,
      data: [
        {
          id: "safari-1",
          url: "https://safari.example/newest",
          title: "Safari newest",
          lastVisited: new Date("2026-03-09T18:00:00.000Z"),
          browser: SupportedBrowsers.Safari,
        },
      ],
    },
  ];

  const entries = mergeAndSortHistoryEntries(results);

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["safari-1", "chrome-1", "chrome-2"],
  );
});

test("mergeAndSortHistoryEntries uses firstInResults as a tie breaker", () => {
  const sameVisitTime = new Date("2026-03-09T18:00:00.000Z");
  const results: SearchResult[] = [
    {
      browser: SupportedBrowsers.Chrome,
      isLoading: false,
      data: [
        {
          id: "chrome-1",
          url: "https://chrome.example/tied",
          title: "Chrome tied",
          lastVisited: sameVisitTime,
          browser: SupportedBrowsers.Chrome,
        },
      ],
    },
    {
      browser: SupportedBrowsers.Firefox,
      isLoading: false,
      data: [
        {
          id: "firefox-1",
          url: "https://firefox.example/tied",
          title: "Firefox tied",
          lastVisited: sameVisitTime,
          browser: SupportedBrowsers.Firefox,
        },
      ],
    },
  ];

  const entries = mergeAndSortHistoryEntries(results, SupportedBrowsers.Firefox);

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["firefox-1", "chrome-1"],
  );
});
