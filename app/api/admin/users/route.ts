import { NextRequest, NextResponse } from "next/server";
import { currentSession, passwordHash, requireSystemAdmin, USER_ROLES, USER_STATUSES, userTableRequest } from "@/lib/users";

function safeUser(record:any) {
  const f=record.fields||{};
  return {id:record.id, fullName:f["Full Name"]||"", email:f.Email||"", role:f.Role||"", status:f.Status||"Active", createdAt:f["Created At"]||record.createdTime||"", lastLoginAt:f["Last Login At"]||null};
}
export async function GET(request:NextRequest) {
  if(!await requireSystemAdmin(request)) return NextResponse.json({error:"System administrator access required."},{status:403});
  try {
    const data=await userTableRequest("GET");
    return NextResponse.json({users:(data.records||[]).map(safeUser)});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Unable to load users."},{status:502}); }
}
export async function POST(request:NextRequest) {
  if(!await requireSystemAdmin(request)) return NextResponse.json({error:"System administrator access required."},{status:403});
  try {
    const body=await request.json();
    const fullName=String(body.fullName||"").trim();
    const email=String(body.email||"").trim().toLowerCase();
    const role=String(body.role||"");
    const password=String(body.password||"");
    if(fullName.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({error:"Enter a full name and valid email address."},{status:400});
    if(!USER_ROLES.includes(role as any)) return NextResponse.json({error:"Choose a valid role."},{status:400});
    if(password.length<12) return NextResponse.json({error:"Temporary password must be at least 12 characters."},{status:400});
    const existing=await userTableRequest("GET");
    if((existing.records||[]).some((r:any)=>String(r.fields?.Email||"").trim().toLowerCase()===email)) return NextResponse.json({error:"An account with this email already exists."},{status:409});
    const credentials=await passwordHash(password);
    const created=await userTableRequest("POST",{fields:{"Full Name":fullName,Email:email,Role:role,Status:"Active","Password Hash":credentials.hash,"Password Salt":credentials.salt,"Created At":new Date().toISOString()}});
    return NextResponse.json({user:safeUser(created)},{status:201});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Unable to create user."},{status:502}); }
}
export async function PATCH(request:NextRequest) {
  if(!await requireSystemAdmin(request)) return NextResponse.json({error:"System administrator access required."},{status:403});
  try {
    const body=await request.json();
    const id=String(body.id||"");
    const status=String(body.status||"");
    const role=body.role===undefined?undefined:String(body.role);
    if(!/^rec[A-Za-z0-9]{14}$/.test(id)) return NextResponse.json({error:"Invalid user record."},{status:400});
    const fields:Record<string,unknown>={};
    if(status) { if(!USER_STATUSES.includes(status as any)) return NextResponse.json({error:"Invalid account status."},{status:400}); fields.Status=status; }
    if(role!==undefined) { if(!USER_ROLES.includes(role as any)) return NextResponse.json({error:"Invalid role."},{status:400}); fields.Role=role; }
    if(!Object.keys(fields).length) return NextResponse.json({error:"No valid changes supplied."},{status:400});
    const updated=await userTableRequest("PATCH",{fields},id);
    return NextResponse.json({user:safeUser(updated)});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Unable to update user."},{status:502}); }
}

export async function DELETE(request:NextRequest) {
  if(!await requireSystemAdmin(request)) return NextResponse.json({error:"System administrator access required."},{status:403});
  try {
    const body=await request.json();
    const id=String(body.id||"");
    if(!/^rec[A-Za-z0-9]{14}$/.test(id)) return NextResponse.json({error:"Invalid user record."},{status:400});
    const data=await userTableRequest("GET");
    const record=(data.records||[]).find((r:any)=>r.id===id);
    if(!record) return NextResponse.json({error:"User account not found."},{status:404});
    const email=String(record.fields?.Email||"").trim().toLowerCase();
    if(email && email===process.env.EDLS_ADMIN_EMAIL?.trim().toLowerCase()) return NextResponse.json({error:"The primary system administrator account cannot be removed here."},{status:400});
    await userTableRequest("DELETE",undefined,id);
    return NextResponse.json({ok:true,id});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Unable to remove user."},{status:502}); }
}
