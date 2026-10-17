import type { NextRequest } from "next/server";
import { verifySigned } from "@/lib/certs";
import { certificateById } from "@/server/queries";

/** Machine-readable certificate + live status (signature and revocation). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/certificates/[id]">) {
  const { id } = await ctx.params;
  const c = await certificateById(id);
  if (!c) return Response.json({ status: "not_found" }, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  const signed = { payload: JSON.parse(c.payload), signature: c.signature };
  return Response.json(
    { status: c.revokedAt ? "revoked" : verifySigned(signed) ? "valid" : "invalid", revokedAt: c.revokedAt, revokeReason: c.revokeReason, certificate: signed },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
  );
}
