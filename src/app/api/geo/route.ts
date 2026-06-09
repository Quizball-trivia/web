import { NextResponse, type NextRequest } from "next/server";
import { resolveGeo } from "@/lib/geo/vercelGeo";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const geo = resolveGeo({
    headerCountry: request.headers.get("x-vercel-ip-country"),
    overrideCountry: request.nextUrl.searchParams.get("geo"),
    host: request.headers.get("host") ?? request.nextUrl.host,
    vercelEnv: process.env.VERCEL_ENV,
    publicVercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });

  return NextResponse.json(geo, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
