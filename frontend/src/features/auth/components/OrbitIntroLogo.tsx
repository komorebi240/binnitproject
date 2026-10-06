"use client";

import { useEffect, useId, useRef } from "react";
import {
  CAP_HEIGHT_RATIO,
  LOGO,
  OrbitGradientDefs,
  OrbitLogoMark,
  WORD_TEXT_CLASS,
} from "@/components/brand/orbitLogo";
import {
  frameAt,
  INTRO_DURATION,
  ORBIT,
  type IntroFrame,
  type LetterTarget,
} from "../introTimeline";

interface OrbitIntroLogoProps {
  width: number;
  height: number;
  /** Called once, when the letters are in place (also when the user skips the intro). */
  onComplete: () => void;
}

const FONT_WAIT_MS = 1200;
const CAP_HALF = (LOGO.text.fontSize * CAP_HEIGHT_RATIO) / 2;
const LETTERS = LOGO.text.word.split("");
const SKIP_EVENTS = ["keydown", "pointerdown"] as const;

/** Slots used before the real glyph positions are measured (and if measuring is impossible). */
const FALLBACK_ADVANCE = 24.5;
const FALLBACK_HALF_WIDTH = 11;
const FALLBACK_TARGETS: LetterTarget[] = LETTERS.map((_, i) => ({
  x: LOGO.text.x + i * FALLBACK_ADVANCE + FALLBACK_HALF_WIDTH,
  y: LOGO.text.baseline - CAP_HALF,
}));

interface MeasuredWord {
  targets: LetterTarget[];
  halfWidths: number[];
}

/**
 * Where each letter of the finished word really sits, read from the browser's own layout of the
 * (invisible) reference text. Because the letters end on these exact positions, the animation lands
 * on the real wordmark with no jump, whatever font the browser ended up using.
 */
function measureWord(reference: SVGTextElement | null): MeasuredWord | null {
  if (!reference) return null;
  try {
    if (reference.getNumberOfChars() !== LETTERS.length) return null;
    const targets: LetterTarget[] = [];
    const halfWidths: number[] = [];
    for (let i = 0; i < LETTERS.length; i++) {
      const start = reference.getStartPositionOfChar(i).x;
      const end = reference.getEndPositionOfChar(i).x;
      const halfWidth = Math.max(0, (end - start) / 2);
      halfWidths.push(halfWidth);
      targets.push({ x: start + halfWidth, y: LOGO.text.baseline - CAP_HALF });
    }
    return { targets, halfWidths };
  } catch {
    return null; // not laid out (e.g. display: none): keep the fallback slots
  }
}

/** Gives the web font a moment to arrive so the measured positions are those of the final font. */
async function waitForBrandFont(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const loaded = document.fonts
    .load(`700 ${LOGO.text.fontSize}px "Space Grotesk"`, LOGO.text.word)
    .catch(() => undefined);
  await Promise.race([loaded, new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS))]);
}

function logoTransform(frame: IntroFrame): string {
  const { cx, cy } = LOGO.planet;
  return `translate(${frame.logoDx} 0) translate(${cx} ${cy}) scale(${frame.logoScale}) translate(${-cx} ${-cy})`;
}

/** Zoom of the whole scene about the middle of the logo box. */
function stageTransform(frame: IntroFrame): string {
  const cx = LOGO.width / 2;
  const cy = LOGO.height / 2;
  return `translate(${cx} ${cy}) scale(${frame.stageScale}) translate(${-cx} ${-cy})`;
}

function guideTransform(frame: IntroFrame): string {
  return `translate(${frame.logoDx} 0)`;
}

/**
 * The login intro: the letters of ORBIT circle the planet logo, then are pushed out to form the word
 * beside it, exactly as in the static wordmark. The motion itself is `frameAt` (introTimeline.ts);
 * this component only applies each frame straight to the SVG attributes (no React re-renders at 60 fps).
 * Any key press or click skips to the finished logo.
 */
