import { ActionPanel, Action, getPreferenceValues, List } from "@raycast/api";
import { useHistorySearch, useChromeMultiProfileSearch, useImportedChromeTsvSearch } from "./hooks/useHistorySearch";
import { ReactElement, isValidElement, useState } from "react";
import { Preferences, SearchResult, SupportedBrowsers } from "./interfaces";
import { BrowserHistoryActions, ListEntries } from "./components";
import { mergeAndSortHistoryEntries } from "./util/sortHistoryEntries";

export default function Command(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const enabled =
    Object.entries(preferences).filter(([key, value]) => key.startsWith("enable") && value).length > 0 ||
    Boolean(preferences.importedChromeHistoryTsvPath?.trim());
  const [searchText, setSearchText] = useState<string>();

  const isLoading: boolean[] = [];
  const permissionView: ReactElement[] = [];
  const searchTextEncoded = encodeURIComponent(searchText ?? "");
  const searchEngine = preferences.searchEngine;
  const searchUrl = searchEngine
    ? searchEngine.replace(/{{query}}/g, searchTextEncoded)
    : `https://www.google.com/search?q=${searchTextEncoded}`;

  const chromeResults = preferences.enableChrome ? useChromeMultiProfileSearch(searchText) : [];
  const importedChromeHistory = useImportedChromeTsvSearch(searchText);
  const otherResults = Object.entries(preferences)
    .filter(([key, val]) => key.startsWith("enable") && val && key !== "enableChrome")
    .map(([key]) => useHistorySearch(key.replace("enable", "") as SupportedBrowsers, searchText));

  const allResults: SearchResult[] = importedChromeHistory
    ? [...chromeResults, importedChromeHistory, ...otherResults]
    : [...chromeResults, ...otherResults];

  for (const entry of allResults) {
    if (entry.permissionView && isValidElement(entry.permissionView)) {
      permissionView.push(entry.permissionView);
    }
    isLoading.push(entry.isLoading);
  }

  if (permissionView.length > 0) {
    return permissionView[0];
  }

  const sortedEntries = mergeAndSortHistoryEntries(allResults, preferences.firstInResults);

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading.some((e) => e)} throttle={false}>
      {!enabled ? (
        <List.EmptyView
          title="You haven't enabled any browsers yet"
          description="You can choose which browsers history to integrate in preferences"
          icon={"icon-small.png"}
          actions={
            <ActionPanel>
              <BrowserHistoryActions.OpenPreferences />
            </ActionPanel>
          }
        />
      ) : sortedEntries.length === 0 ? (
        <List.EmptyView
          title={searchText ? `No ${searchText} history found` : "No history found"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Search in Browser" url={searchUrl} />
            </ActionPanel>
          }
        />
      ) : (
        sortedEntries.map((entry) => <ListEntries.HistoryEntry entry={entry} key={entry.id} />)
      )}
    </List>
  );
}
