import { useMemo } from "react";
import { getModUI, type ModTab } from "@/utils/mods";
import { injectModUIBridge } from "@/utils/modEvents";

interface ModTabViewProps {
  tab: ModTab;
}

/** Renders a mod-defined custom tab (from tabs.json) inline in the tab bar content area. */
const ModTabView = ({ tab }: ModTabViewProps) => {
  const srcDoc = useMemo(() => {
    const ui = getModUI().find(
      (u) => u.modId === tab.modId && u.path.toLowerCase() === tab.ui.toLowerCase(),
    );
    if (!ui) return "";
    return injectModUIBridge(ui.html, tab.modId);
  }, [tab]);

  if (!srcDoc) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
        Couldn't load this tab's UI file ({tab.ui}). The mod may be missing or was uninstalled.
      </div>
    );
  }

  return (
    <iframe
      key={tab.modId + tab.id}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="flex-1 w-full h-full border-0"
      title={tab.name}
    />
  );
};

export default ModTabView;
