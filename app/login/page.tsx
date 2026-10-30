"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Login failed."); return; }
      const requested = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.assign(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/");
    } catch {
      setError("Could not contact the login service. Please try again.");
    } finally { setBusy(false); }
  }
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f4f7fb",fontFamily:"Inter,system-ui,sans-serif",color:"#172b4d"}}>
    <section style={{width:"100%",maxWidth:430,background:"#fff",border:"1px solid #e2e8f0",borderRadius:18,padding:32,boxShadow:"0 12px 36px rgba(16,42,67,.08)"}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:".12em",color:"#087e8b"}}>EDLS LABORATORY SYSTEM</div>
      <h1 style={{fontSize:29,margin:"12px 0 6px"}}>Sign in</h1>
      <p style={{fontSize:14,color:"#667085",margin:"0 0 24px"}}>Sign in with your authorized EDLS account.</p>
      <form onSubmit={submit} style={{display:"grid",gap:14}}>
        <label style={{fontSize:13,fontWeight:650}}>Email address<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/></label>
        <label style={{fontSize:13,fontWeight:650}}>Password<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/></label>
        {error && <div role="alert" style={{background:"#fff1f0",border:"1px solid #ffd5d2",color:"#912018",borderRadius:9,padding:12,fontSize:13}}>{error}</div>}
        <button disabled={busy} type="submit" style={{border:0,borderRadius:9,background:"#102a43",color:"#fff",fontWeight:750,padding:"13px 16px",cursor:busy?"wait":"pointer",marginTop:4}}>{busy?"Signing in…":"Sign in securely"}</button>
      </form>
      <p style={{fontSize:11,color:"#667085",marginTop:22,lineHeight:1.6}}>Access is restricted to authorized staff. If you cannot sign in, contact the EDLS System Administrator.</p>
    </section>
  </main>;
}
const inputStyle: React.CSSProperties = {display:"block",width:"100%",marginTop:7,padding:"12px",border:"1px solid #cfd8e3",borderRadius:8,boxSizing:"border-box",fontSize:14,outlineColor:"#087e8b"};
