"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsInLineHorizontal, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/useI18n";

// The page the document is drawn into: its own styles only, nothing of the app leaks in or out.
const FRAME_DOCUMENT = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

// Added after docx-preview has drawn (it empties the style container first). "safe center" keeps a page wider than
// the frame reachable by scrolling instead of cutting off its left side.
const FRAME_STYLE = "body{margin:0;background:#e5e7eb}.docx-wrapper{padding:16px!important;align-items:safe center!important}";

const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
/** Room kept beside the page when fitting it to the frame. */
const FIT_MARGIN_PX = 8;

type Zoom = "fit" | number;

/** The width of the widest page as drawn at 100%, padding included. */
function pageWidthOf(doc: Document): number {
  const wrapper = doc.querySelector<HTMLElement>(".docx-wrapper");
  if (!wrapper) return 0;
  const pages = Array.from(wrapper.querySelectorAll<HTMLElement>(":scope > section"));
  const widest = pages.reduce((max, page) => Math.max(max, page.offsetWidth), 0);
  const style = getComputedStyle(wrapper);
  return widest + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

/**
 * A Word document drawn by docx-preview (loaded only when needed) inside a sandboxed frame: the frame may not run any
 * script, open windows or navigate the app, so whatever a document contains - links, embedded HTML - stays inert. The
 * app's own script still draws into it (same origin, allowed by `allow-same-origin`).
 *
 * A Word page has a fixed width; in a narrow pane (split screen, a phone) it is scaled down to fit the frame by default,
 * and the reader can zoom in or out. Clicks and keys inside the frame are passed on to the app, so a click in the
 * document focuses its pane and shortcuts (Alt+S, Ctrl+K, Esc) keep working while reading.
 */
export function DocxPreview({ bytes, title, onError }: { bytes: ArrayBuffer; title: string; onError: () => void }) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pageWidth = useRef(0);
  const [frameReady, setFrameReady] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [scale, setScale] = useState(1);

  const applyZoom = useCallback(() => {
    const frame = frameRef.current;
    const wrapper = frame?.contentDocument?.querySelector<HTMLElement>(".docx-wrapper");
    if (!frame || !wrapper || pageWidth.current === 0) return;
    const fit = Math.min(1, Math.max(0.2, (frame.clientWidth - FIT_MARGIN_PX) / pageWidth.current));
    const next = zoom === "fit" ? fit : zoom;
    // Only a real change is applied: re-applying the same zoom must never feed another resize round.
    if (Math.abs(Number(wrapper.style.zoom || 1) - next) < 0.005) return;
    wrapper.style.zoom = String(next);
    setScale(next);
  }, [zoom]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!frameReady || !doc) return undefined;
    let cancelled = false;
    setRendering(true);
    import("docx-preview")
      .then(({ renderAsync }) => {
        if (cancelled) return undefined;
        doc.body.replaceChildren();
        return renderAsync(bytes, doc.body, doc.head, {
          inWrapper: true,
          breakPages: true,
          useBase64URL: true,
          renderAltChunks: false,
          renderComments: false,
          renderChanges: false,
          experimental: false,
        });
      })
      .then(() => {
        if (cancelled) return;
        const style = doc.createElement("style");
        style.textContent = FRAME_STYLE;
        doc.head.appendChild(style);
        pageWidth.current = pageWidthOf(doc);
        setRendering(false);
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
    };
  }, [bytes, frameReady, onError]);

  // Fit again whenever the frame changes width (the split divider, the window) and whenever the zoom changes.
  useEffect(() => {
    const frame = frameRef.current;
    if (rendering || !frame) return undefined;
    applyZoom();
    const observer = new ResizeObserver(applyZoom);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [rendering, applyZoom]);

  // Events inside a frame stay inside it; hand the ones the app listens for to the frame element, from where they
  // travel through the app as usual (pane focus on pointerdown, shortcuts on keydown).
  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frameReady || !frame || !doc) return undefined;
    const forwardPointer = () => frame.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const forwardKey = (event: KeyboardEvent) => {
      const copy = new KeyboardEvent("keydown", {
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        repeat: event.repeat,
        bubbles: true,
        cancelable: true,
      });
      if (!frame.dispatchEvent(copy)) event.preventDefault();
    };
    doc.addEventListener("pointerdown", forwardPointer);
    doc.addEventListener("keydown", forwardKey);
    return () => {
      doc.removeEventListener("pointerdown", forwardPointer);
      doc.removeEventListener("keydown", forwardKey);
    };
  }, [frameReady]);

  function step(direction: 1 | -1) {
    const index = ZOOM_STEPS.findIndex((value) => value >= scale - 0.001);
    const current = index === -1 ? ZOOM_STEPS.length - 1 : index;
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))] ?? 1;
    setZoom(next);
  }

  const toolButton =
    "flex h-8 w-8 items-center justify-center rounded text-fg-soft transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-end gap-1" role="toolbar" aria-label={t("fileViewer.zoom.toolbar")}>
        <button type="button" onClick={() => step(-1)} disabled={rendering || scale <= ZOOM_STEPS[0]!} aria-label={t("fileViewer.zoom.out")} title={t("fileViewer.zoom.out")} className={toolButton}>
          <MagnifyingGlassMinus size={18} aria-hidden />
        </button>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-fg-muted" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={rendering || scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!}
          aria-label={t("fileViewer.zoom.in")}
          title={t("fileViewer.zoom.in")}
          className={toolButton}
        >
          <MagnifyingGlassPlus size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setZoom("fit")}
          disabled={rendering}
          aria-pressed={zoom === "fit"}
          title={t("fileViewer.zoom.fit")}
          className={`${toolButton} w-auto gap-1 px-2 text-xs ${zoom === "fit" ? "bg-surface-muted text-fg" : ""}`}
        >
          <ArrowsInLineHorizontal size={16} aria-hidden />
          {t("fileViewer.zoom.fit")}
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frameRef}
          title={title}
          sandbox="allow-same-origin"
          srcDoc={FRAME_DOCUMENT}
          onLoad={() => setFrameReady(true)}
          className="h-full w-full rounded border-0"
        />
        {rendering && (
          <p role="status" className="absolute inset-x-0 top-6 text-center text-sm text-fg-muted">
            {t("fileViewer.loading")}
          </p>
        )}
      </div>
    </div>
  );
}
