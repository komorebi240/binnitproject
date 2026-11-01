"use client";
import { useState } from "react";
import { ArrowUpRight, TreeStructure } from "@phosphor-icons/react";
import type { MarketingCopy } from "./copy.types";

export function RolesMap({roles}:{roles:MarketingCopy["roles"]}) {
  const [selected,setSelected]=useState(0);
  const role=roles.items[selected]!;
  return <div className="mk-role-map">
    <div className="mk-role-selector"><p className="text-sm text-fg-muted mb-6">{roles.explore}</p>
      <div className="mk-role-spine" role="group" aria-label={roles.eyebrow}>
        {roles.items.map((item,index)=><button type="button" key={item.name} aria-pressed={index===selected} onClick={()=>setSelected(index)} className="mk-role-choice"><span className="mk-role-node" aria-hidden>0{index+1}</span><span>{item.name}</span><ArrowUpRight size={18} aria-hidden/></button>)}
      </div>
    </div>
    <div className="mk-role-detail glass-window" aria-live="polite" aria-atomic="true">
      <div className="mk-role-scope-art" aria-hidden>{roles.scope.map((scope,index)=><span key={scope} className={index>=selected?'is-in-scope':''}/>)}</div>
      <TreeStructure size={28} className="text-primary-text" aria-hidden/>
      <p className="mk-role-scope">{roles.scope[selected]}</p>
      <h3>{role.name}</h3><p className="mk-role-description" key={selected}>{role.text}</p>
      <div className="mk-role-scope-key" aria-hidden>{roles.scope.map((scope,index)=><span key={scope} data-active={index>=selected}>{scope}</span>)}</div>
    </div>
  </div>;
}
