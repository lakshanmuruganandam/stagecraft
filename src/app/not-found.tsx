import Link from "next/link";
import { buttonClass } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-28 text-center">
      <p className="timecode text-sm text-spot-400">404 · dark stage</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white">Nothing on this stage</h1>
      <p className="mt-3 text-ink-300">The page you&apos;re after has left the building, or never had a show here.</p>
      <Link href="/" className={`${buttonClass("primary", "lg")} mt-8`}>
        Back to events
      </Link>
    </div>
  );
}
