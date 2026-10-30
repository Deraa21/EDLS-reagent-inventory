import { NextRequest, NextResponse } from "next/server";
import { verifySession, sessionCookie } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(sessionCookie)?.value);
  if (pathname === "/login" || pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    if (pathname === "/login" && session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  const adminEmail = process.env.EDLS_ADMIN_EMAIL?.trim().toLowerCase();
  if ((pathname === "/admin" || pathname.startsWith("/api/admin/")) && (!adminEmail || session.email.toLowerCase() !== adminEmail)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({error:"System administrator access required."},{status:403});
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"] };
