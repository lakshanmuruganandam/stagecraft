"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Award, MessagesSquare, Radio, Swords, Trophy } from "lucide-react";

const SCENES = [
  { icon: MessagesSquare, eyebrow: "Guest session", line: "Your question just hit 31 upvotes.", chip: "▲ 31 · on stage now", color: "#16a34a", img: "/covers/talk.webp" },
  { icon: Swords, eyebrow: "Esports arena", line: "You called the upset. Sentinels win 2–1.", chip: "🔮 prediction correct", color: "#dc2626", img: "/covers/esports.webp" },
  { icon: Trophy, eyebrow: "Talent hunt", line: "Results revealed. Your house took gold.", chip: "+50 points · Saranda", color: "#ca8a04", img: "/covers/cultural.webp" },
  { icon: Award, eyebrow: "The moment it ends", line: "Your signed certificate is ready.", chip: "Ed25519 verified ✓", color: "#4f46e5", img: "/covers/hackathon.webp" },
];

/** Left half of the sign-in page: the show you're about to walk into. */
export function Showcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SCENES.length), 3400);
    return () => clearInterval(t);
  }, []);
  const s = SCENES[i];
  return (
    <div className="relative hidden overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-br from-ink-850 to-ink-800 p-10 lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden className="absolute -left-20 top-0 h-full w-[140%] origin-top animate-[sway_12s_ease-in-out_infinite] bg-[conic-gradient(from_180deg_at_40%_0%,transparent_150deg,rgb(255_170_60/0.28)_180deg,transparent_210deg)] motion-reduce:animate-none" />
      <div aria-hidden className="absolute -bottom-24 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-[50%] blur-3xl transition-colors duration-1000" style={{ background: `${s.color}33` }} />

      <p className="relative inline-flex w-fit items-center gap-2 rounded-full border border-onair/30 bg-onair/10 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onair">
        <Radio size={12} /> Tonight on StageCraft
      </p>

      {/* Cross-fading stage photography with rising reactions */}
      <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-3xl shadow-[0_30px_70px_-30px_rgb(60_35_5/0.55)] ring-1 ring-white/10">
        {SCENES.map((x, k) => (
          <Image key={x.img} src={x.img} alt="" fill sizes="(min-width: 1024px) 40vw, 0px" className={`object-cover transition-[opacity,transform] duration-[1400ms] ease-out ${k === i ? "scale-100 opacity-100" : "scale-110 opacity-0"}`} priority={k === 0} />
        ))}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div aria-hidden className="absolute bottom-3 right-8 h-full w-16">
          {["👏", "🔥", "💚", "🎉", "🤯"].map((e, k) => (
            <span key={k} className="absolute bottom-0 left-1/2 animate-[floatloop_4.8s_ease-out_infinite] text-2xl opacity-0 motion-reduce:hidden" style={{ animationDelay: `${k * 0.9}s`, ["--drift" as string]: `${(k % 2 ? 1 : -1) * 14}px` }}>
              {e}
            </span>
          ))}
        </div>
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-paper backdrop-blur">
          <span className="size-1.5 animate-tally rounded-full bg-onair" /> Live
        </span>
      </div>

      <div className="relative" aria-live="polite">
        <div key={i} className="animate-[castin_.7s_cubic-bezier(.2,.8,.2,1)_both]">
          <p className="eyebrow flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg text-paper" style={{ background: s.color }}>
              <s.icon size={14} />
            </span>
            {s.eyebrow}
          </p>
          <p className="mt-2 max-w-md font-display text-3xl font-semibold leading-[1.08] tracking-tight text-white">{s.line}</p>
          <p className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-ink-850/80 px-4 py-2 text-sm font-medium text-ink-100 shadow-sm">{s.chip}</p>
        </div>
      </div>

      <div className="relative flex items-center gap-2" role="tablist" aria-label="Highlights">
        {SCENES.map((x, k) => (
          <button key={x.eyebrow} role="tab" aria-selected={k === i} aria-label={x.eyebrow} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all duration-500 ${k === i ? "w-10 bg-spot-500" : "w-4 bg-white/15 hover:bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
}
