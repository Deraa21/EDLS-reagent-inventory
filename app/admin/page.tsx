"use client";

import { useEffect, useState } from "react";

const modules = [
  { name: "Reagent Inventory", scope: "Current stock, usable packs, low stock, expiry, catalogue, receiving and usage.", status: "Existing module", icon: "▣" },
  { name: "Sample Outsourcing", scope: "Sample dispatch, referral laboratories, pending results and returned reports.", status: "Needs data mapping", icon: "⇄" },
  { name: "Equipment Maintenance", scope: "Equipment register, service schedules, breakdowns and maintenance history.", status: "Needs data mapping", icon: "⚙" },
];
const roles = [
  { name: "System Admin", access: "All modules, users, permissions and settings", tone: "admin" },
  { name: "Inventory Manager", access: "Reagent inventory and stock operations", tone: "inventory" },
  { name: "Sample Outsourcing Officer", access: "Sample tracking and outsourcing only", tone: "samples" },
  { name: "Equipment Maintenance Officer", access: "Equipment and maintenance only", tone: "equipment" },
  { name: "Laboratory Scientist", access: "Only assigned laboratory operational tasks", tone: "scientist" },
  { name: "Management Viewer", access: "Approved dashboards and read-only reports", tone: "viewer" },
];

type UserRow = { id:string; fullName:string; email:string; role:string; status:string; createdAt:string; lastLoginAt:string|null };
const roleOptions = ["System Admin","Inventory Manager","Sample Outsourcing Officer","Equipment Maintenance Officer","Laboratory Scientist","Management Viewer"];

