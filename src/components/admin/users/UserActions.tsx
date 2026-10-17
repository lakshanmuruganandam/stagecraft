"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, LogOut, ShieldBan, ShieldCheck, X } from "lucide-react";
import { manageUser, type UserActionState } from "@/app/admin/users/actions";
import { Button, inputClass } from "@/components/ui/primitives";
import type { HouseDTO, Role } from "@/lib/types";
import { ConfirmButton } from "../ConfirmButton";

type Target = { id: string; email: string; role: Role; houseId: string | null; suspendedAt: number | null };

/**
 * Governance controls for one user. All forms post to the single
 * `manageUser` server action; guardrails are enforced there, the UI only
 * mirrors them to avoid dead-end clicks.
 */
export function UserActions({ user, houses, isSelf, layout = "stack" }: { user: Target; houses: HouseDTO[]; isSelf: boolean; layout?: "stack" | "grid" }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(manageUser, undefined);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const hidden = (op: string) => (
    <>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="userId" value={user.id} />
    </>
  );

  return (
    <div className="space-y-3">
      <Feedback state={state} />
      <div className={layout === "grid" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        <form action={action} className="flex items-end gap-2">
          {hidden("role")}
          <label className="grid flex-1 gap-1 text-xs text-ink-400">
            Role
            <select name="role" defaultValue={user.role} disabled={isSelf || pending} className={`${inputClass} h-9`} key={`r-${user.role}`}>
              <option value="member">Member</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button size="sm" variant="subtle" className="h-9" disabled={isSelf || pending} title={isSelf ? "You can't change your own role" : undefined}>
            Apply
          </Button>
        </form>
        <form action={action} className="flex items-end gap-2">
          {hidden("house")}
          <label className="grid flex-1 gap-1 text-xs text-ink-400">
            House
            <select name="houseId" defaultValue={user.houseId ?? ""} disabled={pending} className={`${inputClass} h-9`} key={`h-${user.houseId}`}>
              <option value="">No house</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="subtle" className="h-9" disabled={pending}>
            Apply
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {user.suspendedAt ? (
          <form action={action}>
            {hidden("reinstate")}
            <Button size="sm" variant="outline" disabled={pending}>
              <ShieldCheck size={14} /> Reinstate
            </Button>
          </form>
        ) : (
          !isSelf && (
            <Button size="sm" variant="outline" onClick={() => setSuspendOpen((o) => !o)} aria-expanded={suspendOpen}>
              <ShieldBan size={14} /> Suspend…
            </Button>
          )
        )}
        <form action={action}>
          {hidden("signout")}
          <ConfirmButton type="submit" size="sm" variant="outline" confirmLabel={isSelf ? "Sign out other devices?" : "Sign out everywhere?"} disabled={pending}>
            <LogOut size={14} /> {isSelf ? "Sign out other devices" : "Sign out all sessions"}
          </ConfirmButton>
        </form>
        {!isSelf && (
          <form action={action}>
            {hidden("reset")}
            <ConfirmButton type="submit" size="sm" variant="outline" confirmLabel="Reset password?" disabled={pending}>
              <KeyRound size={14} /> Reset password
            </ConfirmButton>
          </form>
        )}
      </div>

      {suspendOpen && !user.suspendedAt && (
        <form action={action} onSubmit={() => setSuspendOpen(false)} className="space-y-2 rounded-xl border border-onair/30 bg-onair/5 p-3">
          {hidden("suspend")}
          <label htmlFor={`reason-${user.id}`} className="text-xs text-ink-300">
            Reason (recorded in the audit log)
          </label>
          <input id={`reason-${user.id}`} name="reason" required minLength={5} maxLength={300} placeholder="e.g. Repeated harassment in chat" className={`${inputClass} h-9`} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" disabled={pending}>
              Suspend & sign out
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Feedback({ state }: { state: UserActionState }) {
  const [dismissed, setDismissed] = useState(0);
  const [copied, setCopied] = useState(false);
  if (!state || state.n === dismissed) return null;
  if (state.tempPassword) {
    return (
      <div role="alert" className="rounded-xl border border-spot-500/40 bg-spot-500/10 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="text-spot-300">
            Temporary password for <strong>{state.forEmail}</strong>. It is shown <strong>only once</strong>, so share it privately.
          </p>
          <button aria-label="Dismiss" onClick={() => setDismissed(state.n ?? 0)} className="text-ink-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <code className="timecode flex-1 select-all rounded-lg bg-ink-950 px-3 py-2 text-base text-white">{state.tempPassword}</code>
          <Button
            size="sm"
            variant="subtle"
            onClick={async () => {
              await navigator.clipboard.writeText(state.tempPassword!);
              setCopied(true);
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p role={state.error ? "alert" : "status"} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${state.error ? "bg-onair/10 text-[#ffb3b3]" : "bg-ok/10 text-[#b9f3da]"}`}>
      {state.error ?? state.ok}
      <button aria-label="Dismiss" onClick={() => setDismissed(state.n ?? 0)} className="opacity-70 hover:opacity-100">
        <X size={12} />
      </button>
    </p>
  );
}

/** Per-session revoke used on the user detail page. */
export function RevokeSession({ userId, sessionId, current }: { userId: string; sessionId: string; current: boolean }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(manageUser, undefined);
  if (current) return <span className="text-xs text-ok">This device</span>;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="op" value="session" />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      {state?.error && <span className="text-xs text-[#ff8a8a]">{state.error}</span>}
      <Button size="sm" variant="ghost" className="h-7" disabled={pending}>
        Revoke
      </Button>
    </form>
  );
}
