import { List } from "@raycast/api";
import { BrowserHistoryActions } from "./index";
import { HistoryEntry } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class ListEntries {
  public static HistoryEntry = HistoryListEntry;
}

function HistoryListEntry({ entry }: { entry: HistoryEntry }) {
  const { url, title, id, lastVisited, browser, profileName } = entry;
  const accessories: List.Item.Accessory[] = [{ tag: browser }];
  if (profileName) {
    accessories.push({ tag: profileName });
  }

  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      accessories={accessories}
      actions={<BrowserHistoryActions.HistoryItem entry={{ url, title, id, lastVisited, browser, profileName }} />}
    />
  );
}
