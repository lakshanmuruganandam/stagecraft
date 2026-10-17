import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { certificateById } from "@/server/queries";
import { verifySigned } from "@/lib/certs";
import { buttonClass } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Certificate verification" };

export default function VerifyIdPage({ params }: PageProps<"/verify/[id]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/5" />}>
        <Result params={params} />
      </Suspense>
    </div>
  );
}

async function Result({ params }: { params: PageProps<"/verify/[id]">["params"] }) {
  const { id } = await params;
  const c = await certificateById(decodeURIComponent(id));
  if (!c) {
    return (
      <Panel tone="bad" icon={<ShieldX size={28} />} title="No certificate with this ID" subtitle={`We have no record of “${decodeURIComponent(id)}”. Check for typos. IDs look like SC-ABCDE-FGHJK.`} />
    );
  }
  const signed = { payload: JSON.parse(c.payload), signature: c.signature };
  const valid = verifySigned(signed);
  const status = c.revokedAt ? "revoked" : valid ? "valid" : "invalid";
  const rows = [
    ["Recipient", c.recipientName + (c.houseName ? ` · ${c.houseName}` : "")],
    ["Achievement", c.achievement],
    ["Event", c.eventTitle],
    ["Issued", new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(c.issuedAt) + " IST"],
    ["Certificate ID", c.id],
    ["Signing key", signed.payload.issuer.keyId],
    ["Signature", signed.signature.slice(0, 22) + "…"],
  ];
  return (
    <>
      <Panel
        tone={status === "valid" ? "ok" : "bad"}
        icon={status === "valid" ? <BadgeCheck size={28} /> : status === "revoked" ? <ShieldAlert size={28} /> : <ShieldX size={28} />}
        title={status === "valid" ? "Authentic certificate" : status === "revoked" ? "This certificate was revoked" : "Signature mismatch"}
        subtitle={status === "valid" ? "The Ed25519 signature matches our public key and the certificate has not been revoked." : status === "revoked" ? c.revokeReason ?? "Revoked by the organizers." : "The stored record does not match its signature. Treat it as invalid."}
      />
      <dl className="card mt-6 divide-y divide-white/6">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 px-5 py-3 text-sm">
            <dt className="text-ink-400">{k}</dt>
            <dd className={`text-ink-100 ${k === "Certificate ID" || k.startsWith("Sig") ? "timecode" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/c/${c.id}`} className={buttonClass("primary", "md")}>
          View certificate
        </Link>
        <a href={`/api/certificates/${c.id}`} className={buttonClass("outline", "md")}>
          Machine-readable JSON
        </a>
      </div>
    </>
  );
}

function Panel({ tone, icon, title, subtitle }: { tone: "ok" | "bad"; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className={`flex gap-4 rounded-2xl border p-6 ${tone === "ok" ? "border-ok/30 bg-ok/8 text-ok" : "border-onair/40 bg-onair/8 text-[#ff8a8a]"}`}>
      {icon}
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-ink-300">{subtitle}</p>
      </div>
    </div>
  );
}
