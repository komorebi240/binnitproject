"use client";

import "@excalidraw/excalidraw/index.css";
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  MainMenu,
  WelcomeScreen,
  convertToExcalidrawElements,
  languages,
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { registerTextSource } from "@/features/smartSelect/textSources";
import { useI18n } from "@/lib/i18n/useI18n";
import { textInRect, type SceneElement } from "../boardText";
import { type SyncStatus, useWhiteboardSync } from "../hooks/useWhiteboardSync";
import { isAllowedElement, unsupportedElements, wrapForBoard } from "../sceneSync";
import { SNIPPET_MIME, carriesSnippet, subscribeSnippets, takeSnippet } from "../snippetTransfer";
import { canEdit, type StoredElement, type WhiteboardDetail } from "../types";
import { whiteboardErrorMessage } from "../whiteboardErrors";

declare global {
  interface Window {
    /** Where Excalidraw loads its fonts from; it falls back to a public CDN when this is unset. */
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

// Fonts come from this app (scripts/copy-excalidraw-assets.mjs), not from Excalidraw's public CDN.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

// Excalidraw ships a Vietnamese translation (vi-VN) but lists only languages translated above 85%, so `langCode`
// "vi-VN" would fall back to English. Listing it turns it on: the labels it has (stroke, background, opacity, layers...)
// show in Vietnamese and the ones it lacks stay in English.
const VIETNAMESE = { code: "vi-VN", label: "Tiếng Việt" };
if (!languages.some((language) => language.code === VIETNAMESE.code)) languages.push(VIETNAMESE);

/**
 * How much of the board view's own controls fits at the end of the toolbar row, beside Excalidraw's menu and its tools
 * (510 px in 0.18): the board's name too, the buttons, or only the saving status. In Excalidraw's phone layout its
 * tools fill the row and its side buttons (lock, hand) hang on the right edge, so only a saving problem is shown there
 * ("problem"); anything more squeezed the row against both edges.
 */
export type ToolbarFit = "name" | "buttons" | "status" | "problem";
/** Board widths (px) from which each fits, measured on the rendered row. */
const NAME_FITS_PX = 880;
const BUTTONS_FIT_PX = 770;
/**
 * Excalidraw's library (saved shapes) is not offered: this app does not keep it, so whatever was put in it was gone on
 * the next visit, and its catalogue of shapes lives on Excalidraw's own site. Excalidraw 0.18 has no option to switch it
 * off, so its ways in are hidden: the "Library" button (wide and phone layouts), the library tab of the side panel that
 * "Find on canvas" opens, and "Add to library" in the context menu together with the separator after it.
 */
const NO_LIBRARY_CLASSES =
  "[&_label:has(>.default-sidebar-trigger)]:!hidden [&_.sidebar-tab-trigger[id$=-trigger-library]]:!hidden [&_li[data-testid=addToLibrary]]:!hidden [&_li[data-testid=addToLibrary]+hr]:!hidden";
/** A right-button move shorter than this is a click (Excalidraw's context menu), not a pan. */
const PAN_THRESHOLD_PX = 4;
/** `PointerEvent.buttons` bit of the right button. */
const RIGHT_BUTTON_HELD = 2;
/** Excalidraw names its tool buttons `toolbar-<tool>` (the radio input's data-testid). */
const TOOL_BUTTON_PREFIX = "toolbar-";
/**
 * Excalidraw's section holding the options panel on a wide screen (on a phone the panel is a sheet that Excalidraw opens
 * and closes itself). Its class has no underscore on purpose: Tailwind reads `_` in an arbitrary variant as a space.
 */
const OPTIONS_PANEL_SELECTOR = ".selected-shape-actions";

/** An entry the board view puts at the top of the board's menu (≡). */
export interface BoardMenuAction {
  label: string;
  icon: ReactElement;
  onSelect: () => void;
}

function useWidth(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}

interface WhiteboardCanvasProps {
  board: WhiteboardDetail;
  /** The board's tab is on screen. */
  shown: boolean;
  onSyncChange: (status: SyncStatus, lastEditor: string | null) => void;
  /** Listed first in the board's menu: going back, renaming, deleting or leaving. */
  menuActions: readonly BoardMenuAction[];
  /** The end of the board's toolbar row: the board's name, saving status and buttons, as far as they fit. */
  renderToolbarEnd: (fit: ToolbarFit) => ReactElement | null;
}

/**
 * The drawing surface of one board: Excalidraw with what this app does not support switched off (images, embedded pages,
 * opening files from disk), kept in step with everyone else by useWhiteboardSync. Text dragged from Smart select is
 * dropped where the pointer is; text sent with "Send to a board…" lands in the middle of the view once the board is ready.
 * The other way round, Smart select reads the board's text through registerTextSource.
 */
export default function WhiteboardCanvas({
  board,
  shown,
  onSyncChange,
  menuActions,
  renderToolbarEnd,
}: WhiteboardCanvasProps) {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const editable = canEdit(board.access);
  const [excalidraw, setExcalidraw] = useState<ExcalidrawImperativeAPI | null>(null);
  const [dropping, setDropping] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const pan = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressContextMenu = useRef(false);
  const [optionsHidden, setOptionsHidden] = useState(false);
  const activeTool = useRef<string | null>(null);
  const width = useWidth(root);
  const fit: ToolbarFit =
    width >= NAME_FITS_PX ? "name" : width >= BUTTONS_FIT_PX ? "buttons" : "status";

  const handleSaveFailed = useCallback(
    (err: unknown) =>
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.canvas.couldNotSave"), t)),
    [showToast, t],
  );
  const { excalidrawRef, status, lastEditor, handleChange } = useWhiteboardSync({
    board,
    editable,
    shown,
    onSaveFailed: handleSaveFailed,
  });

  useEffect(() => onSyncChange(status, lastEditor), [status, lastEditor, onSyncChange]);

  // Read once: after the first render the canvas owns the drawing and merges newer versions itself.
  const initialData = useMemo(
    () => ({ elements: board.scene.elements as never, scrollToContent: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const insertSnippet = useCallback(
    (text: string, at?: { clientX: number; clientY: number }) => {
      if (!excalidraw) return;
      if (!editable) {
        showToast("error", t("whiteboards.canvas.viewOnly"));
        return;
      }
      const appState = excalidraw.getAppState();
      const point = viewportCoordsToSceneCoords(
        at ?? {
          clientX: appState.offsetLeft + appState.width / 2,
          clientY: appState.offsetTop + appState.height / 2,
        },
        appState,
      );
      const created = convertToExcalidrawElements([
        // Nunito has every Vietnamese letter; the hand-drawn default font does not.
        {
          type: "text",
          x: point.x,
          y: point.y,
          text: wrapForBoard(text),
          fontFamily: FONT_FAMILY.Nunito,
          fontSize: 20,
        },
      ]);
      excalidraw.updateScene({
        elements: [...excalidraw.getSceneElementsIncludingDeleted(), ...created],
        appState: {
          selectedElementIds: Object.fromEntries(
            created.map((element) => [element.id, true as const]),
          ),
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [excalidraw, editable, showToast, t],
  );

  // "Send to a board…" from Smart select: placed as soon as this board is ready.
  useEffect(() => {
    if (!excalidraw) return;
    const place = () => {
      const text = takeSnippet(board.id);
      if (text) insertSnippet(text);
    };
    place();
    return subscribeSnippets(place);
  }, [excalidraw, board.id, insertSnippet]);

  // Smart select (Alt+S) cannot read text drawn on a canvas: the board hands over the text inside the selected area.
  useEffect(() => {
    if (!root || !excalidraw) return undefined;
    return registerTextSource({
      root,
      read: (area) => {
        const appState = excalidraw.getAppState();
        const topLeft = viewportCoordsToSceneCoords(
          { clientX: area.left, clientY: area.top },
          appState,
        );
        const bottomRight = viewportCoordsToSceneCoords(
          { clientX: area.right, clientY: area.bottom },
          appState,
        );
        const found = textInRect(
          excalidraw.getSceneElements() as unknown as readonly SceneElement[],
          {
            minX: topLeft.x,
            minY: topLeft.y,
            maxX: bottomRight.x,
            maxY: bottomRight.y,
          },
        );
        return found.map((item) => {
          const start = sceneCoordsToViewportCoords({ sceneX: item.x, sceneY: item.y }, appState);
          const end = sceneCoordsToViewportCoords(
            { sceneX: item.x + item.width, sceneY: item.y + item.height },
            appState,
          );
          return {
            text: item.text,
            box: { left: start.x, top: start.y, right: end.x, bottom: end.y },
          };
        });
      },
    });
  }, [root, excalidraw]);

  function handleChangeAndDropUnsupported(elements: readonly StoredElement[]) {
    // An image dropped or pasted in by other means could never be saved: take it off again and say why.
    if (editable && excalidraw && unsupportedElements(elements).length > 0) {
      queueMicrotask(() => {
        excalidraw.updateScene({
          elements: excalidraw
            .getSceneElementsIncludingDeleted()
            .filter((element) => isAllowedElement(element)),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      });
      showToast("error", t("whiteboards.canvas.imagesNotSupported"));
      return;
    }
    handleChange(elements);
  }

  function handlePaste(data: ClipboardData): boolean {
    const hasFiles = data.files !== undefined && Object.keys(data.files).length > 0;
    if (hasFiles || (data.elements ?? []).some((element) => !isAllowedElement(element))) {
      showToast("error", t("whiteboards.canvas.imagesNotSupported"));
      return false;
    }
    return true;
  }

  // Right button + drag on the canvas moves the page (Excalidraw itself pans with the middle button or Space + drag). A
  // right click without moving still opens Excalidraw's own menu. Press and release are left to Excalidraw, which
  // tracks every pointer; only the moves of a pan are kept from it, so it does not treat them as hovering.
  function handlePanStart(event: React.PointerEvent<HTMLDivElement>) {
    suppressContextMenu.current = false;
    if (event.button !== 2 || !(event.target instanceof HTMLCanvasElement)) return;
    pan.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function handlePanMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = pan.current;
    if (!current || !excalidraw) return;
    // Released outside the window: the pan is over.
    if ((event.buttons & RIGHT_BUTTON_HELD) === 0) {
      pan.current = null;
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
    event.stopPropagation();
    current.moved = true;
    current.x = event.clientX;
    current.y = event.clientY;
    const { scrollX, scrollY, zoom } = excalidraw.getAppState();
    excalidraw.updateScene({
      appState: { scrollX: scrollX + dx / zoom.value, scrollY: scrollY + dy / zoom.value },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }

  function handlePanEnd() {
    // On Windows the context menu opens on release; after a pan it must not.
    suppressContextMenu.current = pan.current?.moved ?? false;
    pan.current = null;
  }

  // Clicking the tool that is already selected (the pencil, say) hides the options panel beside the toolbar (stroke,
  // background, width...) to leave more room; clicking it again brings the panel back. Picking another tool shows its
  // options again. Read in the capture phase, before Excalidraw switches the tool, so "already selected" is still known.
  function handleToolClick(event: React.MouseEvent<HTMLDivElement>) {
    const input = event.target;
    if (!excalidraw || !(input instanceof HTMLInputElement) || input.type !== "radio") return;
    const tool = input.dataset.testid;
    if (!tool?.startsWith(TOOL_BUTTON_PREFIX)) return;
    if (tool.slice(TOOL_BUTTON_PREFIX.length) !== excalidraw.getAppState().activeTool.type) return;
    // A tool without options (the hand, the eraser) has no panel to hide.
    if (!root?.querySelector(OPTIONS_PANEL_SELECTOR)) return;
    setOptionsHidden((hidden) => !hidden);
  }

  function handleToolChange(tool: string) {
    if (tool === activeTool.current) return;
    activeTool.current = tool;
    setOptionsHidden(false);
  }

  return (
    <div
      ref={setRoot}
      className={`relative h-full w-full ${NO_LIBRARY_CLASSES} ${optionsHidden ? "[&_.selected-shape-actions]:!hidden" : ""}`}
      onClickCapture={handleToolClick}
      onPointerDownCapture={handlePanStart}
      onPointerMoveCapture={handlePanMove}
      onPointerUpCapture={handlePanEnd}
      onPointerCancelCapture={handlePanEnd}
      onContextMenuCapture={(event) => {
        if (!suppressContextMenu.current) return;
        suppressContextMenu.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragOverCapture={(event) => {
        if (!carriesSnippet(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = editable ? "copy" : "none";
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
      }}
      onDropCapture={(event) => {
        if (!carriesSnippet(event.dataTransfer)) return;
        // Ours, not Excalidraw's: it would otherwise also try to read the drop.
        event.preventDefault();
        event.stopPropagation();
        setDropping(false);
        insertSnippet(event.dataTransfer.getData(SNIPPET_MIME), {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawRef.current = api;
          setExcalidraw(api);
        }}
        initialData={initialData}
        onChange={(elements, appState) => {
          handleToolChange(appState.activeTool.type);
          handleChangeAndDropUnsupported(elements as unknown as readonly StoredElement[]);
        }}
        renderTopRightUI={(isMobile) => renderToolbarEnd(isMobile ? "problem" : fit)}
        onPaste={handlePaste}
        viewModeEnabled={!editable}
        theme={theme === "dark" ? "dark" : "light"}
        langCode={locale === "vi" ? VIETNAMESE.code : "en"}
        name={board.title}
        aiEnabled={false}
        validateEmbeddable={false}
        UIOptions={{
          tools: { image: false },
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            toggleTheme: null,
          },
        }}
      >
        <MainMenu>
          {menuActions.map((action) => (
            <MainMenu.Item key={action.label} icon={action.icon} onSelect={action.onSelect}>
              {action.label}
            </MainMenu.Item>
          ))}
          {menuActions.length > 0 && <MainMenu.Separator />}
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          {editable && <MainMenu.DefaultItems.ClearCanvas />}
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Heading>
              {editable ? t("whiteboards.canvas.welcome") : t("whiteboards.canvas.welcomeViewOnly")}
            </WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
      {dropping && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/5">
          <span className="rounded glass px-3 py-1.5 text-sm font-medium text-fg">
            {editable ? t("whiteboards.canvas.dropHere") : t("whiteboards.canvas.viewOnly")}
          </span>
        </div>
      )}
    </div>
  );
}
