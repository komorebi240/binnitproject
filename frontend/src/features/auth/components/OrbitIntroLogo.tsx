"use client";

import { useEffect, useId, useRef } from "react";
import {
  LOGO,
  logoHeightFor,
  OrbitLogoDefs,
  OrbitLogoMark,
  OrbitWord,
} from "@/components/brand/orbitLogo";
import { gsap } from "@/lib/motion";
import {
  frameAt,
  INTRO_DURATION,
  ORBIT,
  type IntroFrame,
  type LetterTarget,
} from "../introTimeline";

interface OrbitIntroLogoProps {
  /** Width in px of the finished logo; the height follows from its proportions. */
  width: number;
  /** Called once, when the letters are in place (also when the user skips the intro). */
  onComplete: () => void;
}

const SKIP_EVENTS = ["keydown", "pointerdown"] as const;

/** Where each capital of the finished word sits (its centre): the intro ends exactly there, so it lands on the real logo. */
const TARGETS: LetterTarget[] = LOGO.letters.map((letter) => ({
  x: letter.x + letter.width / 2,
  y: letter.y + letter.height / 2,
}));

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
 * The login intro: the letters of ORBIT circle the planet, then are pushed out to form the word beside it, exactly as in
 * the static logo. The motion itself is `frameAt` (introTimeline.ts); this component only applies each frame straight to
 * the SVG attributes (no React re-renders at 60 fps); a GSAP tween supplies the time. The letters are paths, so the
 * intro needs no font and starts at once.
 * Any key press or click skips to the finished logo.
 */
export function OrbitIntroLogo({ width, onComplete }: OrbitIntroLogoProps) {
  const id = `orbit-logo-${useId().replace(/:/g, "")}`;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stageRef = useRef<SVGGElement>(null);
  const logoRef = useRef<SVGGElement>(null);
  const guideRef = useRef<SVGGElement>(null);
  const wordRef = useRef<SVGGElement>(null);
  const backRefs = useRef<(SVGGElement | null)[]>([]);
  const frontRefs = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    let finished = false;
    let clockTween: gsap.core.Tween | null = null;

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
      clockTween?.kill();
      removeSkipListeners();
      apply(frameAt(INTRO_DURATION, TARGETS));
      // Hand over to the real word: same letters in the same places, now one group again.
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

    // One GSAP tween is the clock: it runs `clock.t` from 0 to the intro's length in real time (and its ticker
    // keeps the pace steady if the tab was busy), and every update draws the frame for that moment.
    const clock = { t: 0 };
    clockTween = gsap.to(clock, {
      t: INTRO_DURATION,
      duration: INTRO_DURATION,
      ease: "none",
      onUpdate: () => apply(frameAt(clock.t, TARGETS)),
      onComplete: finish,
    });

    return () => {
      finished = true;
      clockTween?.kill();
      removeSkipListeners();
    };
  }, []);

  // First frame (also what the server renders): planet in the middle, letters not yet visible.
  const initial = frameAt(0, TARGETS);
  const orbitCenterY = LOGO.planet.cy + ORBIT.centerYOffset;

  const letterGroup = (kind: "back" | "front", index: number) => {
    const letter = LOGO.letters[index]!;
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
        <path
          className="orbit-logo-word"
          transform={`translate(${-letter.width / 2} ${-letter.height / 2})`}
          d={letter.d}
        />
      </g>
    );
  };

  return (
    <svg
      role="img"
      aria-label="Orbit"
      width={width}
      height={logoHeightFor(width)}
      viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
      style={{ overflow: "visible" }}
    >
      <OrbitLogoDefs id={id} />

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
            stroke="#818CF8"
            strokeWidth={1}
            strokeDasharray="3 5"
            transform={`rotate(${ORBIT.tilt} ${LOGO.planet.cx} ${orbitCenterY})`}
          />
        </g>

        {LOGO.letters.map((_, i) => letterGroup("back", i))}

        <g ref={logoRef} transform={logoTransform(initial)}>
          <OrbitLogoMark id={id} />
        </g>

        {LOGO.letters.map((_, i) => letterGroup("front", i))}
      </g>

      {/* Invisible until the end, then shown as the finished word. */}
      <g ref={wordRef} opacity={0}>
        <OrbitWord />
      </g>
    </svg>
  );
}
