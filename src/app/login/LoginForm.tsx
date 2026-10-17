"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import type { HouseDTO } from "@/lib/types";

export function LoginForm({ houses, next, demo }: { houses: HouseDTO[]; next: string; demo: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name">
        <input name="name" required autoComplete="name" className={inputClass} placeholder="Ananya Iyer" />
      </Field>
      <Field label="Student email" hint={demo ? "Demo mode accepts any email. In production only IITM student emails are allowed." : "Use your @ds.study.iitm.ac.in or @es.study.iitm.ac.in email."}>
        <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="23f1000000@ds.study.iitm.ac.in" />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-medium text-ink-200">Your house</legend>
        <div className="grid grid-cols-3 gap-2">
          {houses.map((h) => (
            <label key={h.id} className="relative cursor-pointer">
              <input type="radio" name="houseId" value={h.id} required className="peer sr-only" />
              <span className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2 text-xs text-ink-200 transition peer-checked:border-spot-500/60 peer-checked:bg-spot-500/10 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-spot-400 hover:border-white/25">
                <span className="size-2 shrink-0 rounded-full" style={{ background: h.color }} />
                {h.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && (
        <p role="alert" className="rounded-xl border border-onair/30 bg-onair/10 px-3 py-2 text-sm text-[#ffc2c2]">
          {state.error}
        </p>
      )}
      <Button size="lg" disabled={pending} className="mt-1">
        {pending ? "Signing in…" : "Enter the venue"}
      </Button>
    </form>
  );
}
