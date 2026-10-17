"use client";

import { useMemo, useState } from "react";
import { Check, ChevronUp, EyeOff, Megaphone, ShieldQuestion } from "lucide-react";
import { useLive } from "./LiveProvider";
import { IconBtn, SignInPrompt } from "./ChatPanel";
import { Badge } from "@/components/ui/primitives";
import type { QuestionDTO } from "@/lib/types";

type Sort = "top" | "new" | "answered";

export function QAPanel() {
  const { state, run, patchMe, houseColor } = useLive();
  const [sort, setSort] = useState<Sort>("top");
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const voted = new Set(state.me?.questionVotes ?? []);
  const spotlight = state.event.spotlightQuestionId;

  const pending = state.questions.filter((q) => q.status === "pending");
  const list = useMemo(() => {
    const qs = state.questions.filter((q) => (sort === "answered" ? q.status === "answered" : q.status === "live"));
    return qs.sort((a, b) => (sort === "new" ? b.createdAt - a.createdAt : b.votes - a.votes || a.createdAt - b.createdAt));
  }, [state.questions, sort]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const q = await run<QuestionDTO>("qa.ask", { body, anonymous: anon });
    setBusy(false);
    if (q) setBody("");
  }

  async function vote(q: QuestionDTO) {
    const had = voted.has(q.id);
    patchMe((me) => ({ ...me, questionVotes: had ? me.questionVotes.filter((x) => x !== q.id) : [...me.questionVotes, q.id] }));
    const r = await run<{ voted: boolean }>("qa.vote", { questionId: q.id });
    if (!r) patchMe((me) => ({ ...me, questionVotes: had ? [...me.questionVotes, q.id] : me.questionVotes.filter((x) => x !== q.id) }));
  }

  const Row = ({ q }: { q: QuestionDTO }) => (
    <li className={`flex gap-3 rounded-xl border p-3 transition ${spotlight === q.id ? "border-spot-500/50 bg-spot-500/8" : "border-white/6 bg-white/2"}`}>
      <button
        onClick={() => vote(q)}
        disabled={!state.me || q.status !== "live"}
        aria-pressed={voted.has(q.id)}
        aria-label={`Upvote. ${q.votes} votes`}
        className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border py-1 transition ${voted.has(q.id) ? "border-spot-500/50 bg-spot-500/15 text-spot-300" : "border-white/10 text-ink-300 hover:border-white/25 hover:text-white"} disabled:cursor-default`}
      >
        <ChevronUp size={16} />
        <span className="timecode text-sm font-semibold">{q.votes}</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-ink-100">{q.body}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
          {q.author ? <span style={{ color: houseColor(q.author.houseId) }}>{q.author.name}</span> : <span>Anonymous</span>}
          {q.anonymous && state.canManage && <Badge tone="muted">anon</Badge>}
          {spotlight === q.id && <Badge tone="spot">On stage</Badge>}
          {q.status === "pending" && <Badge tone="muted">Awaiting approval</Badge>}
        </p>
      </div>
      {state.canManage && (
        <div className="flex shrink-0 flex-col gap-1">
          {q.status === "pending" ? (
            <IconBtn label="Approve" onClick={() => run("qa.status", { questionId: q.id, status: "live" })}>
              <Check size={14} />
            </IconBtn>
          ) : (
            <IconBtn label={spotlight === q.id ? "Remove from stage" : "Put on stage"} active={spotlight === q.id} onClick={() => run("qa.spotlight", { questionId: spotlight === q.id ? null : q.id })}>
              <Megaphone size={14} />
            </IconBtn>
          )}
          {q.status === "live" && (
            <IconBtn label="Mark answered" onClick={() => run("qa.status", { questionId: q.id, status: "answered" })}>
              <Check size={14} />
            </IconBtn>
          )}
          <IconBtn label="Hide" onClick={() => run("qa.status", { questionId: q.id, status: "hidden" })}>
            <EyeOff size={14} />
          </IconBtn>
        </div>
      )}
    </li>
  );

  const mine = pending.filter((q) => q.author?.id === state.me?.userId && !state.canManage);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {state.event.status !== "ended" && (
        <form onSubmit={ask} className="border-b border-white/6 p-3">
          {state.me ? (
            <>
              <label htmlFor="qa-input" className="sr-only">
                Your question
              </label>
              <textarea
                id="qa-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Ask the speaker something…"
                className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none placeholder:text-ink-500 focus:border-spot-500/50"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                {state.event.settings.allowAnonymousQa ? (
                  <label className="flex items-center gap-2 text-xs text-ink-300">
                    <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-spot-500" /> Ask anonymously
                  </label>
                ) : (
                  <span />
                )}
                <button disabled={busy || body.trim().length < 8} className="rounded-full bg-spot-500 px-4 py-1.5 text-sm font-medium text-ink-950 disabled:opacity-40">
                  Ask
                </button>
              </div>
              {state.event.settings.qaModeration && <p className="mt-2 text-[0.7rem] text-ink-500">Questions are reviewed before they appear.</p>}
            </>
          ) : (
            <SignInPrompt what="ask and upvote questions" />
          )}
        </form>
      )}
      <div className="flex gap-1 px-3 pt-3" role="tablist" aria-label="Sort questions">
        {(["top", "new", "answered"] as Sort[]).map((s) => (
          <button key={s} role="tab" aria-selected={sort === s} onClick={() => setSort(s)} className={`rounded-full px-3 py-1 text-xs capitalize ${sort === s ? "bg-white/10 text-white" : "text-ink-400 hover:text-white"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3">
        {state.canManage && pending.length > 0 && (
          <section className="mb-4">
            <p className="eyebrow mb-2 flex items-center gap-1.5 text-spot-300">
              <ShieldQuestion size={12} /> Moderation queue · {pending.length}
            </p>
            <ul className="space-y-2">
              {pending.map((q) => (
                <Row key={q.id} q={q} />
              ))}
            </ul>
          </section>
        )}
        {mine.length > 0 && (
          <ul className="mb-3 space-y-2">
            {mine.map((q) => (
              <Row key={q.id} q={q} />
            ))}
          </ul>
        )}
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">{sort === "answered" ? "Nothing answered yet." : "No questions yet. Ask the first one!"}</p>
        ) : (
          <ul className="space-y-2">
            {list.map((q) => (
              <Row key={q.id} q={q} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
