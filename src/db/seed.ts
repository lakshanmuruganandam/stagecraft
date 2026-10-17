import { sql } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import { buildBracket } from "@/lib/bracket";
import { newId } from "@/lib/ids";

/** The twelve IITM BS houses. Colours are our own picks for charts. */
export const HOUSES = [
  { slug: "saranda", name: "Saranda", color: "#16a34a", motto: "The house of excellence and innovation" },
  { slug: "gir", name: "Gir", color: "#ea580c", motto: "Pride of the lion" },
  { slug: "kanha", name: "Kanha", color: "#ca8a04", motto: "Where the tiger walks" },
  { slug: "bandipur", name: "Bandipur", color: "#0891b2", motto: "Steady as the elephant" },
  { slug: "corbett", name: "Corbett", color: "#dc2626", motto: "First in the wild" },
  { slug: "namdapha", name: "Namdapha", color: "#7c3aed", motto: "From the eastern hills" },
  { slug: "pichavaram", name: "Pichavaram", color: "#0d9488", motto: "Rooted like the mangroves" },
  { slug: "wayanad", name: "Wayanad", color: "#65a30d", motto: "Green, deep and growing" },
  { slug: "kaziranga", name: "Kaziranga", color: "#4f46e5", motto: "Strength of the rhino" },
  { slug: "nallamala", name: "Nallamala", color: "#be185d", motto: "Forest of the Deccan" },
  { slug: "nilgiri", name: "Nilgiri", color: "#2563eb", motto: "Blue mountains, bright minds" },
  { slug: "sundarbans", name: "Sundarbans", color: "#9333ea", motto: "Fearless at the delta" },
] as const;

const FIRST = ["Aarav", "Diya", "Kabir", "Ananya", "Rohan", "Meera", "Arjun", "Ishita", "Vihaan", "Sneha", "Aditya", "Priya", "Karthik", "Nisha", "Siddharth", "Tanvi", "Rahul", "Zoya", "Varun", "Lakshmi", "Farhan", "Pooja", "Nikhil", "Riya"];
const LAST = ["Sharma", "Iyer", "Khan", "Reddy", "Menon", "Gupta", "Nair", "Das", "Patel", "Singh", "Rao", "Bose"];

export { DEMO_EMAILS } from "@/lib/demo";
import { DEMO_EMAILS } from "@/lib/demo";

/** Shared password for the seeded demo accounts (shown on the sign-in page in demo mode). */
export const DEMO_PASSWORD = "house-cup-2026";

export async function seedIfEmpty(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.houses);
  if (n === 0) await seed(db);
  await ensureDemoPasswords(db);
}

/** Demo accounts get a real (hashed) password so judges can test the actual login. */
/** Production bootstrap: the twelve houses are reference data, nothing else. */
export async function seedHousesIfEmpty(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.houses);
  if (n === 0) await db.insert(s.houses).values(HOUSES.map((h) => ({ id: `h_${h.slug}`, ...h })));
}

export async function ensureDemoPasswords(db: DB) {
  const { isNull, like, and } = await import("drizzle-orm");
  const missing = await db.select({ id: s.users.id }).from(s.users).where(and(like(s.users.email, "%.demo"), isNull(s.users.passwordHash)));
  if (!missing.length) return;
  const { hashPassword } = await import("@/lib/password");
  const hash = await hashPassword(DEMO_PASSWORD);
  for (const u of missing) await db.update(s.users).set({ passwordHash: hash }).where(sql`id = ${u.id}`);
}

export async function wipe(db: DB) {
  // Children first; FK order matters.
  for (const t of [s.changes, s.auditLog, s.rateBuckets, s.housePoints, s.certificates, s.judgeScores, s.actVotes, s.acts, s.contests, s.predictions, s.matches, s.entrants, s.brackets, s.pollVotes, s.polls, s.questionVotes, s.questions, s.chatMessages, s.registrations, s.segments, s.events, s.users, s.houses]) {
    await db.delete(t);
  }
}

