import { Flip } from "gsap/Flip";
import { gsap } from "./motion";

// Kept apart from motion.ts: only dashboard code (tab bar, animated lists) imports this, so the sign-in pages that
// share motion.ts do not carry the plugin.
gsap.registerPlugin(Flip);

export { Flip };
