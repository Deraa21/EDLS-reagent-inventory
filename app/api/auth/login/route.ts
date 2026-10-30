import { NextResponse } from "next/server";
import { createSession, sessionCookie, sessionMaxAge } from "@/lib/session";
import { userTableRequest, verifyPassword } from "@/lib/users";

export async function POST(request: Request) {
  const adminEmail = process.env.EDLS_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.EDLS_ADMIN_PASSWORD;
  const sessionSecret = process.env.EDLS_SESSION_SECRET;
  if (!sessionSecret) return NextResponse.json({ error: "Login is not configured. Contact the system administrator." }, { status: 503 });
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    let authenticated = false;
    if (adminEmail && adminPassword && email === adminEmail && password.length === adminPassword.length && constantTimeEqual(password, adminPassword)) authenticated = true;
    if (!authenticated && email && password) {
      const data = await userTableRequest("GET");
      const account = (data.records || []).find((r:any) => String(r.fields?.Email || "").trim().toLowerCase() === email);
      if (account && account.fields?.Status === "Active" && account.fields?.["Password Hash"] && account.fields?.["Password Salt"]) {
        authenticated = await verifyPassword(password, String(account.fields["Password Salt"]), String(account.fields["Password Hash"]));
        if (authenticated) await userTableRequest("PATCH", {fields:{"Last Login At":new Date().toISOString()}}, account.id);
      }
    }
    if (!authenticated) return NextResponse.json({ error: "Email or password is incorrect, or this account is inactive." }, { status: 401 });
    const token = await createSession(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, token, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:sessionMaxAge });
    return response;
  } catch (e) {
    return NextResponse.json({ error: "User account service is temporarily unavailable. Please try again or contact the system administrator." }, { status: 503 });
  }
}
function constantTimeEqual(a:string,b:string):boolean {
  let mismatch=a.length^b.length;
  const length=Math.max(a.length,b.length);
  for(let i=0;i<length;i++) mismatch|=(a.charCodeAt(i%(a.length||1))||0)^(b.charCodeAt(i%(b.length||1))||0);
  return mismatch===0;
}
