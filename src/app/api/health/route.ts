import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "xynes-auth-app",
    timestamp: new Date().toISOString(),
  });
}
