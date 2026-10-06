/**
 * Whether the logo intro has already played in this page load. A module variable, not storage: a fresh visit or reload
 * ("just arrived on the site") plays it, but coming back to the sign-in page by in-app navigation (e.g. after signing
 * out) does not make people sit through it again. The marketing page's call to action resets it on purpose, because
 * that button promises exactly this moment: the logo circling its planet.
 *
 * Kept in a module of its own so the marketing page can reach it without loading the landing page's animation code.
 */
let shownThisPageLoad = false;

export function hasIntroPlayed(): boolean {
  return shownThisPageLoad;
}

export function markIntroPlayed(): void {
  shownThisPageLoad = true;
}

/** The next visit to the sign-in page plays the intro again. */
export function replayIntro(): void {
  shownThisPageLoad = false;
}
