import { NextRequest } from "next/server";
import { verifySession, sessionCookie } from "@/lib/session";

export const USER_TABLE_ID = "tblRRDPsfb5aslKt1";
export const USER_ROLES = ["System Admin","Inventory Manager","Sample Outsourcing Officer","Equipment Maintenance Officer","Laboratory Scientist","Management Viewer"] as const;
export const USER_STATUSES = ["Active","Inactive"] as const;

export async function currentSession(request: NextRequest) {
  return verifySession(request.cookies.get(sessionCookie)?.value);
}
export async function requireSystemAdmin(request: NextRequest) {
  const session = await currentSession(request);
  const adminEmail = process.env.EDLS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!session || !adminEmail || session.email.toLowerCase() !== adminEmail) return null;
  return session;
}
export async function userTableRequest(method: "GET"|"POST"|"PATCH"|"DELETE", body?: unknown, recordId?: string) {
  const token = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID || "appewPIE1AOyOtNuN";
  if (!token) throw new Error("Airtable connection is not configured.");
  const url = recordId
    ? `https://api.airtable.com/v0/${baseId}/${USER_TABLE_ID}/${recordId}`
    : `https://api.airtable.com/v0/${baseId}/${USER_TABLE_ID}`;
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? {"Content-Type":"application/json"} : {}) },
    ...(body ? {body: JSON.stringify(body)} : {}),
    cache: "no-store"
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Airtable rejected the server credentials or permissions.");
    throw new Error(`Airtable user-account request failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<any>;
}
export function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
export async function passwordHash(password: string, saltText?: string) {
  const salt = saltText ? Uint8Array.from(atob(saltText.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-saltText.length%4)%4)), c=>c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},key,256);
  return {salt: encodeBase64Url(salt), hash: encodeBase64Url(new Uint8Array(bits))};
}
export async function verifyPassword(password:string, salt:string, expected:string) {
  const result = await passwordHash(password,salt);
  if (result.hash.length !== expected.length) return false;
  let mismatch = 0;
  for(let i=0;i<expected.length;i++) mismatch |= result.hash.charCodeAt(i)^expected.charCodeAt(i);
  return mismatch===0;
}
