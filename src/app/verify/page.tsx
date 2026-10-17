import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { VerifyClient } from "./VerifyClient";

export const metadata: Metadata = { title: "Verify a certificate" };

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <ShieldCheck className="text-spot-400" size={32} />
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Verify a certificate</h1>
      <p className="mt-3 max-w-xl text-ink-300">
        Every StageCraft certificate is signed with Ed25519. Enter its ID to check it against our records, or drop in the signed JSON file to verify it right here in your browser. That check needs no trust in our database.
      </p>
      <VerifyClient />
    </div>
  );
}
