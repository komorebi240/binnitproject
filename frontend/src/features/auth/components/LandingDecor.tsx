"use client";

import { useRef, type CSSProperties } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { DEPARTMENT_ICONS, DEPARTMENT_PRESETS } from "@/features/organization/departmentAppearance";
import { ellipsePoint, HALO_RINGS, HALO_TILT, satelliteSlots } from "../orbitHalo";

/**
 * Applied from the first paint until the intro's timeline reveals the element, so nothing flashes before its turn.
 * `visibility` also keeps it out of the tab order and away from screen readers meanwhile; GSAP's `autoAlpha` flips
 * both together.
 */
export const HELD_BACK: CSSProperties = { opacity: 0, visibility: "hidden" };

/** A faint dotted grid that fades out toward the edges, so the page has texture without noise. */
export function DottedBackdrop() {
  const mask = "radial-gradient(ellipse at center, black 25%, transparent 70%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage: "radial-gradient(rgb(var(--color-fg) / 0.14) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

const SLOTS = satelliteSlots();
/** The sample departments whose logos ride the rings: the icons a company picks for its own departments. */
const LOGOS = DEPARTMENT_PRESETS.slice(0, SLOTS.length);

/**
 * Tilted rings around the logo with a department logo travelling on each (like the logo's own ring, only larger and
 * quieter). Purely decorative: hidden from assistive tech, never receives the pointer, and standing still under
 * reduced motion. The landing page fades the rings in once the logo has settled, then pops the logos in: every part is
 * revealed on its own (`heldBack` hides them until then), never through an opacity on a parent - a parent that is
 * partly transparent changes what the logos' glass can see behind it, which made them flicker.
 */
export function OrbitHalo({
  scale = 1,
  heldBack = false,
  className = "",
}: {
  scale?: number;
  heldBack?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>("[data-satellite]", rootRef.current);
      const movers = tiles.map((tile, index) => {
        const { ring, start } = SLOTS[index]!;
        const { rx, ry } = HALO_RINGS[ring]!;
        const setX = gsap.quickSetter(tile, "x", "px");
        const setY = gsap.quickSetter(tile, "y", "px");
        gsap.set(tile, { xPercent: -50, yPercent: -50 }); // the tile's own centre sits on the ring
        const place = (phase: number) => {
          const point = ellipsePoint(rx, ry, HALO_TILT, phase);
          setX(point.x);
          setY(point.y);
        };
        place(start);
        return { ring, start, place };
      });
      if (prefersReducedMotion()) return;
      movers.forEach(({ ring, start, place }) => {
        const state = { phase: start };
        gsap.to(state, {
          phase: start + Math.PI * 2,
          duration: HALO_RINGS[ring]!.period,
          ease: "none",
          repeat: -1,
          onUpdate: () => place(state.phase),
        });
      });
    },
    { scope: rootRef },
  );

  const extent = HALO_RINGS[HALO_RINGS.length - 1]!.rx + 40;
  return (
    <div
      ref={rootRef}
      aria-hidden
      data-halo
      className={`pointer-events-none relative max-w-none [contain:layout_style] ${className}`}
      style={{ width: extent * 2, height: extent * 2, transform: `scale(${scale})` }}
    >
      <svg
        data-halo-rings
        style={heldBack ? HELD_BACK : undefined}
        className="absolute inset-0"
        width={extent * 2}
        height={extent * 2}
        viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
      >
        <defs>
          <radialGradient id="orbit-halo-glow">
            <stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity="0.13" />
            <stop offset="100%" stopColor="rgb(var(--color-primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r={HALO_RINGS[1]!.rx} fill="url(#orbit-halo-glow)" />
        {HALO_RINGS.map((ring, index) => (
          <ellipse
            key={index}
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            className="stroke-primary"
            strokeOpacity={ring.dashed ? 0.4 : 0.5}
            strokeWidth={1.5}
            strokeDasharray={ring.dashed ? "2 9" : undefined}
            strokeLinecap="round"
            transform={`rotate(${HALO_TILT})`}
          />
        ))}
      </svg>
      {LOGOS.map((department) => {
        const { Icon } = DEPARTMENT_ICONS[department.icon];
        return (
          <span
            key={department.nameKey}
            data-satellite
            style={heldBack ? HELD_BACK : undefined}
            className="glass-card absolute left-1/2 top-1/2 flex h-11 w-11 items-center justify-center rounded-full text-primary-text will-change-transform"
          >
            <Icon size={22} weight="regular" />
          </span>
        );
      })}
    </div>
  );
}
