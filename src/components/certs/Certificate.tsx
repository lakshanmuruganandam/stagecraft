import type { CertKind } from "@/lib/types";

const KIND_TITLE: Record<CertKind, string> = {
  winner: "Certificate of Excellence",
  "runner-up": "Certificate of Merit",
  third: "Certificate of Merit",
  participant: "Certificate of Participation",
  speaker: "Certificate of Appreciation",
  organizer: "Certificate of Appreciation",
};

export type CertView = {
  id: string;
  recipientName: string;
  houseName: string | null;
  kind: CertKind;
  achievement: string;
  eventTitle: string;
  issuedAt: number;
  revokedAt: number | null;
  keyId: string;
};

/** Print-ready certificate. Ivory paper + foil, deliberately unlike the dark app. */
export function Certificate({ c, qr }: { c: CertView; qr: string }) {
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(c.issuedAt);
  return (
    <div className="cert relative aspect-[1.414] [container-type:inline-size] w-full overflow-hidden rounded-xl bg-[#fbf7ee] text-[#1d1a14] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] print:rounded-none print:shadow-none">
      <div className="absolute inset-[2.2%] rounded-md border border-[#c9a45c]/70" />
      <div className="absolute inset-[3.1%] rounded-sm border-[0.35cqw] border-double border-[#c9a45c]/50" />
      <div aria-hidden className="absolute -right-[12%] -top-[30%] h-[80%] w-[55%] rotate-12 bg-[radial-gradient(closest-side,rgb(255_190_92/0.28),transparent)]" />
      {c.revokedAt && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <span className="-rotate-12 rounded-lg border-4 border-red-700/80 px-8 py-2 font-display text-[5cqw] font-bold uppercase tracking-widest text-red-700/80">Revoked</span>
        </div>
      )}
      <div className="relative flex h-full flex-col items-center justify-between px-[9%] py-[7%] text-center">
        <div className="flex flex-col items-center">
          <p className="font-mono text-[1.3cqw] uppercase tracking-[0.4em] text-[#8a6d2f]">StageCraft · IITM BS Houses</p>
          <h2 className="mt-[1.5cqw] font-display text-[4.6cqw] font-semibold leading-none tracking-tight">{KIND_TITLE[c.kind]}</h2>
          <div className="mt-[1.6cqw] h-px w-[18cqw] bg-gradient-to-r from-transparent via-[#c9a45c] to-transparent" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[1.6cqw] italic text-[#5c5240]">This certifies that</p>
          <p className="mt-[1cqw] font-display text-[6.4cqw] font-semibold leading-none tracking-tight text-[#14110b]">{c.recipientName}</p>
          {c.houseName && <p className="mt-[1cqw] font-mono text-[1.25cqw] uppercase tracking-[0.3em] text-[#8a6d2f]">{c.houseName} House</p>}
          <p className="mt-[2.4cqw] max-w-[70cqw] text-[2.1cqw] leading-snug text-[#2b261c]">{c.achievement}</p>
          <p className="mt-[0.8cqw] text-[1.6cqw] text-[#5c5240]">at {c.eventTitle}</p>
        </div>
        <div className="flex w-full items-end justify-between">
          <div className="text-left">
            <p className="font-display text-[1.7cqw] font-semibold">{date}</p>
            <p className="font-mono text-[1.05cqw] uppercase tracking-[0.2em] text-[#8a6d2f]">Date of issue</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="grid size-[10cqw] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe2a3,#c9a45c_55%,#8a6d2f)] shadow-inner">
              <span className="font-display text-[1.25cqw] font-bold uppercase leading-tight tracking-wider text-[#3a2c0e]">
                Signed
                <br />
                Ed25519
              </span>
            </div>
          </div>
          <div className="flex items-end gap-[1.2cqw] text-right">
            <div>
              <p className="font-mono text-[1.5cqw] font-semibold tracking-wider">{c.id}</p>
              <p className="font-mono text-[1.05cqw] uppercase tracking-[0.2em] text-[#8a6d2f]">Scan to verify</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code to verify certificate ${c.id}`} className="size-[9cqw] rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
