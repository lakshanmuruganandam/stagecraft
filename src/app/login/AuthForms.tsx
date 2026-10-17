"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { signIn, signUp, type FormState } from "@/app/actions/auth";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import type { HouseDTO } from "@/lib/types";

type Demo = { password: string; accounts: Record<string, string> } | null;

export function AuthForms({ houses, next, initialMode, demo }: { houses: HouseDTO[]; next: string; initialMode: "signin" | "signup"; demo: Demo }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-full bg-white/5 p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-full py-2 transition ${mode === m ? "bg-white/10 text-white" : "text-ink-400 hover:text-white"}`}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      {mode === "signin" ? <SignInForm next={next} demo={demo} /> : <SignUpForm next={next} houses={houses} demo={!!demo} />}
    </div>
  );
}

function PasswordInput({ name, autoComplete, defaultValue }: { name: string; autoComplete: string; defaultValue?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} defaultValue={defaultValue} className={`${inputClass} pr-10`} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-400 hover:text-white">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function ErrorNote({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-onair/30 bg-onair/10 px-3 py-2 text-sm text-[#ffc2c2]">
      {state.error}
    </p>
  );
}

function SignInForm({ next, demo }: { next: string; demo: Demo }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  const [email, setEmail] = useState(state?.fields?.email ?? "");
  const [pw, setPw] = useState("");
  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
        <input name="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="23f1000000@ds.study.iitm.ac.in" />
      </Field>
      <Field label="Password" hint="Forgot it? Ask your house admin for a one-time reset.">
        <div className="relative">
          <input name="password" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
        </div>
      </Field>
      <ErrorNote state={state} />
      <Button size="lg" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
      {demo && (
        <div className="rounded-2xl border border-spot-500/25 bg-spot-500/6 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-spot-300">
            <KeyRound size={14} /> Demo accounts (password <span className="timecode">{demo.password}</span>)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(demo.accounts).map(([role, addr]) => (
              <button
                key={addr}
                type="button"
                onClick={() => {
                  setEmail(addr);
                  setPw(demo.password);
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-left text-xs transition hover:border-white/25"
              >
                <span className="block font-medium capitalize text-white">{role}</span>
                <span className="block truncate text-ink-400">{addr}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function SignUpForm({ next, houses, demo }: { next: string; houses: HouseDTO[]; demo: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name">
        <input name="name" required autoComplete="name" defaultValue={f.name} className={inputClass} placeholder="Ananya Iyer" />
      </Field>
      <Field label="Student email" hint={demo ? "Demo mode accepts any email. In production only IITM student emails can sign up." : "Use your @ds.study.iitm.ac.in or @es.study.iitm.ac.in email."}>
        <input name="email" type="email" required autoComplete="email" defaultValue={f.email} className={inputClass} placeholder="23f1000000@ds.study.iitm.ac.in" />
      </Field>
      <Field label="Password" hint="At least 10 characters. A short sentence works well.">
        <PasswordInput name="password" autoComplete="new-password" />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-medium text-ink-200">Your house</legend>
        <div className="grid grid-cols-3 gap-2">
          {houses.map((h) => (
            <label key={h.id} className="relative cursor-pointer">
              <input type="radio" name="houseId" value={h.id} required defaultChecked={f.houseId === h.id} className="peer sr-only" />
              <span className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2 text-xs text-ink-200 transition hover:border-white/25 peer-checked:border-spot-500/60 peer-checked:bg-spot-500/10 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-spot-400">
                <span className="size-2 shrink-0 rounded-full" style={{ background: h.color }} />
                {h.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorNote state={state} />
      <Button size="lg" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