export function OrbitIntroLogo({ width, height, onComplete }: OrbitIntroLogoProps) {
  const gradientId = `orbit-gradient-${useId().replace(/:/g, "")}`;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stageRef = useRef<SVGGElement>(null);
  const logoRef = useRef<SVGGElement>(null);
  const guideRef = useRef<SVGGElement>(null);
  const wordRef = useRef<SVGTextElement>(null);
  const backRefs = useRef<(SVGGElement | null)[]>([]);
  const frontRefs = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    let finished = false;
    let rafId = 0;
    let targets = FALLBACK_TARGETS;

    function apply(frame: IntroFrame) {
      stageRef.current?.setAttribute("transform", stageTransform(frame));
      logoRef.current?.setAttribute("transform", logoTransform(frame));
      const guide = guideRef.current;
      if (guide) {
        guide.setAttribute("transform", guideTransform(frame));
        guide.setAttribute("opacity", String(frame.guideOpacity));
      }
      frame.letters.forEach((letter, i) => {
        const transform = `translate(${letter.x} ${letter.y}) scale(${letter.scale})`;
        const back = backRefs.current[i];
        const front = frontRefs.current[i];
        // Two copies of every letter, one behind the planet and one in front; only one is shown.
        back?.setAttribute("transform", transform);
        front?.setAttribute("transform", transform);
        back?.setAttribute("opacity", letter.behind ? String(letter.opacity) : "0");
        front?.setAttribute("opacity", letter.behind ? "0" : String(letter.opacity));
      });
    }

    function removeSkipListeners() {
      SKIP_EVENTS.forEach((name) => window.removeEventListener(name, skip));
    }

    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      removeSkipListeners();
      apply(frameAt(INTRO_DURATION, targets));
      // Hand over to the real word: same glyphs in the same places, now one text node again.
      backRefs.current.forEach((node) => node?.setAttribute("opacity", "0"));
      frontRefs.current.forEach((node) => node?.setAttribute("opacity", "0"));
      guideRef.current?.setAttribute("opacity", "0");
      wordRef.current?.setAttribute("opacity", "1");
      onCompleteRef.current();
    }

    function skip() {
      finish();
    }

    SKIP_EVENTS.forEach((name) => window.addEventListener(name, skip));

    void waitForBrandFont().then(() => {
      if (finished) return;
      const measured = measureWord(wordRef.current);
      if (measured) {
        targets = measured.targets;
        measured.halfWidths.forEach((half, i) => {
          for (const group of [backRefs.current[i], frontRefs.current[i]]) {
            group?.firstElementChild?.setAttribute("x", String(-half));
          }
        });
      }

      const startedAt = performance.now();
      const tick = (now: number) => {
        if (finished) return;
        const frame = frameAt((now - startedAt) / 1000, targets);
        if (frame.done) {
          finish();
          return;
        }
        apply(frame);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      finished = true;
      cancelAnimationFrame(rafId);
      removeSkipListeners();
    };
  }, []);

  // First frame (also what the server renders): planet in the middle, letters not yet visible.
  const initial = frameAt(0, FALLBACK_TARGETS);
  const orbitCenterY = LOGO.planet.cy + ORBIT.centerYOffset;

  const letterGroup = (kind: "back" | "front", letter: string, index: number) => {
    const frame = initial.letters[index]!;
    return (
      <g
        key={`${kind}-${index}`}
        ref={(node) => {
          (kind === "back" ? backRefs : frontRefs).current[index] = node;
        }}
        aria-hidden
        transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`}
        opacity={0}
      >
        <text
          className={WORD_TEXT_CLASS}
          x={-FALLBACK_HALF_WIDTH}
          y={CAP_HALF}
          fontSize={LOGO.text.fontSize}
        >
          {letter}
        </text>
      </g>
    );
  };

  return (
    <svg
      role="img"
      aria-label="Orbit"
      width={width}
      height={height}
      viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
      style={{ overflow: "visible" }}
    >
      <OrbitGradientDefs id={gradientId} />

      <g ref={stageRef} transform={stageTransform(initial)}>
        <g
          ref={guideRef}
          transform={guideTransform(initial)}
          opacity={initial.guideOpacity}
          aria-hidden
        >
          <ellipse
            cx={LOGO.planet.cx}
            cy={orbitCenterY}
            rx={ORBIT.rx}
            ry={ORBIT.ry}
            fill="none"
            stroke="#A5B4FC"
            strokeWidth={1}
            strokeDasharray="3 5"
            transform={`rotate(${ORBIT.tilt} ${LOGO.planet.cx} ${orbitCenterY})`}
          />
        </g>

        {LETTERS.map((letter, i) => letterGroup("back", letter, i))}

        <g ref={logoRef} transform={logoTransform(initial)}>
          <OrbitLogoMark gradientId={gradientId} />
        </g>

        {LETTERS.map((letter, i) => letterGroup("front", letter, i))}
      </g>

      {/* Invisible until the end: measured for the letters' final slots, then shown as the finished word. */}
      <text
        ref={wordRef}
        className={WORD_TEXT_CLASS}
        x={LOGO.text.x}
        y={LOGO.text.baseline}
        fontSize={LOGO.text.fontSize}
        letterSpacing={LOGO.text.letterSpacing}
        opacity={0}
      >
        {LOGO.text.word}
      </text>
    </svg>
  );
}
