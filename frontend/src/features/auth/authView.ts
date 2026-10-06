/** The two windows the sign-in landing page can open. */
export type AuthView = "login" | "register";

/** Reads the `?open=` value of a link (e.g. "back to login" from the forgot-password page); anything else means "no window". */
export function parseAuthView(value: string | string[] | undefined): AuthView | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "login" || first === "register" ? first : null;
}

/**
 * How far the logo has to move vertically so its middle sits at the middle of the window. The landing page
 * starts the intro there and then lets the logo glide up to its place in the layout.
 */
export function centerOffset(element: { top: number; height: number }, viewportHeight: number): number {
  return viewportHeight / 2 - (element.top + element.height / 2);
}
