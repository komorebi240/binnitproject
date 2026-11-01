"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MarketingCopy, TitledText } from "./copy.types";
import { FEATURE_ICONS } from "./icons";

const GROUPS = [
  { vi: "Công việc & dự án", en: "Work & projects", items: [0, 1, 2, 12] },
  { vi: "Tổ chức & con người", en: "Organization & people", items: [3, 8] },
  { vi: "Lịch & thời gian", en: "Calendar & time", items: [5, 9, 10] },
  { vi: "Trao đổi & không gian làm việc", en: "Communication & workspace", items: [4, 6, 7] },
  { vi: "Tài chính", en: "Finance", items: [11] },
];

export function FeatureStacks({ copy }: { copy: MarketingCopy }) {
  const vi = copy.locale === "vi";
  return <><ul className="mk-mobile-features" aria-label={copy.features.title}>
    {copy.features.items.map((item, index) => {
      const Icon = FEATURE_ICONS[index]!;
      return <li key={item.title}><span className="mk-mobile-feature-icon"><Icon size={22} aria-hidden /></span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>;
    })}
  </ul><div className="mk-feature-stacks">
    <p className="mb-8 text-center text-sm text-fg-muted">{vi ? "Mỗi nhóm là một bộ thẻ. Bấm để lật mở từng tính năng." : "Each group is a deck. Click to turn through its features."}</p>
    <ul className="mk-paper-groups grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {GROUPS.map((group, index) => <FeatureFlashCard key={group.en} group={group} index={index} copy={copy} />)}
    </ul>
  </div></>;
}

function FeatureFlashCard({group,index,copy}:{group:(typeof GROUPS)[number];index:number;copy:MarketingCopy}) {
  const [page,setPage]=useState<number | null>(null);
  const front=useRef<HTMLButtonElement>(null);
  const close=useRef<HTMLButtonElement>(null);
  const vi=copy.locale === "vi";
  const label=vi?group.vi:group.en;
  const coverIcon=FEATURE_ICONS[group.items[0]!]!;
  const Icon=page===null?coverIcon:FEATURE_ICONS[group.items[page]!]!;
  const item=page===null?null:copy.features.items[group.items[page]!]!;
  const restore=()=>{setPage(null);requestAnimationFrame(()=>front.current?.focus({preventScroll:true}));};
  useEffect(()=>{if(page===0) close.current?.focus({preventScroll:true});},[page]);
  return <li className="mk-paper-group mk-flashcard" onKeyDown={event=>{
    if(page===null)return;
    if(event.key==="Escape"){event.preventDefault();restore();}
    if(event.key==="ArrowRight"){event.preventDefault();setPage(Math.min(group.items.length-1,page+1));}
    if(event.key==="ArrowLeft"){event.preventDefault();setPage(Math.max(0,page-1));}
  }}>
    <div className="mk-paper-back" aria-hidden /><div className="mk-paper-back second" aria-hidden />
    {page===null ? <button ref={front} type="button" className="mk-paper-cover glass-card mk-flash-face" aria-expanded={false} onClick={()=>setPage(0)}>
      <span className="mk-stack-index" aria-hidden>0{index+1} ↗</span><Icon size={30} aria-hidden /><span className="text-xl font-semibold">{label}</span><span className="text-sm text-fg-muted">{group.items.map(i=>copy.features.items[i]!.title).join(" · ")}</span><span className="mk-stack-invite">{vi?"Lật mở bộ thẻ":"Open deck"}<span aria-hidden> ↻</span></span>
    </button> : <div id={`flash-${index}`} className="mk-flash-detail glass-card" role="region" aria-label={label}>
      <div className="mk-flash-top"><span>{label}</span><button ref={close} type="button" onClick={restore} aria-label={vi?"Về mặt trước":"Back to cover"}>↶</button></div>
      <article key={page} className="mk-flash-content" aria-live="polite" aria-atomic="true"><Icon size={28} aria-hidden/><h3>{item!.title}</h3><p>{item!.text}</p></article>
      <div className="mk-flash-controls"><button type="button" disabled={page===0} onClick={()=>setPage(page-1)} aria-label={vi?"Thẻ trước":"Previous card"}>←</button><span>{page+1} / {group.items.length}</span><button type="button" disabled={page===group.items.length-1} onClick={()=>setPage(page+1)} aria-label={vi?"Thẻ tiếp":"Next card"}>→</button></div>
    </div>}
  </li>;
}

export function ScrollSteps({ steps, heading }: { steps: TitledText[]; heading: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLLIElement>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastProgress = "";
    let lastStage = -1;
    const update = () => {
      frame = 0;
      const element = root.current;
      if (!element) return;
      const staticView = reduced.matches || window.innerWidth < 1024;
      const box = staticView ? null : element.getBoundingClientRect();
      const progress = box ? Math.max(0, Math.min(1, (window.innerHeight * .25 - box.top) / (box.height - window.innerHeight * .7))) : 1;
      const value = progress.toFixed(4);
      if (value !== lastProgress) { if (fill.current) fill.current.style.transform = `scaleX(${value})`; lastProgress = value; }
      const stage = Math.min(steps.length - 1, Math.floor(progress * (steps.length - 1)));
      if (stage !== lastStage) { setCurrent(stage); lastStage = stage; }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); reduced.removeEventListener("change", update); };
  }, [steps.length]);
  return <div ref={root} className="mk-step-journey" data-current={current}>
    <div className="mk-step-pin">{heading}
    <ol className="mk-step-track">
      {steps.map((step, index) => <li key={step.title} className={`mk-step-node ${current >= index ? "is-reached" : ""}`}>
        <span className="mk-step-bubble" aria-hidden>{index + 1}</span>
        <div className="mk-step-content glass-card rounded-2xl p-6"><h3 className="text-lg font-semibold text-fg">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-fg-soft">{step.text}</p></div>
      </li>)}
      <li aria-hidden className="mk-step-fill" ref={fill} />
    </ol></div>
  </div>;
}