export async function seed(db: DB) {
  const now = Date.now();
  const min = 60_000;
  const day = 86_400_000;

  const houseRows = HOUSES.map((h) => ({ id: `h_${h.slug}`, ...h }));
  await db.insert(s.houses).values(houseRows);
  const H = Object.fromEntries(houseRows.map((h) => [h.slug, h.id])) as Record<(typeof HOUSES)[number]["slug"], string>;

  // People
  const people: (typeof s.users.$inferInsert)[] = [
    { id: "u_admin", name: "Saranda WebOps", email: DEMO_EMAILS.admin, houseId: H.saranda, role: "admin" },
    { id: "u_org", name: "Ishaan Verma", email: DEMO_EMAILS.organizer, houseId: H.saranda, role: "organizer" },
    { id: "u_me", name: "Ananya Iyer", email: DEMO_EMAILS.member, houseId: H.saranda, role: "member" },
    { id: "u_guest", name: "Rehan Bora", email: DEMO_EMAILS.guest, houseId: H.kaziranga, role: "member" },
    { id: "u_org_kz", name: "Mitali Saikia", email: "organizer@kaziranga.demo", houseId: H.kaziranga, role: "organizer" },
  ];
  const houseIds = Object.values(H);
  for (let i = 0; i < 48; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    people.push({ id: `u_${i}`, name, email: `student${i}@ds.study.iitm.ac.in`, houseId: houseIds[i % houseIds.length], role: "member" });
  }
  await db.insert(s.users).values(people);
  const crowd = people.slice(5).map((p) => p.id!);

  const settings = (o: Partial<s.EventSettings> = {}): s.EventSettings => ({ ...s.defaultSettings, ...o });

  /* 1 — Live guest talk with Q&A and polls */
  const talk = "e_talk";
  await db.insert(s.events).values({
    id: talk,
    slug: "open-source-at-scale",
    title: "Saranda Spotlight: Shipping Open Source at Scale",
    tagline: "A fireside chat with a maintainer of a 40k★ project",
    description:
      "How do you go from a weekend repo to a project thousands depend on? Our guest walks through triage, release engineering and burnout-proof maintainership — then takes your questions live. Upvote the questions you want answered.",
    kind: "talk",
    status: "live",
    streamUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    hostHouseIds: [H.saranda],
    startsAt: now - 25 * min,
    endsAt: now + 65 * min,
    hue: 152,
    settings: settings({ qaModeration: true }),
    createdBy: "u_org",
    lowerThird: "Live now · Fireside chat with our guest maintainer",
  });
  const talkSegs = [
    { title: "Welcome & house announcements", speaker: "Ishaan Verma", durationMin: 10 },
    { title: "From weekend repo to 40k stars", speaker: "Guest maintainer", durationMin: 35 },
    { title: "Live Q&A", speaker: "Audience", durationMin: 30 },
    { title: "Closing & certificates", speaker: "Saranda WebOps", durationMin: 10 },
  ].map((x, i) => ({ id: `seg_t${i}`, eventId: talk, position: i, ...x }));
  await db.insert(s.segments).values(talkSegs);
  await db.update(s.events).set({ currentSegmentId: "seg_t1" }).where(sql`id = ${talk}`);

  const qs = [
    ["How do you decide what NOT to merge?", 31, "live"],
    ["What does your release checklist look like?", 22, "live"],
    ["Any advice for students making their first OSS contribution?", 18, "answered"],
    ["How do you fund maintenance time?", 12, "live"],
    ["Monorepo or polyrepo, and why?", 7, "live"],
    ["Is it okay to use AI to write PRs for open source?", 4, "pending"],
  ] as const;
  await db.insert(s.questions).values(
    qs.map(([body, votes, status], i) => ({ id: `q_${i}`, eventId: talk, userId: crowd[i * 3], body, votes, status, anonymous: i === 3, createdAt: now - (20 - i * 2) * min })),
  );
  const qv: (typeof s.questionVotes.$inferInsert)[] = [];
  qs.forEach(([, votes], i) => {
    for (let k = 0; k < votes; k++) qv.push({ questionId: `q_${i}`, userId: crowd[(k + i) % crowd.length] });
  });
  await db.insert(s.questionVotes).values(qv);

  await db.insert(s.polls).values([
    { id: "p_open", eventId: talk, question: "Have you contributed to an open-source project yet?", options: ["Yes, merged PRs!", "Opened issues only", "Not yet, but soon", "What's a PR?"], status: "open", openedAt: now - 3 * min },
    { id: "p_closed", eventId: talk, question: "Which language do you use most?", options: ["Python", "JavaScript / TypeScript", "C / C++", "Java"], status: "closed", openedAt: now - 20 * min },
    { id: "p_draft", eventId: talk, question: "Should we run a monthly OSS sprint?", options: ["Yes", "Maybe", "No"], status: "draft" },
  ]);
  const pv: (typeof s.pollVotes.$inferInsert)[] = [];
  crowd.slice(0, 34).forEach((u, i) => pv.push({ pollId: "p_open", userId: u, option: [0, 1, 2, 2, 1, 2, 3, 0, 2][i % 9] }));
  crowd.forEach((u, i) => pv.push({ pollId: "p_closed", userId: u, option: [0, 0, 1, 0, 2, 1, 0, 3][i % 8] }));
  await db.insert(s.pollVotes).values(pv);

  const chatLines = ["hello from Chennai 👋", "audio is crisp today", "Saranda represent 💚", "this is gold", "can you share the slides later?", "release trains are underrated", "first time attending, loving it", "upvoted the OSS question!", "Kaziranga in the house 🦏", "notes going straight into my Obsidian"];
  await db.insert(s.chatMessages).values(
    chatLines.map((body, i) => ({ id: `c_${i}`, eventId: talk, userId: crowd[(i * 5) % crowd.length], body, createdAt: now - (12 - i) * min, pinned: i === 4 })),
  );

  /* 2 — Live esports bracket */
  const cup = "e_cup";
  await db.insert(s.events).values({
    id: cup,
    slug: "inter-house-valorant-cup",
    title: "Inter-House Valorant Cup",
    tagline: "8 houses · single elimination · best of 3",
    description: "Eight houses, one trophy. Follow the bracket live, predict every match for bragging rights, and cheer your house in chat. Winners earn house points and verifiable certificates.",
    kind: "esports",
    status: "live",
    streamUrl: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    hostHouseIds: [H.saranda, H.kaziranga],
    startsAt: now - 90 * min,
    endsAt: now + 120 * min,
    hue: 345,
    settings: settings({ slowModeSec: 3 }),
    createdBy: "u_org",
  });
  await db.insert(s.brackets).values({ id: "b_cup", eventId: cup, title: "Main bracket", game: "Valorant", bestOf: 3, thirdPlace: true });
  const teamHouses = ["saranda", "kaziranga", "gir", "corbett", "kanha", "wayanad", "namdapha", "bandipur"] as const;
  const teamNames = ["Saranda Sentinels", "Kaziranga Rhinos", "Gir Prides", "Corbett Strikers", "Kanha Stripes", "Wayanad Vipers", "Namdapha Phantoms", "Bandipur Tuskers"];
  const ent = teamHouses.map((h, i) => ({ id: `t_${h}`, bracketId: "b_cup", name: teamNames[i], houseId: H[h], seed: i + 1, memberIds: crowd.filter((_, k) => k % 12 === houseIds.indexOf(H[h])).slice(0, 5) }));
  ent[0].memberIds = ["u_me", ...ent[0].memberIds.slice(0, 4)];
  await db.insert(s.entrants).values(ent);
  let ms = buildBracket(ent.map((e) => e.id), { thirdPlace: true, makeId: newId });
  const { reportResult, setLive } = await import("@/lib/bracket");
  const r1 = ms.filter((m) => m.round === 1 && m.lane === "main").sort((a, b) => a.slot - b.slot);
  ms = reportResult(ms, r1[0].id, 2, 0);
  ms = reportResult(ms, r1[1].id, 1, 2);
  ms = reportResult(ms, r1[2].id, 2, 1);
  ms = reportResult(ms, r1[3].id, 0, 2);
  const semi0 = ms.find((m) => m.round === 2 && m.slot === 0)!;
  ms = setLive(ms, semi0.id, true);
  await db.insert(s.matches).values(ms.map((m) => ({ ...m, bracketId: "b_cup" })));
  await db.insert(s.predictions).values(crowd.slice(0, 26).map((u, i) => ({ matchId: semi0.id, userId: u, pickId: i % 3 === 0 ? semi0.bId! : semi0.aId! })));
  await db.insert(s.chatMessages).values(
    ["GG on that clutch 🔥", "Sentinels looking unstoppable", "ref check the eco round lol", "RHINOS 🦏🦏🦏", "predicted this upset"].map((body, i) => ({ id: `cc_${i}`, eventId: cup, userId: crowd[(i * 7 + 2) % crowd.length], body, createdAt: now - (6 - i) * min })),
  );
  await db.insert(s.polls).values({ id: "p_cup", eventId: cup, question: "Play of the day so far?", options: ["Sentinels 1v3 ace", "Rhinos retake on B", "Prides pistol round"], status: "open", openedAt: now - 5 * min });

  /* 3 — Talent hunt with audience voting */
  const th = "e_talent";
  await db.insert(s.events).values({
    id: th,
    slug: "rhythm-and-verse-talent-hunt",
    title: "Rhythm & Verse: Talent Hunt",
    tagline: "Music · poetry · stand-up — the audience votes",
    description: "Performers from every house take the virtual stage. Watch, vote for your favourite act, and see the leaderboard reveal at the end. Final score blends judges (60%) and audience votes (40%).",
    kind: "cultural",
    status: "live",
    streamUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    hostHouseIds: [H.saranda],
    startsAt: now - 40 * min,
    endsAt: now + 50 * min,
    hue: 28,
    settings: settings(),
    createdBy: "u_org",
  });
  await db.insert(s.contests).values({ id: "k_th", eventId: th, title: "Audience Choice", status: "open", judgeWeight: 60, votesPerUser: 2 });
  const actRows = [
    ["Meera Nair", "Raag Yaman on violin", "pichavaram"],
    ["Kabir Khan", "Spoken word: 'Lagging Wi-Fi, Leading Hearts'", "saranda"],
    ["Diya Reddy", "Bharatanatyam fusion", "kanha"],
    ["Farhan & Riya", "Acoustic mashup", "kaziranga"],
    ["Siddharth Rao", "Stand-up: Life in an online degree", "gir"],
    ["Tanvi Das", "Beatbox loop set", "wayanad"],
  ] as const;
  await db.insert(s.acts).values(actRows.map(([performer, title, h], i) => ({ id: `a_${i}`, contestId: "k_th", performer, title, houseId: H[h], position: i })));
  const av: (typeof s.actVotes.$inferInsert)[] = [];
  crowd.forEach((u, i) => {
    av.push({ contestId: "k_th", actId: `a_${[1, 0, 3, 1, 4, 2, 1, 5][i % 8]}`, userId: u });
  });
  await db.insert(s.actVotes).values(av);
  await db.insert(s.judgeScores).values([
    { actId: "a_0", judgeId: "u_org", score: 9.1 },
    { actId: "a_1", judgeId: "u_org", score: 8.4 },
    { actId: "a_2", judgeId: "u_org", score: 8.8 },
  ]);

  /* 4 — Upcoming hackathon demo day */
  await db.insert(s.events).values({
    id: "e_demo",
    slug: "build-a-thon-demo-day",
    title: "Build-a-Thon 1.0 Demo Day",
    tagline: "Ten houses, five themes, one stage",
    description: "Teams from across the houses demo what they built for Build-a-Thon 1.0. Ask questions live, vote for the People's Choice award, and catch the results ceremony.",
    kind: "hackathon",
    status: "scheduled",
    streamUrl: null,
    hostHouseIds: [H.saranda, H.gir, H.kanha, H.bandipur, H.corbett, H.namdapha, H.pichavaram, H.wayanad, H.kaziranga],
    startsAt: now + 3 * day,
    endsAt: now + 3 * day + 180 * min,
    hue: 210,
    settings: settings(),
    createdBy: "u_admin",
  });

  /* 5 — Past event, already wrapped, with issued certificates */
  await db.insert(s.events).values({
    id: "e_quiz",
    slug: "data-science-quiz-night",
    title: "Data Science Quiz Night",
    tagline: "Pandas, probability and pop culture",
    description: "A fast-paced quiz across stats, ML and trivia. Certificates were issued automatically as soon as the event wrapped.",
    kind: "talk",
    status: "ended",
    hostHouseIds: [H.saranda],
    startsAt: now - 6 * day,
    endsAt: now - 6 * day + 90 * min,
    hue: 265,
    settings: settings(),
    createdBy: "u_org",
  });
  for (const u of ["u_me", ...crowd.slice(0, 20)]) {
    await db.insert(s.registrations).values({ eventId: "e_quiz", userId: u, role: "attendee" }).onConflictDoNothing();
  }

  // House points history so the leaderboard isn't empty on day one.
  const pts: (typeof s.housePoints.$inferInsert)[] = [];
  const base = [420, 365, 330, 310, 295, 280, 260, 240, 225, 210, 190, 170];
  houseRows.forEach((h, i) => pts.push({ id: newId(), houseId: h.id, points: base[i], reason: "Term opening balance", createdAt: now - 30 * day }));
  await db.insert(s.housePoints).values(pts);

  // Wrap up the quiz through the real pipeline so its certs are genuine.
  const { wrapUpEvent } = await import("@/server/wrapup");
  await db.insert(s.contests).values({ id: "k_quiz", eventId: "e_quiz", title: "Final standings", status: "revealed", judgeWeight: 100, votesPerUser: 1 });
  await db.insert(s.acts).values([
    { id: "aq_0", contestId: "k_quiz", performer: "Ananya Iyer", title: "Team p-value", houseId: H.saranda, userId: "u_me", position: 0 },
    { id: "aq_1", contestId: "k_quiz", performer: people[9].name, title: "Team Overfit", houseId: people[9].houseId, userId: people[9].id, position: 1 },
    { id: "aq_2", contestId: "k_quiz", performer: people[14].name, title: "Team Gradient", houseId: people[14].houseId, userId: people[14].id, position: 2 },
  ]);
  await db.insert(s.judgeScores).values([
    { actId: "aq_0", judgeId: "u_org", score: 9.6 },
    { actId: "aq_1", judgeId: "u_org", score: 8.9 },
    { actId: "aq_2", judgeId: "u_org", score: 8.1 },
  ]);
  await wrapUpEvent(db, "e_quiz", { actorId: "u_org", at: now - 6 * day + 95 * min, publishLive: false });
}
