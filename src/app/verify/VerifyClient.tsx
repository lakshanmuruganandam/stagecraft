"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, FileUp, ShieldX } from "lucide-react";
import { Button, inputClass } from "@/components/ui/primitives";
import { verifyWithJwk, type SignedCertificate } from "@/lib/canonical";

type Result = { ok: boolean; message: string; cert?: SignedCertificate };

export function VerifyClient() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function verifyFile(file: File) {
    setBusy(true);
    try {
      const cert = JSON.parse(await file.text()) as SignedCertificate;
      const { keys } = (await fetch("/api/issuer").then((r) => r.json())) as { keys: (JsonWebKey & { kid: string })[] };
      const key = keys.find((k) => k.kid === cert.payload?.issuer?.keyId);
      if (!key) return setResult({ ok: false, message: "This certificate was signed with a key we don't recognise." });
      const ok = await verifyWithJwk(cert, key);
      setResult(ok ? { ok, message: "Signature is valid. This file is exactly what we issued.", cert } : { ok, message: "Signature does NOT match. The file has been altered or forged." });
    } catch {
      setResult({ ok: false, message: "That doesn't look like a StageCraft certificate file." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 grid gap-6">
      <form
        className="card flex flex-col gap-3 p-5 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (id.trim()) router.push(`/verify/${encodeURIComponent(id.trim().toUpperCase())}`);
        }}
      >
        <label htmlFor="cert-id" className="sr-only">
          Certificate ID
        </label>
        <input id="cert-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="SC-XXXXX-XXXXX" className={`${inputClass} timecode h-12 flex-1 text-base uppercase`} />
        <Button size="lg">Check ID</Button>
      </form>

      <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center transition hover:border-white/20">
        <FileUp className="text-ink-400" />
        <span className="font-medium text-white">Verify a signed JSON file offline</span>
        <span className="text-sm text-ink-400">The check runs in your browser with WebCrypto. Nothing is uploaded.</span>
        <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && verifyFile(e.target.files[0])} disabled={busy} />
      </label>

      {result && (
        <div role="status" className={`flex gap-3 rounded-2xl border p-5 ${result.ok ? "border-ok/30 bg-ok/8" : "border-onair/40 bg-onair/8"}`}>
          {result.ok ? <BadgeCheck className="shrink-0 text-ok" /> : <ShieldX className="shrink-0 text-onair" />}
          <div>
            <p className="font-medium text-white">{result.message}</p>
            {result.cert && (
              <p className="mt-1 text-sm text-ink-300">
                {result.cert.payload.recipient.name}: {result.cert.payload.achievement} ({result.cert.payload.event.title}, {result.cert.payload.event.date})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
