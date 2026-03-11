import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMPORTED_CHROME_HISTORY_PROFILE_NAME,
  filterImportedChromeHistoryEntries,
  parseImportedChromeHistoryTsv,
} from "./importedChromeHistory";
import { SupportedBrowsers } from "../interfaces";

test("parseImportedChromeHistoryTsv normalizes HTU-compatible TSV rows into Chrome history entries", () => {
  const entries = parseImportedChromeHistoryTsv(
    [
      "https://example.com/older\tU1741478400000\tlink\tOlder title",
      "https://example.com/newer\tU1741564800000\ttyped\tNewer title",
    ].join("\n"),
  );

  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => ({
      url: entry.url,
      title: entry.title,
      browser: entry.browser,
      profileName: entry.profileName,
    })),
    [
      {
        url: "https://example.com/newer",
        title: "Newer title",
        browser: SupportedBrowsers.Chrome,
        profileName: IMPORTED_CHROME_HISTORY_PROFILE_NAME,
      },
      {
        url: "https://example.com/older",
        title: "Older title",
        browser: SupportedBrowsers.Chrome,
        profileName: IMPORTED_CHROME_HISTORY_PROFILE_NAME,
      },
    ],
  );
  assert.equal(entries[0].lastVisited.toISOString(), "2025-03-10T00:00:00.000Z");
  assert.match(entries[0].id, /^ImportedChrome-\d+-1741564800000$/);
});

test("filterImportedChromeHistoryEntries matches all query terms against title or url and limits results", () => {
  const entries = parseImportedChromeHistoryTsv(
    [
      "https://example.com/amazon-web-services\tU1741564800000\tlink\tAWS Console Login",
      "https://example.com/amazon-music\tU1741478400000\tlink\tAmazon Music",
      "https://example.com/not-a-match\tU1741392000000\tlink\tCompletely Different",
    ].join("\n"),
  );

  const matches = filterImportedChromeHistoryEntries(entries, "amazon music");

  assert.deepEqual(
    matches.map((entry) => entry.url),
    ["https://example.com/amazon-music"],
  );
});
