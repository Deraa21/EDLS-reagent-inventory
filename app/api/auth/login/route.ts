import { NextResponse } from "next/server";
import { createSession, sessionCookie, sessionMaxAge } from "@/lib/session";

export async function POST(request: Request) {
  const adminEmail = process.env.EDLS_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.EDLS_ADMIN_PASSWORD;
  const sessionSecret = process.env.EDLS_SESSION_SECRET;
  if (!adminEmail || !adminPassword || !sessionSecret) {
    return NextResponse.json({ error: "Admin login is not fully configured. The deployment administrator must set EDLS_ADMIN_EMAIL, EDLS_ADMIN_PASSWORD, and EDLS_SESSION_SECRET in Vercel." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (email !== adminEmail || password.length !== adminPassword.length || !constantTimeEqual(password, adminPassword)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const token = await createSession(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to process the login request." }, { status: 400 });
  }
}
function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) mismatch |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return mismatch === 0;
}
