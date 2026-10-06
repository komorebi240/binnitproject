import type { CSSProperties } from "react";
import { HALO_RINGS, HALO_TILT, satelliteSlots } from "@/features/auth/orbitHalo";
import { ORBIT_ICONS } from "./icons";

const SLOTS = satelliteSlots();
/** The rings are drawn in a square of this many units (the outermost ring plus the room for its logos). */
const EXTENT = HALO_RINGS[HALO_RINGS.length - 1]!.rx + 40;

/** CSS custom properties are not part of CSSProperties; this is the one place that sets them. */
function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/**
 * Tilted rings with a department icon riding each of them - the same picture as behind the sign-in page, drawn with
 * pure CSS (no script at all): the rings are an SVG, and every icon is two nested elements whose transforms cancel
 * each other's distortion, so it travels an ellipse yet stays round and upright. Only `transform` animates, so the
 * browser runs it on the compositor, off the main thread. Sizes use container units, so the scene scales with its box.
 * Purely decorative: hidden from assistive tech and from the pointer, and still under reduced motion.
 */
export function OrbitScene() {
  return (
    <div aria-hidden className="orbit-scene" style={vars({ "--plane": `${HALO_TILT}deg` })}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}>
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

      {SLOTS.map((slot, index) => {
        const ring = HALO_RINGS[slot.ring]!;
        const Icon = ORBIT_ICONS[index % ORBIT_ICONS.length]!;
        const squash = ring.ry / ring.rx;
        return (
          <div key={index} className="orbit-plane" style={vars({ "--squash": String(squash) })}>
            <div
              className="orbit-spin"
              style={vars({ "--period": `${ring.period}s`, "--phi": `${slot.start}rad` })}
            >
              <span
                className="orbit-chip glass-card text-primary-text"
                style={vars({
                  "--r": `${(ring.rx / (EXTENT * 2)) * 100}cqw`,
                  "--unsquash": String(1 / squash),
                })}
              >
                <Icon size={22} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
