import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, FileJson, ImageDown, Share2, ShieldAlert } from "lucide-react";
import { certificateById } from "@/server/queries";
import { verifySigned } from "@/lib/certs";
import { siteUrl } from "@/lib/env";
import { qrDataUrl } from "@/lib/qr";
import { Certificate } from "@/components/certs/Certificate";
import { buttonClass } from "@/components/ui/primitives";
import { PrintButton } from "./PrintButton";

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await certificateById(id);
  if (!c) return { title: "Certificate not found" };
  return {
    title: `${c.recipientName} · ${c.achievement}`,
    description: `Verifiable certificate from ${c.eventTitle}, issued on StageCraft.`,
    openGraph: { images: [`/api/certificates/${c.id}/image`] },
  };
}

export default function CertificatePage({ params }: PageProps<"/c/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto my-10 aspect-[1.414] max-w-5xl animate-pulse rounded-xl bg-white/5" />}>
      <CertificateLoader params={params} />
    </Suspense>
  );
}

async function CertificateLoader({ params }: { params: PageProps<"/c/[id]">["params"] }) {
  const { id } = await params;
  const c = await certificateById(id);
  if (!c) notFound();
  const signed = { payload: JSON.parse(c.payload), signature: c.signature };
  const valid = verifySigned(signed);
  const verifyUrl = `${siteUrl()}/verify/${c.id}`;
  const qr = await qrDataUrl(verifyUrl);
  const issued = new Date(c.issuedAt);
  const linkedIn = new URL("https://www.linkedin.com/profile/add");
  linkedIn.search = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: c.achievement,
    organizationName: "IIT Madras BS Degree — Student Houses",
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: `${siteUrl()}/c/${c.id}`,
    certId: c.id,
  }).toString();
  const json = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(signed, null, 2))}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${c.revokedAt ? "bg-onair/12 text-[#ffb3b3] ring-1 ring-onair/40" : valid ? "bg-ok/10 text-ok ring-1 ring-ok/30" : "bg-onair/12 text-[#ffb3b3]"}`}>
          {c.revokedAt ? <ShieldAlert size={16} /> : <BadgeCheck size={16} />}
          {c.revokedAt ? `Revoked${c.revokeReason ? `: ${c.revokeReason}` : ""}` : valid ? "Authentic. Signature verified and not revoked." : "Signature check failed"}
          <Link href={`/verify/${c.id}`} className="underline underline-offset-4 opacity-80 hover:opacity-100">
            details
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/certificates/${c.id}/image`} download={`${c.id}.png`} className={buttonClass("outline", "sm")}>
            <ImageDown size={14} /> PNG
          </a>
          <PrintButton />
          <a href={json} download={`${c.id}.json`} className={buttonClass("outline", "sm")}>
            <FileJson size={14} /> Signed JSON
          </a>
          {!c.revokedAt && (
            <a href={linkedIn.toString()} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
              <Share2 size={14} /> Add to LinkedIn
            </a>
          )}
        </div>
      </div>
      <Certificate
        qr={qr}
        c={{ id: c.id, recipientName: c.recipientName, houseName: c.houseName, kind: c.kind, achievement: c.achievement, eventTitle: c.eventTitle, issuedAt: c.issuedAt, revokedAt: c.revokedAt, keyId: signed.payload.issuer.keyId }}
      />
      <p className="mt-6 text-center text-xs text-ink-400 print:hidden">
        Issued for <Link href={`/e/${c.eventSlug}`} className="text-ink-200 underline-offset-4 hover:underline">{c.eventTitle}</Link> · signing key <span className="timecode">{signed.payload.issuer.keyId}</span> · anyone can verify this offline against <a className="underline-offset-4 hover:underline" href="/.well-known/stagecraft-issuer.json">our public key</a>.
      </p>
    </div>
  );
}
