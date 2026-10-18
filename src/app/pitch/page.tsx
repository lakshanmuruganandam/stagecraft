import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Deck } from "@/components/pitch/Deck";
import { buildSlides } from "@/components/pitch/slides";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Jury deck",
    description:
      "StageCraft for the Build-a-Thon 1.0 jury: problem, product, technical architecture, real-world utility, UI/UX, admin workflows, quality proof and demo videos.",
  };
}

const mediaDir = path.join(process.cwd(), "public", "media");
const has = (file: string) => existsSync(path.join(mediaDir, file));

export default function PitchPage() {
  const slides = buildSlides({
    launch: has("StageCraft-Launch.mp4"),
    technical: has("StageCraft-Technical-Pitch.mp4"),
    launchPoster: has("launch-poster.jpg"),
    technicalPoster: has("technical-poster.jpg"),
  });
  return <Deck slides={slides} />;
}
