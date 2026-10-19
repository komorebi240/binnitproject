import { useTabs } from "@/components/layout/TabsContext";
import { fileViewerPath, type FileSource } from "../fileSources";

/** Opens an attachment in a new tab of the dashboard, next to what the user was doing. */
export function useOpenFile(): (source: FileSource, fileName: string) => void {
  const { openNewTab, navigateActiveTab } = useTabs();
  return (source, fileName) => {
    openNewTab();
    navigateActiveTab(fileViewerPath(source, fileName));
  };
}
