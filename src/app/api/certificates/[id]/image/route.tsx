import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { certificateById } from "@/server/queries";
import { siteUrl } from "@/lib/env";
import { qrDataUrl } from "@/lib/qr";

const TITLE = { winner: "Certificate of Excellence", "runner-up": "Certificate of Merit", third: "Certificate of Merit", participant: "Certificate of Participation", speaker: "Certificate of Appreciation", organizer: "Certificate of Appreciation" } as const;

/** Shareable PNG of a certificate (also used as its Open Graph image). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/certificates/[id]/image">) {
  const { id } = await ctx.params;
  const c = await certificateById(id);
  if (!c) return new Response("Not found", { status: 404 });
  const qr = await qrDataUrl(`${siteUrl()}/verify/${c.id}`);
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(c.issuedAt);
  const gold = "#a07f3a";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fbf7ee", padding: 36, fontFamily: "serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", border: `2px solid ${gold}`, borderRadius: 10, padding: "70px 110px", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 20, letterSpacing: 8, color: gold, textTransform: "uppercase" }}>StageCraft · IITM BS Houses</div>
            <div style={{ fontSize: 66, color: "#1d1a14", marginTop: 18 }}>{TITLE[c.kind]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 26, color: "#5c5240", fontStyle: "italic" }}>This certifies that</div>
            <div style={{ fontSize: 92, color: "#14110b", marginTop: 8 }}>{c.recipientName}</div>
            {c.houseName && <div style={{ fontSize: 20, letterSpacing: 6, color: gold, textTransform: "uppercase", marginTop: 6 }}>{`${c.houseName} House`}</div>}
            <div style={{ fontSize: 32, color: "#2b261c", marginTop: 30, textAlign: "center", maxWidth: 1100 }}>{c.achievement}</div>
            <div style={{ fontSize: 24, color: "#5c5240", marginTop: 10 }}>{`at ${c.eventTitle}`}</div>
          </div>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, color: "#1d1a14" }}>{date}</div>
              <div style={{ fontSize: 15, letterSpacing: 4, color: gold, textTransform: "uppercase" }}>Date of issue</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: 24, color: "#1d1a14", fontFamily: "monospace" }}>{c.id}</div>
                <div style={{ fontSize: 15, letterSpacing: 4, color: gold, textTransform: "uppercase" }}>Ed25519 signed · scan to verify</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img src={qr} width={130} height={130} />
            </div>
          </div>
          {c.revokedAt && (
            <div style={{ position: "absolute", top: 420, left: 470, fontSize: 90, color: "rgba(185,28,28,.8)", border: "8px solid rgba(185,28,28,.8)", padding: "4px 40px", transform: "rotate(-12deg)" }}>REVOKED</div>
          )}
        </div>
      </div>
    ),
    { width: 1754, height: 1240, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
