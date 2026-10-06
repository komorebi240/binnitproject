/** The rings drawn around the logo on the landing page, and where a small "satellite" is on one of them. */
import { LOGO } from "@/components/brand/orbitLogoGeometry";

export interface HaloRing {
  rx: number;
  ry: number;
  /** Seconds the satellite takes to go once around this ring. */
  period: number;
  /** Dashed outer rings read as fainter, "further away" ones. */
  dashed: boolean;
}

/** Same slant as the logo's own ring (degrees, counter-clockwise). */
export const HALO_TILT = LOGO.ring.tilt;

export const HALO_RINGS: HaloRing[] = [
  { rx: 360, ry: 128, period: 46, dashed: false },
  { rx: 500, ry: 178, period: 70, dashed: true },
  { rx: 640, ry: 228, period: 96, dashed: true },
];

/** How many department logos ride each ring, innermost first: the longer outer rings carry more. */
export const HALO_RING_SLOTS = [2, 3, 4];

export interface SatelliteSlot {
  ring: number;
  /** Where on the ring (radians) the logo starts. */
  start: number;
}

/**
 * One slot per logo: the logos of a ring are spread evenly around it, and each ring is turned a different amount so
 * the logos of neighbouring rings never line up in a row.
 */
export function satelliteSlots(): SatelliteSlot[] {
  return HALO_RING_SLOTS.flatMap((count, ring) =>
    Array.from({ length: count }, (_, i) => ({ ring, start: (i / count) * Math.PI * 2 + ring * 1.1 })),
  );
}

/** A point on a tilted ellipse centred on the origin; `phase` is the angle in radians (0 = right-most point before tilting). */
export function ellipsePoint(rx: number, ry: number, tiltDegrees: number, phase: number): { x: number; y: number } {
  const tilt = (tiltDegrees * Math.PI) / 180;
  const a = rx * Math.cos(phase);
  const b = ry * Math.sin(phase);
  return { x: a * Math.cos(tilt) - b * Math.sin(tilt), y: a * Math.sin(tilt) + b * Math.cos(tilt) };
}

const HALO_CLEARANCE = 1.18; // a little air between the content and the inner ring (the tilt moves the ring about this much)
const HALO_MIN_SCALE = 0.45;
const HALO_MAX_SCALE = 1.4;

/**
 * How much to scale the rings so the innermost one encloses the content (logo and actions) instead of cutting
 * through it: the smallest ellipse of the ring's shape that contains a box of the given size, plus some clearance.
 */
export function haloScale(content: { width: number; height: number }): number {
  const inner = HALO_RINGS[0]!;
  const needed = Math.sqrt((content.width / 2 / inner.rx) ** 2 + (content.height / 2 / inner.ry) ** 2) * HALO_CLEARANCE;
  return Math.min(HALO_MAX_SCALE, Math.max(HALO_MIN_SCALE, needed));
}
