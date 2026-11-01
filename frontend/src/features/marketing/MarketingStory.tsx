"use client";
import { useEffect, type ReactNode } from "react";
import { XCircle, CheckCircle } from "@phosphor-icons/react";
import { OrbitScene } from "./OrbitScene";
import type { MarketingCopy } from "./copy.types";

export function StoryBackground() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".mk-page");
    const board = document.querySelector<HTMLElement>("[data-story-board]");
    const solutions = document.querySelector<HTMLElement>(".mk-solution-journey");
    const steps = document.querySelector<HTMLElement>(".mk-step-journey");
    const detailSections = document.querySelectorAll<HTMLElement>("#roles, #security, .mk-launch-section");
    const footer = document.querySelector("footer");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!board || !page || !solutions) return;
      // Read geometry together before changing attributes to avoid forced layout between reads.
      const height = innerHeight;
      const mobile = innerWidth < 1024;
      const b = board.getBoundingClientRect();
      const stepBox = steps?.getBoundingClientRect();
      const box = solutions.getBoundingClientRect();
      const atFooter = (footer?.getBoundingClientRect().top ?? Infinity) < height * .85;
      const inDetail = !atFooter && Array.from(detailSections).some(section => { const r = section.getBoundingClientRect(); return r.top < height * .5 && r.bottom > height * .45; });
      const travel = Math.max(1, b.height - height * .6);
      const progress = Math.max(0, Math.min(1, (height * .5 - b.top) / travel));
      const inSteps = stepBox && stepBox.top < height * .5 && stepBox.bottom > height * .55;
      const inDemo = b.top < height * .65 && b.bottom > height * .55;
      const inStory = box.top < height * .35 && box.bottom > height * .7;
      const side = (height * .35 - box.top) / Math.max(1, box.height - height * .35);
      const states = {
        orbit: b.top < height * .75 ? "soft" : "clear",
        board: reduced.matches || mobile ? "3" : String(Math.min(3, Math.floor(progress * 3) + (b.top < height * .8 ? 1 : 0))),
        backdrop: mobile ? "quiet" : inSteps ? "steps" : inDemo ? "demo" : inDetail ? "detail" : "clear",
        solution: !reduced.matches && !mobile && inStory ? (side < .48 ? "before" : "after") : "none",
      };
      for (const [key, value] of Object.entries(states)) {
        if (page.dataset[key] !== value) page.dataset[key] = value;
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const pins = document.querySelectorAll<HTMLElement>(".mk-board-pin, .mk-solution-pin, .mk-step-pin");
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const pin = entry.target as HTMLElement;
        const value = `${entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height}px`;
        if (pin.style.getPropertyValue("--pin-height") !== value) pin.style.setProperty("--pin-height", value);
      }
    });
    pins.forEach(pin => observer.observe(pin));
    update();
    addEventListener("scroll", schedule, {passive:true}); addEventListener("resize", schedule); reduced.addEventListener("change", update);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule); reduced.removeEventListener("change", update); if(page) { delete page.dataset.board; delete page.dataset.solution; delete page.dataset.backdrop; delete page.dataset.orbit; } };
  }, []);
  return <><div className="mk-persistent-orbit" aria-hidden><OrbitScene /></div><div className="mk-solution-dim" aria-hidden /></>;

}

export function SolutionPanels({ problem, heading }: { problem: MarketingCopy["problem"]; heading: ReactNode }) {
  return <div className="mk-solution-journey"><div className="mk-solution-pin">{heading}<div className="mk-solution-cards grid gap-8 lg:grid-cols-2">
    <article className="mk-solution-panel glass-card rounded-2xl p-6 sm:p-8" data-side="before">
      <span className="mk-solution-number" aria-hidden>01</span><h3 className="mb-5 text-xl font-semibold text-fg">{problem.offTitle}</h3>
      <ul className="flex flex-col gap-4">{problem.off.map(line=><li key={line} className="flex gap-3 text-sm leading-relaxed text-fg-soft"><XCircle size={22} className="shrink-0 text-danger" aria-hidden/>{line}</li>)}</ul>
    </article>
    <article className="mk-solution-panel glass-card rounded-2xl p-6 sm:p-8" data-side="after">
      <span className="mk-solution-number" aria-hidden>02</span><h3 className="mb-5 text-xl font-semibold text-fg">{problem.inTitle}</h3>
      <ul className="flex flex-col gap-4">{problem.in.map(line=><li key={line} className="flex gap-3 text-sm leading-relaxed text-fg-soft"><CheckCircle size={22} className="shrink-0 text-success" aria-hidden/>{line}</li>)}</ul>
    </article>
  </div></div></div>;
}
