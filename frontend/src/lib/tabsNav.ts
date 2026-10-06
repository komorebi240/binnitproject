/** Keyboard movement along a row (or column) of tabs, skipping disabled ones - the behaviour of the ARIA tabs pattern. */

export interface NavTab {
  id: string;
  disabled?: boolean;
}

/** The tab a key press moves to, or null when the key does nothing here. Arrows wrap around; Home/End jump to the ends. */
export function nextTabId(tabs: NavTab[], currentId: string, key: string): string | null {
  const enabled = tabs.filter((tab) => !tab.disabled);
  if (enabled.length === 0) return null;
  const position = enabled.findIndex((tab) => tab.id === currentId);

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (enabled[(position + 1) % enabled.length] as NavTab).id;
    case "ArrowLeft":
    case "ArrowUp":
      return (enabled[(position <= 0 ? enabled.length : position) - 1] as NavTab).id;
    case "Home":
      return (enabled[0] as NavTab).id;
    case "End":
      return (enabled[enabled.length - 1] as NavTab).id;
    default:
      return null;
  }
}
