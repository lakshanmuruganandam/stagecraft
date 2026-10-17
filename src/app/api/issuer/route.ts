import { connection } from "next/server";
import { issuer } from "@/lib/certs";

/** Public verification key (JWKS). Anyone can verify our certificates offline. */
export async function GET() {
  await connection();
  return Response.json(
    { issuer: "StageCraft · IITM BS Houses", keys: [issuer().jwk] },
    { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
