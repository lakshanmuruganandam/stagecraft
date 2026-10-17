import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/primitives";

/** Friendly full-page message for people who can't see an admin page. */
export function Gate({ kind, next = "/admin" }: { kind: "signin" | "forbidden" | "notfound"; next?: string }) {
  const copy = {
    signin: { title: "Sign in to open the control room", body: "Organizers and house admins run events from here." },
    forbidden: { title: "This area is for organizers", body: "Ask your house secretary or WebOps team for organizer access. Meanwhile, the live events are waiting for you." },
    notfound: { title: "Event not found", body: "It may have been removed, or the link is wrong." },
  }[kind];
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-24 text-center">
      <ShieldAlert className="text-spot-400" size={36} />
      <h1 className="mt-4 font-display text-2xl font-semibold text-white">{copy.title}</h1>
      <p className="mt-2 text-ink-300">{copy.body}</p>
      <div className="mt-6 flex gap-3">
        {kind === "signin" ? (
          <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass("primary")}>
            Sign in
          </Link>
        ) : (
          <Link href="/" className={buttonClass("primary")}>
            Browse events
          </Link>
        )}
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6">
      <div className="h-10 w-1/3 animate-pulse rounded-xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/4" />
    </div>
  );
}
