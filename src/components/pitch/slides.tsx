import Image from "next/image";
import type { ReactNode } from "react";
import {
  Activity,
  Award,
  BadgeCheck,
  Boxes,
  Brackets,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Contrast,
  Database,
  FileKey2,
  Gauge as GaugeIcon,
  Keyboard,
  KeyRound,
  LayoutDashboard,
  Lock,
  Megaphone,
  MessageSquareText,
  MonitorPlay,
  Moon,
  QrCode,
  Radio,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Trophy,
  UserCog,
  Users,
  Vote,
} from "lucide-react";
import type { DeckSlide } from "./Deck";
import { Chip, Code, Gauge, QrSvg, SlideHead } from "./parts";
import { FlowSteps, PipelineDiagram, SystemDiagram } from "./diagrams";

export const LIVE_URL = "https://stagecraft-xi.vercel.app";
export const REPO_URL = "https://github.com/lakshanmuruganandam/stagecraft";

export type MediaAvailability = {
  launch: boolean;
  technical: boolean;
  launchPoster: boolean;
  technicalPoster: boolean;
};

/* Real excerpts (trimmed with …) from src/lib/live.ts and src/server/commands.ts. */
const PUBLISH_SNIPPET = `// src/lib/live.ts — the log is the source of truth
export async function publish(
  channel: Channel | Channel[], type: string, payload: unknown,
) {
  const db = await getDb();
  const list = Array.isArray(channel) ? channel : [channel];
  const body = JSON.stringify(payload);
  await db.insert(schema.changes)
    .values(list.map((c) => ({ channel: c, type, payload: body })));
  for (const c of list) bus.emit("change", c);
}`;

const COMMAND_SNIPPET = `// src/server/commands.ts — one entry per feature
react: def({
  schema: z.object({ emoji: z.enum(REACTIONS) }),
  async run(ctx, { emoji }) {
    await limit(\`react:\${ctx.viewer.id}\`, 8, 2, "Reacting");
    await publish(both(ctx.event.id), "reaction",
      { emoji, houseId: ctx.viewer.houseId });
  },
}),

export async function runCommand(
  db: DB, viewer: Viewer, eventId: string, raw: unknown,
) {
  …
  const manager = canManageEvent(viewer, event);
  if (cmd.manager && !manager) throw new HttpError(403, "Organizers only");
  const parsed = cmd.schema.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  return cmd.run({ db, viewer, event }, parsed.data);
}`;

function Shot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-xl shadow-black/10 ${className ?? ""}`}>
      <Image src={src} alt={alt} width={1440} height={900} sizes="(max-width: 640px) 100vw, 45vw" className="h-auto w-full" loading="eager" />
    </div>
  );
}

function Feature({ icon, title, children, compact }: { icon: ReactNode; title: string; children: ReactNode; compact?: boolean }) {
  return (
    <div className={`card flex gap-3 ${compact ? "p-3" : "p-4"}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-spot-500/15 text-spot-400 [&>svg]:size-[18px]" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className={`mt-0.5 leading-snug text-ink-300 ${compact ? "text-xs" : "text-sm"}`}>{children}</p>
      </div>
    </div>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">{value}</p>
      <p className="mt-2 font-semibold text-ink-200">{label}</p>
      {sub && <p className="mt-1 text-sm text-ink-400">{sub}</p>}
    </div>
  );
}

function Video({ src, poster, title, sub, available, hasPoster }: { src: string; poster: string; title: string; sub: string; available: boolean; hasPoster: boolean }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/20" data-theme="stage">
        {available ? (
          <video controls preload="none" poster={hasPoster ? poster : undefined} className="absolute inset-0 size-full bg-black object-contain" aria-label={title}>
            <source src={src} type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <MonitorPlay className="mx-auto size-10 text-spot-400" aria-hidden />
              <p className="mt-3 font-display text-lg text-white">{title}</p>
              <p className="mt-1 text-sm text-ink-300">Video is being uploaded — see the live demo meanwhile.</p>
            </div>
          </div>
        )}
      </div>
      <figcaption>
        <p className="font-display text-xl font-semibold text-white">{title}</p>
        <p className="text-sm text-ink-300">{sub}</p>
      </figcaption>
    </figure>
  );
}

const linkCls = "font-medium text-spot-400 underline decoration-spot-500/40 underline-offset-4 hover:decoration-spot-500";

