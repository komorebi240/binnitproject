interface OrbitWordmarkProps {
  width: number;
  height: number;
  className?: string;
}

/**
 * Orbit logo + wordmark. Two static SVGs (dark text for light surfaces, light text for the dark
 * theme); globals.css shows exactly one based on `data-theme`, so there's no flash of the wrong
 * variant on load.
 */
export function OrbitWordmark({ width, height, className = "" }: OrbitWordmarkProps) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no benefit from next/image's resize pipeline */}
      <img src="/orbit-wordmark.svg" alt="Orbit" width={width} height={height} className={`wordmark-light ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no benefit from next/image's resize pipeline */}
      <img src="/orbit-wordmark-dark.svg" alt="Orbit" width={width} height={height} className={`wordmark-dark ${className}`} />
    </>
  );
}