export default function AdminPage() {
  const [showPlan, setShowPlan] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState("");
  const [userNotice, setUserNotice] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [form, setForm] = useState({fullName:"",email:"",role:"Inventory Manager",password:""});
  async function loadUsers() {
    setLoadingUsers(true); setUserError("");
    try { const r=await fetch("/api/admin/users",{cache:"no-store"}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Could not load users."); setUsers(d.users||[]); }
    catch(e) { setUserError(e instanceof Error?e.message:"Could not load users."); }
    finally { setLoadingUsers(false); }
  }
  useEffect(()=>{ void loadUsers(); },[]);
  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSavingUser(true); setUserError(""); setUserNotice("");
    try { const r=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Could not create account."); setUsers(prev=>[d.user,...prev]); setForm({fullName:"",email:"",role:"Inventory Manager",password:""}); setUserNotice("Account created successfully. Share the temporary password with the staff member securely."); }
    catch(e) { setUserError(e instanceof Error?e.message:"Could not create account."); }
    finally { setSavingUser(false); }
  }
  async function updateUser(id:string, patch:Record<string,string>) {
    setUserError(""); setUserNotice("");
    try { const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...patch})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Could not update account."); setUsers(prev=>prev.map(u=>u.id===id?d.user:u)); setUserNotice("User account updated."); }
    catch(e) { setUserError(e instanceof Error?e.message:"Could not update account."); }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return <main className="admin-root">
    <header className="admin-header">
      <a className="admin-brand" href="/"><span className="admin-mark">E</span><span><strong>EDLS</strong><small>LABORATORY SYSTEM</small></span></a>
      <div className="admin-header-actions"><span className="admin-secure"><span/> System Admin session</span><button onClick={logout} className="admin-logout">Log out</button></div>
    </header>
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="admin-side-label">ADMINISTRATION</div>
        <a href="/admin" className="admin-side-link active"><span>▦</span> Admin Overview</a>
        <a href="#users" className="admin-side-link" onClick={e=>{e.preventDefault();document.getElementById("users")?.scrollIntoView({behavior:"smooth"});}}><span>♙</span> User Management</a>
        <a href="#roles" className="admin-side-link" onClick={e=>{e.preventDefault();document.getElementById("roles")?.scrollIntoView({behavior:"smooth"});}}><span>⛨</span> Roles &amp; Access</a>
        <a href="#modules" className="admin-side-link" onClick={e=>{e.preventDefault();document.getElementById("modules")?.scrollIntoView({behavior:"smooth"});}}><span>▤</span> System Modules</a>
        <div className="admin-side-bottom"><div className="admin-avatar">SC</div><div><strong>System Administrator</strong><small>nwachukwuderaa@gmail.com</small></div></div>
      </aside>
      <section className="admin-content">
        <div className="admin-breadcrumb">EDLS / Administration / <strong>Overview</strong></div>
        <div className="admin-welcome">
          <div><div className="admin-eyebrow">CONTROL CENTER</div><h1>System Admin Dashboard</h1><p>Manage EDLS modules, plan staff access, and monitor the system's administration setup.</p></div>
          <div className="admin-welcome-icon">⌘</div>
        </div>
        <div className="admin-stats">
          <article><span className="admin-stat-icon">♙</span><div><small>Admin accounts configured</small><strong>1</strong><em>Your initial administrator identity</em></div></article>
          <article><span className="admin-stat-icon teal">▦</span><div><small>System modules</small><strong>3</strong><em>Inventory, samples and equipment</em></div></article>
          <article><span className="admin-stat-icon purple">⛨</span><div><small>Proposed role types</small><strong>6</strong><em>Ready for access-control setup</em></div></article>
        </div>
        <section className="admin-section" id="users">
          <div className="admin-section-head"><div><div className="admin-eyebrow">STAFF ACCESS</div><h2>User Management</h2><p>Create staff accounts, assign access roles and manage account status.</p></div><span className="admin-tag">{users.length} account{users.length===1?"":"s"}</span></div>
          {userError && <div className="user-feedback error" role="alert">{userError}</div>}
          {userNotice && <div className="user-feedback success" role="status">{userNotice}</div>}
          <div className="user-admin-grid">
            <form className="user-create-card" onSubmit={createUser}>
              <div className="user-card-title"><div><strong>＋ Add a staff user</strong><p>New accounts are saved to the EDLS User Accounts table.</p></div><span>NEW USER</span></div>
              <label>Full name<input required minLength={2} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Staff member's full name"/></label>
              <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@edls.example"/></label>
              <label>Access role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roleOptions.map(role=><option key={role}>{role}</option>)}</select></label>
              <label>Temporary password<input required type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 12 characters"/><small>Use a unique temporary password and share it privately.</small></label>
              <button className="admin-primary" type="submit" disabled={savingUser}>{savingUser?"Creating account…":"Create staff account →"}</button>
            </form>
            <div className="user-list-card">
              <div className="user-card-title"><div><strong>Staff accounts</strong><p>Account status and assigned role</p></div><button type="button" className="user-refresh" onClick={()=>void loadUsers()}>↻ Refresh</button></div>
              {loadingUsers ? <div className="user-empty">Loading accounts…</div> : users.length===0 ? <div className="user-empty">No staff accounts found yet. Add the first user using the form.</div> :
                <div className="user-table-wrap"><table className="user-table"><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><strong>{user.fullName}</strong><small>{user.email}</small></td><td><select aria-label={"Role for "+user.fullName} value={user.role} onChange={e=>void updateUser(user.id,{role:e.target.value})}>{roleOptions.map(role=><option key={role}>{role}</option>)}</select></td><td><span className={"user-status "+(user.status==="Active"?"active":"inactive")}>{user.status}</span></td><td><button className="user-action" type="button" onClick={()=>void updateUser(user.id,{status:user.status==="Active"?"Inactive":"Active"})}>{user.status==="Active"?"Deactivate":"Activate"}</button></td></tr>)}</tbody></table></div>}
            </div>
          </div>
          <div className="admin-note"><strong>Security note:</strong> Passwords are stored as salted PBKDF2 hashes, not plaintext. Account role selection is stored now; role-based restrictions across every module and API still need to be completed before staff should use the system for live work.</div>
        </section>
        <section className="admin-section" id="roles">
          <div className="admin-section-head"><div><div className="admin-eyebrow">ACCESS CONTROL</div><h2>Roles &amp; permissions</h2><p>Recommended starting roles for the laboratory.</p></div><span className="admin-tag">Proposed design</span></div>
          <div className="admin-role-grid">{roles.map(role=><article className="admin-role-card" key={role.name}><div className={"admin-role-symbol "+role.tone}>{role.tone==="admin"?"♛":role.tone==="inventory"?"▣":role.tone==="samples"?"⇄":role.tone==="equipment"?"⚙":role.tone==="scientist"?"✚":"◉"}</div><div><h3>{role.name}</h3><p>{role.access}</p></div><span className="admin-role-status">Not assigned yet</span></article>)}</div>
          <div className="admin-note"><strong>Important:</strong> These roles are currently a design plan, not active staff permissions. Until multi-user authorization is implemented and tested, do not share the admin login with staff.</div>
        </section>
        <section className="admin-section" id="modules">
          <div className="admin-section-head"><div><div className="admin-eyebrow">WORKSPACE</div><h2>System modules</h2><p>Current implementation status across the EDLS workspace.</p></div><a className="admin-outline" href="/">Open inventory app ↗</a></div>
          <div className="admin-module-grid">{modules.map(module=><article className="admin-module-card" key={module.name}><div className="admin-module-top"><span>{module.icon}</span><small>{module.status}</small></div><h3>{module.name}</h3><p>{module.scope}</p><div className="admin-module-footer"><span className={module.status==="Existing module"?"dot-live":"dot-pending"}/>{module.status==="Existing module"?"App module present":"Requires implementation"}</div></article>)}</div>
        </section>
        <footer className="admin-footer">EDLS Laboratory System · Administration · Access and user-management features are being implemented in stages.</footer>
      </section>
    </div>
    <style jsx global>{`
      *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#182b43;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .admin-root{min-height:100vh}.admin-header{height:76px;background:#fff;border-bottom:1px solid #e5eaf0;display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:5}
      .admin-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#142c45}.admin-mark{display:grid;place-items:center;width:39px;height:39px;border-radius:12px;background:#0d6975;color:white;font-size:22px;font-weight:850}.admin-brand strong{display:block;font-size:15px;letter-spacing:.08em}.admin-brand small{display:block;font-size:9px;letter-spacing:.12em;color:#738196;margin-top:3px}.admin-header-actions{display:flex;align-items:center;gap:18px}.admin-secure{display:flex;align-items:center;gap:8px;color:#53657a;font-size:12px}.admin-secure span{width:7px;height:7px;border-radius:50%;background:#16a36a;box-shadow:0 0 0 4px #e2f7ec}.admin-logout{border:1px solid #d8e1ea;background:white;border-radius:9px;padding:9px 13px;color:#34475d;font-size:12px;font-weight:700;cursor:pointer}
      .admin-layout{display:grid;grid-template-columns:246px minmax(0,1fr);max-width:1600px;margin:auto}.admin-side{min-height:calc(100vh - 76px);background:#102a43;padding:27px 15px;position:sticky;top:76px;height:calc(100vh - 76px);display:flex;flex-direction:column}.admin-side-label{color:#91a9bd;font-size:10px;font-weight:800;letter-spacing:.14em;padding:0 12px 16px}.admin-side-link{display:flex;align-items:center;gap:12px;padding:12px;border-radius:9px;color:#c9d7e4;text-decoration:none;font-size:12px;margin-bottom:4px}.admin-side-link span{width:20px;text-align:center;font-size:16px;color:#a7dedd}.admin-side-link:hover,.admin-side-link.active{background:#24445f;color:white}.admin-side-bottom{margin-top:auto;border-top:1px solid #2a455f;padding:20px 5px 0;display:flex;align-items:center;gap:10px}.admin-avatar{display:grid;place-items:center;background:#d7f1ef;color:#0b6570;border-radius:50%;width:36px;height:36px;font-weight:800;font-size:11px}.admin-side-bottom strong{display:block;color:#fff;font-size:11px}.admin-side-bottom small{display:block;color:#a7bbcc;font-size:9px;margin-top:5px;overflow-wrap:anywhere}
      .admin-content{min-width:0;padding:28px clamp(18px,3vw,42px) 22px}.admin-breadcrumb{font-size:11px;color:#7b899b;margin-bottom:22px}.admin-breadcrumb strong{color:#30465d}.admin-welcome{display:flex;justify-content:space-between;align-items:center;gap:18px;background:linear-gradient(115deg,#102a43 0%,#17465c 68%,#087e8b 100%);padding:28px 30px;border-radius:17px;color:white;box-shadow:0 12px 28px rgba(16,42,67,.1)}.admin-eyebrow{font-size:9px;letter-spacing:.15em;font-weight:850;color:#0c8791}.admin-welcome .admin-eyebrow{color:#a6e8e5}.admin-welcome h1{font-size:clamp(24px,3vw,32px);margin:9px 0 8px;letter-spacing:-.04em}.admin-welcome p{font-size:12px;line-height:1.7;color:#d0e2ed;margin:0;max-width:620px}.admin-welcome-icon{width:66px;height:66px;border-radius:17px;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);font-size:32px;color:#d7fffc;flex:0 0 auto}
      .admin-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0 28px}.admin-stats article{display:flex;align-items:flex-start;gap:13px;background:white;border:1px solid #e4eaf0;border-radius:13px;padding:18px;box-shadow:0 3px 12px rgba(16,42,67,.025)}.admin-stat-icon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;background:#f0f4fa;border-radius:11px;color:#344b66;font-size:19px}.admin-stat-icon.teal{background:#e4f7f5;color:#087e8b}.admin-stat-icon.purple{background:#f1eafe;color:#7043b5}.admin-stats small{display:block;color:#6e7d90;font-size:10px}.admin-stats strong{display:block;font-size:25px;margin:6px 0 4px;letter-spacing:-.04em}.admin-stats em{font-size:9px;font-style:normal;color:#8b98a8}
      .admin-section{margin:28px 0 32px;scroll-margin-top:96px}.admin-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:15px}.admin-section-head h2{font-size:19px;margin:6px 0}.admin-section-head p{margin:0;color:#77869a;font-size:11px}.admin-tag{font-size:10px;font-weight:750;color:#52677d;border:1px solid #dce4ed;border-radius:999px;padding:7px 10px;background:#fff;white-space:nowrap}.admin-tag.pending{background:#fff7e6;color:#9a5b08;border-color:#f7d99a}
      .admin-callout{display:flex;gap:14px;padding:20px;background:#fff;border:1px solid #dfe7ef;border-radius:14px}.admin-callout-icon{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:12px;background:#eaf6f7;color:#087e8b;font-size:21px}.admin-callout strong{font-size:13px}.admin-callout p{font-size:11px;line-height:1.7;color:#6d7d91;margin:7px 0 14px;max-width:900px}.admin-primary{background:#0b7480;color:#fff;border:0;border-radius:8px;padding:10px 13px;font-size:11px;font-weight:750;cursor:pointer}.admin-primary span{padding-left:12px}
      .admin-checklist{margin-top:10px;background:#fff;border:1px solid #e2e9f0;border-radius:12px;padding:4px 18px}.admin-checklist>div{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #edf1f5}.admin-checklist>div:last-child{border-bottom:0}.check-done,.check-next{display:grid;place-items:center;width:25px;height:25px;flex:0 0 25px;border-radius:50%;font-size:11px;font-weight:800}.check-done{background:#dff7eb;color:#13794b}.check-next{background:#eef2f6;color:#63748a}.admin-checklist strong{display:block;font-size:11px}.admin-checklist small{display:block;color:#78879a;font-size:10px;margin-top:4px}.admin-checklist b{margin-left:auto;color:#6b7c90;font-size:9px;white-space:nowrap}
      .admin-role-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.admin-role-card{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;padding:16px;background:white;border:1px solid #e3eaf0;border-radius:12px}.admin-role-symbol{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#eef2f7;color:#3f5a75;font-size:17px}.admin-role-symbol.admin{background:#dff5f2;color:#087e8b}.admin-role-symbol.inventory{background:#e8f0fe;color:#3456a4}.admin-role-symbol.samples{background:#f0e9ff;color:#7043b5}.admin-role-symbol.equipment{background:#fff0dc;color:#9c5d0c}.admin-role-symbol.scientist{background:#e4f7e9;color:#237b44}.admin-role-symbol.viewer{background:#f0f2f5;color:#536477}.admin-role-card h3{font-size:12px;margin:2px 0 6px}.admin-role-card p{font-size:10px;line-height:1.6;color:#728197;margin:0 0 9px}.admin-role-status{grid-column:2;justify-self:start;font-size:9px;color:#8a97a7;background:#f5f7fa;padding:5px 7px;border-radius:5px}
      .admin-note{margin-top:13px;padding:13px 15px;border:1px solid #f4dda4;background:#fffbeb;border-radius:10px;color:#855c16;font-size:10px;line-height:1.7}.admin-note strong{color:#70480a}
      .admin-outline{display:inline-flex;text-decoration:none;border:1px solid #d8e1e9;background:#fff;border-radius:8px;padding:9px 12px;font-size:10px;font-weight:750;color:#34495e;white-space:nowrap}.admin-module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.admin-module-card{background:#fff;border:1px solid #e3eaf0;border-radius:13px;padding:17px}.admin-module-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.admin-module-top>span{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#e8f5f5;color:#087e8b;font-size:18px}.admin-module-top small{font-size:9px;color:#6e7e91;text-align:right}.admin-module-card h3{font-size:13px;margin:16px 0 7px}.admin-module-card p{font-size:10px;color:#718096;line-height:1.7;min-height:52px;margin:0}.admin-module-footer{display:flex;align-items:center;gap:7px;border-top:1px solid #edf1f5;margin-top:13px;padding-top:12px;font-size:9px;color:#718096}.dot-live,.dot-pending{width:7px;height:7px;border-radius:50%;background:#16a36a}.dot-pending{background:#e7a32c}.user-admin-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr);gap:14px;align-items:start}.user-create-card,.user-list-card{background:#fff;border:1px solid #e3eaf0;border-radius:13px;padding:18px;min-width:0}.user-card-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:16px}.user-card-title strong{font-size:13px}.user-card-title p{margin:5px 0 0;color:#7a8798;font-size:10px;line-height:1.5}.user-card-title>span{font-size:9px;letter-spacing:.1em;font-weight:800;color:#087e8b;background:#e5f7f5;padding:6px 7px;border-radius:5px}.user-create-card label{display:flex;flex-direction:column;gap:7px;font-size:10px;font-weight:750;color:#46596e;margin-bottom:13px}.user-create-card input,.user-create-card select,.user-table select{width:100%;min-width:0;border:1px solid #d9e2eb;border-radius:8px;padding:10px;font-size:11px;color:#24384f;background:white}.user-create-card label small{font-weight:400;color:#8a96a6;line-height:1.4}.user-create-card button:disabled{opacity:.6;cursor:wait}.user-refresh,.user-action{border:1px solid #dce5ed;background:white;border-radius:7px;padding:7px 9px;color:#344c63;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}.user-table-wrap{overflow:auto}.user-table{width:100%;border-collapse:collapse;font-size:10px}.user-table th{text-align:left;background:#f8fafc;color:#7a8798;font-size:9px;text-transform:uppercase;letter-spacing:.05em}.user-table th,.user-table td{padding:11px 8px;border-bottom:1px solid #edf1f5;vertical-align:middle}.user-table td strong,.user-table td small{display:block}.user-table td strong{font-size:10px}.user-table td small{font-size:9px;color:#8390a0;margin-top:4px;overflow-wrap:anywhere}.user-table select{min-width:145px;padding:7px}.user-status{display:inline-block;border-radius:999px;padding:5px 7px;font-size:9px;font-weight:750}.user-status.active{background:#dcfce7;color:#166534}.user-status.inactive{background:#f1f3f6;color:#667085}.user-empty{padding:25px 10px;color:#7a8798;font-size:11px;text-align:center;line-height:1.7}.user-feedback{padding:11px 13px;border-radius:9px;margin-bottom:12px;font-size:11px;line-height:1.6}.user-feedback.error{background:#fff1f0;border:1px solid #ffd5d2;color:#912018}.user-feedback.success{background:#ecfdf3;border:1px solid #abefc6;color:#067647}
      .admin-footer{padding:17px 0;color:#8794a4;font-size:10px;border-top:1px solid #e2e8f0;margin-top:30px}
      @media(max-width:1080px){.admin-stats{grid-template-columns:1fr}.user-admin-grid{grid-template-columns:1fr}.admin-module-grid{grid-template-columns:1fr}.admin-module-card p{min-height:0}}
      @media(max-width:760px){.admin-header{padding:0 16px;height:66px}.admin-secure{display:none}.admin-layout{grid-template-columns:1fr}.admin-side{position:static;height:auto;min-height:0;padding:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.admin-side-label{grid-column:1/-1;padding:5px 8px 9px}.admin-side-link{margin:0;padding:10px;font-size:11px}.admin-side-bottom{grid-column:1/-1;margin-top:7px;padding:13px 5px 2px}.admin-content{padding:18px 13px}.admin-welcome{padding:22px 20px}.admin-welcome-icon{display:none}.admin-role-grid{grid-template-columns:1fr}.admin-section-head{align-items:flex-start;flex-direction:column}.admin-callout{padding:15px}.admin-module-grid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