export function buildSlides(media: MediaAvailability): DeckSlide[] {
  return [
    /* 1 ─ Title */
    {
      title: "StageCraft",
      stage: true,
      content: (
        <div className="pitch-rise my-auto grid items-center gap-10 py-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow text-spot-400">Build-a-Thon 1.0 · Theme 03 · also covers Themes 01, 02, 04</p>
            <h1 className="mt-5 font-display text-[3.6rem] font-semibold leading-[0.9] tracking-tight text-white sm:text-8xl lg:text-[9rem]">
              Stage<span className="text-spot-500">Craft</span>
            </h1>
            <p className="mt-6 font-display text-2xl text-ink-200 sm:text-4xl">The audience is part of the show.</p>
            <p className="mt-6 max-w-xl text-ink-300">
              Live events for IITM BS houses: interaction, brackets, talent hunts, a broadcast overlay and verifiable certificates — in one app.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href={LIVE_URL} className={linkCls}>stagecraft-xi.vercel.app</a>
              <a href={REPO_URL} className={linkCls}>github.com/lakshanmuruganandam/stagecraft</a>
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <p className="eyebrow text-ink-300">Demo logins · password <span className="text-spot-400">house-cup-2026</span></p>
            <ul className="mt-4 grid gap-2.5">
              {[
                ["admin@saranda.demo", "Admin — users, roles, audit, broadcast"],
                ["organizer@saranda.demo", "Organizer — control room, wrap-up"],
                ["member@saranda.demo", "Member — ask, vote, react, predict"],
              ].map(([email, role]) => (
                <li key={email} className="rounded-xl border border-white/8 bg-ink-800/70 px-4 py-3">
                  <p className="timecode text-sm text-white">{email}</p>
                  <p className="mt-0.5 text-xs text-ink-300">{role}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-400">Demo mode: the avatar menu switches personas instantly.</p>
            <p className="mt-3 hidden font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-300 sm:block">Scroll · ← → · space to navigate · F fullscreen</p>
          </div>
        </div>
      ),
    },

    /* 2 ─ Problem */
    {
      title: "The problem",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-7">
          <SlideHead eyebrow="The problem" title={<>House events today are <span className="text-spot-400">duct-taped</span> together.</>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <MonitorPlay />, t: "Scattered tools", d: "A YouTube link, a Google Form for questions, a WhatsApp group for everything else." },
              { icon: <Users />, t: "Passive audiences", d: "Hundreds watch, few take part. No live Q&A, no polls, no stake in the result." },
              { icon: <ClipboardList />, t: "Juggling organizers", d: "Scores in a sheet, votes counted by hand, five tabs open while running the show." },
              { icon: <FileKey2 />, t: "Unverifiable certificates", d: "PDFs made days later in Canva; anyone can edit one, nobody can check one." },
            ].map((p) => (
              <div key={p.t} className="card p-5">
                <span className="grid size-11 place-items-center rounded-2xl bg-danger-bg text-danger [&>svg]:size-5" aria-hidden>{p.icon}</span>
                <p className="mt-4 font-display text-xl font-semibold text-white">{p.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-auto max-w-3xl font-display text-xl text-ink-200 sm:text-2xl">
            Result: low turnout, lost engagement data, and house points nobody trusts.
          </p>
        </div>
      ),
    },

    /* 3 ─ Product */
    {
      title: "The product in one slide",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="The product" title="One live room. Every part of the show." />
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Feature icon={<Radio />} title="Event room">Stream + live chat with slow mode, pins and moderation.</Feature>
              <Feature icon={<MessageSquareText />} title="Q&A · polls · reactions">Upvoted questions, live polls, floating house-coloured reactions.</Feature>
              <Feature icon={<Brackets />} title="Brackets + predictions">Esports brackets; members predict winners before each match.</Feature>
              <Feature icon={<Vote />} title="Sealed talent-hunt votes">Votes hidden until the reveal, judges weighted separately.</Feature>
              <Feature icon={<LayoutDashboard />} title="Control room">Run the whole show from one screen: segments, scenes, scores.</Feature>
              <Feature icon={<QrCode />} title="OBS overlay + signed QR">Stage overlay with a rotating HMAC-signed check-in code.</Feature>
              <Feature icon={<Award />} title="One-click certificates">Ed25519-signed, verifiable, plus house points on wrap-up.</Feature>
              <Feature icon={<Trophy />} title="House platform">Hubs, calendar radar, quests &amp; badges (Themes 01, 02, 04).</Feature>
            </div>
            <div className="grid content-start gap-3">
              <Shot src="/pitch/event-room.png" alt="StageCraft event room with stream, live Q&A, poll and reactions" />
            </div>
          </div>
        </div>
      ),
    },

    /* 4 ─ Architecture: system */
    {
      title: "Technical architecture: system",
      rubric: "30% · Technical Architecture",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-7">
          <SlideHead
            eyebrow="System"
            title="A server-first Next.js 16 app on an edge database."
            lede="Pages ship a prerendered static shell; request-time data streams inside Suspense. Every write goes through one typed endpoint."
          />
          <SystemDiagram />
          <div className="flex flex-wrap gap-2">
            {["Cache Components / PPR", "React 19", "TypeScript strict", "Tailwind v4", "zod", "Drizzle", "jose", "Vitest", "GitHub Actions"].map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </div>
      ),
    },

    /* 5 ─ Architecture: realtime */
    {
      title: "Technical architecture: realtime pipeline",
      rubric: "30% · Technical Architecture",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead
            eyebrow="Realtime"
            title="Realtime that survives serverless."
            lede="No websockets server, no lost messages: an append-only log in the database, tailed over SSE, resumable from the last event ID."
          />
          <PipelineDiagram />
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Code file="src/lib/live.ts" code={PUBLISH_SNIPPET} />
            <ul className="grid content-start gap-2.5 text-sm text-ink-300">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />Correct across any number of instances — subscribers poll <span className="timecode">seq &gt; cursor</span>.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />In-process emitter wakes streams instantly on a single node.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />Public channels get redacted DTOs; managers get the full view.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />Streams close before platform timeouts; EventSource reconnects gap-free.</li>
            </ul>
          </div>
        </div>
      ),
    },

    /* 6 ─ Architecture: security */
    {
      title: "Technical architecture: security",
      rubric: "30% · Technical Architecture",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="Security" title="Secure by construction, not by checklist." />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Feature icon={<KeyRound />} title="scrypt passwords">Salted, timing-safe compare; throttled logins per account and network.</Feature>
              <Feature icon={<Lock />} title="Revocable sessions">Server-side sessions; sign out other devices from the account page.</Feature>
              <Feature icon={<UserCog />} title="House-scoped RBAC">Organizers manage only events their house hosts; checked on every command.</Feature>
              <Feature icon={<ShieldCheck />} title="CSP · HSTS">Strict Content-Security-Policy, HSTS preload, nosniff, frame-ancestors none.</Feature>
              <Feature icon={<BadgeCheck />} title="Ed25519 certificates">Signed payloads + public JWKS; anyone can verify, revocation is checked live.</Feature>
              <Feature icon={<ScrollText />} title="Audit log">Every sign-in, role change, moderation, score and wrap-up — CSV-safe export.</Feature>
            </div>
            <Code file="src/server/commands.ts" code={COMMAND_SNIPPET} />
          </div>
        </div>
      ),
    },

    /* 7 ─ Relevance: personas */
    {
      title: "Relevance: problems solved per persona",
      rubric: "30% · Relevance & Real-World Utility",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-7">
          <SlideHead eyebrow="Who it's for" title="Built around the three people in every house event." />
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: <Users />,
                who: "Member",
                pain: "“I just watch a stream.”",
                wins: ["Ask, upvote, vote and react live", "Predict bracket winners, back their house", "QR check-in counts toward points", "Certificate + portfolio, verifiable forever"],
              },
              {
                icon: <MonitorPlay />,
                who: "Organizer",
                pain: "“Five tabs and a spreadsheet.”",
                wins: ["One control room for the whole show", "Moderation queue, spotlight to stage", "Scores update bracket + overlay instantly", "Wrap-up issues every certificate in one click"],
              },
              {
                icon: <UserCog />,
                who: "Admin",
                pain: "“Who changed the points?”",
                wins: ["Users & roles with guardrails", "Audit log with filters + CSV", "Spotlight broadcast to every screen", "Revoke a certificate with a reason"],
              },
            ].map((p) => (
              <div key={p.who} className="card flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-spot-500 text-on-spot [&>svg]:size-5" aria-hidden>{p.icon}</span>
                  <p className="font-display text-2xl font-semibold text-white">{p.who}</p>
                </div>
                <p className="mt-4 font-display text-lg italic text-ink-300">{p.pain}</p>
                <ul className="mt-4 grid gap-2 text-sm text-ink-200">
                  {p.wins.map((w) => (
                    <li key={w} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />{w}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    /* 8 ─ Relevance: structure + deploy */
    {
      title: "Relevance: modular code and easy adoption",
      rubric: "30% · Relevance & Real-World Utility",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="Adopt it" title="Any house can run it tomorrow — for free." />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <figure data-theme="stage" className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl shadow-black/20">
              <figcaption className="eyebrow mb-3 text-ink-300">Modular structure</figcaption>
              <pre className="timecode overflow-x-auto text-[0.72rem] leading-[1.75] text-ink-200 sm:text-sm">
{`src/
├─ app/          `}<span className="text-ink-400">routes · RSC pages · route handlers</span>{`
├─ server/       `}<span className="text-ink-400">commands · queries · views · wrapup</span>{`
├─ lib/          `}<span className="text-ink-400">auth · live · bracket · contest · certs</span>{`
├─ components/   `}<span className="text-ink-400">live · admin · ui · site · three</span>{`
├─ db/           `}<span className="text-ink-400">Drizzle schema · client · demo seed</span>{`
└─ proxy.ts      `}<span className="text-ink-400">optimistic auth gate</span>{`
drizzle/         `}<span className="text-ink-400">SQL migrations</span>{`
tests/           `}<span className="text-ink-400">Vitest: engines + crypto</span>
              </pre>
              <p className="mt-4 text-xs text-ink-300">Pure domain engines (bracket, contest, achievements) have no I/O and are unit-tested.</p>
            </figure>
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Feature icon={<Cloud />} title="Vercel + Turso">Both free tiers are enough for a house season.</Feature>
              <Feature icon={<Database />} title="One-command DB init">Migrations auto-apply on first boot; demo seed included.</Feature>
              <Feature icon={<Boxes />} title="Docker">One long-lived Node process — ideal for SSE.</Feature>
              <Feature icon={<Terminal />} title=".env.example">Every variable documented; secrets never committed.</Feature>
              <Feature icon={<ScrollText />} title="MIT licensed">Fork it for any house, club or fest.</Feature>
              <Feature icon={<Sparkles />} title="Demo mode">STAGECRAFT_DEMO=on seeds personas for judging; off for real use.</Feature>
            </div>
          </div>
        </div>
      ),
    },

    /* 9 ─ UI/UX & performance */
    {
      title: "UI/UX and performance",
      rubric: "20% · UI/UX & Performance",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="Craft" title="Fast, accessible, and a joy on a phone." />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-5">
              <div className="card flex flex-wrap justify-around gap-4 p-4">
                <Gauge value={100} label="Accessibility" />
                <Gauge value={100} label="Best Practices" />
                <Gauge value={100} label="SEO" />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Feature compact icon={<GaugeIcon />} title="~110 fps scrolling">Parallax via CSS variables, no per-frame React renders.</Feature>
                <Feature compact icon={<Smartphone />} title="Mobile-first">Mobile menu; event room reorders stream → interact.</Feature>
                <Feature compact icon={<Contrast />} title="WCAG contrast">Tokens tuned to ≥ 4.5:1 in both themes.</Feature>
                <Feature compact icon={<Keyboard />} title="Keyboard + reduced motion">Skip link, visible focus, motion respects the OS.</Feature>
                <Feature compact icon={<Moon />} title="Daylight + Stage themes">Paper by day; broadcast-black for the stage.</Feature>
                <Feature compact icon={<Activity />} title="Living sky + 3D arena">Real IST sky; peaks are live house standings.</Feature>
              </div>
            </div>
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Shot src="/pitch/home.png" alt="StageCraft home page under the living sky" />
              <Shot src="/pitch/houses.png" alt="House Hub showing every house's share of points" />
              <Shot src="/pitch/arena.png" alt="3D arena view" />
              <Shot src="/pitch/login.png" alt="Sign-in page with demo personas" />
            </div>
          </div>
        </div>
      ),
    },

    /* 10 ─ Admin usability */
    {
      title: "Admin usability and workflows",
      rubric: "20% · Admin Usability & Workflows",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="Run the show" title="Organizers drive. The app keeps score." />
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-xl shadow-black/10 lg:max-h-[38vh]">
              <Image src="/pitch/monitor-wall.png" alt="Control room monitor wall showing every live channel with stage, counts and a jump into its control room" width={1440} height={900} sizes="(max-width: 640px) 100vw, 45vw" className="h-auto w-full lg:h-full lg:object-cover lg:object-top" loading="eager" />
            </div>
            <div className="grid content-start gap-2 sm:grid-cols-2">
              <Feature compact icon={<LayoutDashboard />} title="Control room">Segments, scenes, lower thirds, polls, scores.</Feature>
              <Feature compact icon={<MonitorPlay />} title="Monitor wall">Stage, queue, chat and brackets at a glance.</Feature>
              <Feature compact icon={<UserCog />} title="Users & roles">Guardrails: no changing your own role or suspending yourself.</Feature>
              <Feature compact icon={<ScrollText />} title="Audit log + CSV">Filter by action, actor, event, date.</Feature>
              <Feature compact icon={<Megaphone />} title="Spotlight broadcast">Dims every screen, confetti in house colour.</Feature>
              <Feature compact icon={<ShieldCheck />} title="Moderation">Approve, hide, pin, timed mute, slow mode.</Feature>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Wrap-up workflow</p>
            <FlowSteps
              items={[
                { t: "End the show", d: "One toggle in the control room closes chat, votes and predictions." },
                { t: "Wrap up", d: "Idempotent: podiums for every bracket and contest, speakers, organizers, engaged members." },
                { t: "Certificates", d: "Ed25519-signed, on every profile, shareable PNG + public verify page." },
                { t: "House points", d: "Awarded with dedupe keys; leaderboard and House Range update live." },
              ]}
            />
          </div>
        </div>
      ),
    },

    /* 11 ─ Quality proof */
    {
      title: "Quality proof",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-7">
          <SlideHead eyebrow="Proof" title="Shipped like production software." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value="36" label="Unit tests" sub="Brackets, contests, achievements, canonical JSON, check-in, passwords" />
            <Stat value="CI" label="Green on every push" sub="Typecheck · lint · tests · build in GitHub Actions" />
            <Stat value="0" label="Open high / medium issues" sub="Independent security review — all high & medium findings fixed" />
            <Stat value="0" label="Console errors" sub="Across every page, both themes, desktop and mobile" />
          </div>
          <div className="card flex flex-wrap items-center gap-x-8 gap-y-3 p-5 text-sm text-ink-300">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-ok" aria-hidden />Lighthouse 100 a11y · best practices · SEO</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-ok" aria-hidden />Strict CSP, no inline eval in production</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-ok" aria-hidden />CSV export hardened against formula injection</span>
          </div>
        </div>
      ),
    },

    /* 12 ─ Demo videos */
    {
      title: "Demo videos",
      content: (
        <div className="pitch-rise flex flex-1 flex-col gap-6">
          <SlideHead eyebrow="See it run" title="Two short films." />
          <div className="grid gap-6 lg:grid-cols-2">
            <Video
              src="/media/StageCraft-Launch.mp4"
              poster="/media/launch-poster.jpg"
              title="Launch film"
              sub="The product, from a member's seat to the wrap-up."
              available={media.launch}
              hasPoster={media.launchPoster}
            />
            <Video
              src="/media/StageCraft-Technical-Pitch.mp4"
              poster="/media/technical-poster.jpg"
              title="Technical pitch"
              sub="Architecture, realtime pipeline and security, walked through."
              available={media.technical}
              hasPoster={media.technicalPoster}
            />
          </div>
        </div>
      ),
    },

    /* 13 ─ Close */
    {
      title: "Thank you",
      stage: true,
      content: (
        <div className="pitch-rise my-auto grid items-center gap-10 py-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow text-spot-400">StageCraft · Build-a-Thon 1.0</p>
            <h2 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
              The audience is part of <span className="text-spot-500">the show.</span>
            </h2>
            <div className="mt-8 grid gap-2 text-base">
              <a href={LIVE_URL} className={linkCls}>{LIVE_URL.replace("https://", "")}</a>
              <a href={REPO_URL} className={linkCls}>{REPO_URL.replace("https://", "")}</a>
            </div>
            <p className="mt-6 text-sm text-ink-300">Password for every demo account: <span className="timecode text-white">house-cup-2026</span></p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-3xl bg-[#fffdf9] p-4 shadow-[0_0_80px_-10px_rgb(255_169_40/0.45)]">
              <QrSvg text={LIVE_URL} className="size-52 sm:size-64" label={`QR code linking to ${LIVE_URL}`} />
            </div>
            <p className="eyebrow text-ink-300">Scan to open the live site</p>
          </div>
        </div>
      ),
    },
  ];
}
