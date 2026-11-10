import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2, Copy, Check, PlugZap, Save, RefreshCw, AlertTriangle, ShieldCheck, Trash2, CheckCircle2, XCircle, ExternalLink, KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { clearCache } from "../../data/axiosConfig";
import { apiError, fmtDateTime, fmtNum, roleLabel, timeAgo } from "./jvUtils";

const input = "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 dark:bg-transparent dark:text-white text-[14px] focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15";
const label = "block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5";

function Card({ title, subtitle, children, right }) {
  return (
    <section className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div><h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>{subtitle && <p className="text-[12.5px] text-slate-500 mt-0.5">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, children, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600" />
      <span><span className="block text-[13.5px] font-medium text-slate-800 dark:text-slate-100">{children}</span>{hint && <span className="block text-[12px] text-slate-500">{hint}</span>}</span>
    </label>
  );
}

function RoleMapping({ tab, roleKeys, onSaved }) {
  const [roles, setRoles] = useState(tab.roles || {});
  const [busy, setBusy] = useState(false);
  useEffect(() => setRoles(tab.roles || {}), [tab.roles]);

  const save = async (reset) => {
    setBusy(true);
    try {
      await api.put("/jv/admin/roles", reset ? { tab: tab.key, reset: true } : { tab: tab.key, roles });
      toast.success(reset ? "Reset to automatic detection" : "Column mapping saved");
      clearCache("/jv/"); onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">{tab.title} <span className="text-[11px] font-medium text-slate-400 ml-1">{tab.rolesManual ? "manual mapping" : "auto-detected"}</span></p>
        <div className="flex gap-2">
          {tab.rolesManual && <button onClick={() => save(true)} disabled={busy} className="text-[12px] text-slate-500 hover:text-teal-700">Reset to auto</button>}
          <button onClick={() => save(false)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-semibold disabled:opacity-50">Save mapping</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roleKeys.map((k) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{roleLabel[k] || k}</label>
            <select value={roles[k] ?? ""} onChange={(e) => setRoles((r) => ({ ...r, [k]: e.target.value === "" ? null : Number(e.target.value) }))}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-transparent text-[13px]">
              <option value="">— none —</option>
              {tab.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JvSettings() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [creds, setCreds] = useState(null);
  const [roleKeys, setRoleKeys] = useState([]);
  const [err, setErr] = useState("");
  const [logs, setLogs] = useState([]);

  const [provider, setProvider] = useState("service_account");
  const [sheet, setSheet] = useState("");
  const [scriptUrl, setScriptUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [tabs, setTabs] = useState([]);
  const [auto, setAuto] = useState({ enabled: true, intervalMinutes: 30 });
  const [allowRefresh, setAllowRefresh] = useState(true);
  const [allowExport, setAllowExport] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState(null);   // {ok, text}
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const hydrate = useCallback((c) => {
    setCfg(c);
    setProvider(c.configured ? c.provider : "public_link"); setSheet(c.spreadsheetId); setScriptUrl(c.appsScriptUrl);
    setAuto(c.autoSync); setAllowRefresh(c.allowEmployeeRefresh); setAllowExport(c.allowEmployeeExport);
    setTabs(c.tabs.map((t) => ({ gid: t.gid, key: t.key, title: t.title, enabled: t.enabled, headerRow: t.headerRow, hidden: false })));
  }, []);

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([api.get("/jv/admin/config"), api.get("/jv/sync-logs?limit=10")]);
      hydrate(c.data.config); setCreds(c.data.credentials); setRoleKeys(c.data.roleKeys); setLogs(l.data.logs); setErr("");
    } catch (e) { setErr(apiError(e, "Could not load settings.")); }
  }, [hydrate]);
  useEffect(() => { load(); }, [load]);

  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(creds.serviceAccountEmail); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const payloadBase = () => ({
    provider, spreadsheetId: sheet, appsScriptUrl: scriptUrl, ...(secret ? { appsScriptSecret: secret } : {}),
  });

  const testConnection = async () => {
    setTesting(true); setTestMsg(null);
    try {
      const { data } = await api.post("/jv/admin/test", payloadBase());
      const known = new Map(tabs.map((t) => [t.key, t]));
      const firstSetup = !cfg?.configured;
      setTabs(data.tabs.map((t) => {
        const prev = known.get(t.key);
        return { gid: t.gid, key: t.key, title: t.title, hidden: t.hidden, headerRow: prev?.headerRow || 1, enabled: prev ? prev.enabled : firstSetup && !t.hidden };
      }));
      setTestMsg({ ok: true, text: data.message });
    } catch (e) { setTestMsg({ ok: false, text: apiError(e, "Connection failed.") }); }
    finally { setTesting(false); }
  };

  // One-step flow for the "public link" option: test → enable every worksheet → save → sync → open listings.
  const connectAndFetch = async (value) => {
    const link = (value ?? sheet).trim();
    if (!link) return toast.error("Paste the Google Sheet link first.");
    setSheet(link); setTesting(true); setTestMsg(null);
    const t = toast.loading("Reading your Google Sheet…");
    try {
      const { data } = await api.post("/jv/admin/test", { provider: "public_link", spreadsheetId: link });
      const found = data.tabs.map((x) => ({ gid: x.gid, key: x.key, title: x.title, hidden: x.hidden, headerRow: 1, enabled: true }));
      setTabs(found);
      await api.put("/jv/admin/config", {
        provider: "public_link", spreadsheetId: link,
        tabs: found.map(({ gid, title, enabled, headerRow }) => ({ gid, title, enabled, headerRow })),
        autoSync: auto, allowEmployeeRefresh: allowRefresh, allowEmployeeExport: allowExport,
      });
      const r = await api.post("/jv/sync");
      clearCache("/jv/");
      toast.success(`Fetched ${fmtNum(r.data.totals.rows)} records from “${data.title || "your sheet"}”`, { id: t });
      navigate("/jv/listings");
    } catch (e) {
      toast.dismiss(t);
      setTestMsg({ ok: false, text: apiError(e, "Could not read the sheet.") });
    } finally { setTesting(false); }
  };

  const save = async (thenSync) => {
    if (!tabs.some((t) => t.enabled)) return toast.error("Test the connection and enable at least one worksheet.");
    setSaving(true);
    try {
      const { data } = await api.put("/jv/admin/config", {
        ...payloadBase(), tabs: tabs.map(({ gid, title, enabled, headerRow }) => ({ gid, title, enabled, headerRow })),
        autoSync: auto, allowEmployeeRefresh: allowRefresh, allowEmployeeExport: allowExport,
      });
      setSecret(""); hydrate(data.config); clearCache("/jv/");
      toast.success("Settings saved");
      if (thenSync) {
        const t = toast.loading("Synchronising from Google Sheets…");
        try { const r = await api.post("/jv/sync"); toast.success(`Synced ${fmtNum(r.data.totals.rows)} records`, { id: t }); }
        catch (e) { toast.error(apiError(e, "Sync failed."), { id: t, duration: 7000 }); }
        clearCache("/jv/");
      }
      await load();
    } catch (e) { toast.error(apiError(e, "Could not save settings.")); }
    finally { setSaving(false); }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect the Google Sheet and delete the cached JV data from the CRM?\n\nThe Google Sheet itself is not touched.")) return;
    try { await api.delete("/jv/admin/config"); clearCache("/jv/"); toast.success("Disconnected"); setTabs([]); setTestMsg(null); await load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (err) return <div className="p-6"><div className="max-w-xl p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[13px]">{err} <button onClick={load} className="underline font-semibold ml-2">Retry</button></div></div>;
  if (!cfg) return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const synced = cfg.tabs.filter((t) => t.enabled && t.headers.length);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white dark:from-[#0D0F14] dark:to-[#0D0F14] px-4 sm:px-6 py-5">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">Sheet Settings</h1>
          <p className="text-[13px] text-slate-500">Connect the company JV Listing Google Sheet. Access is <b>read-only</b>; the sheet is never modified. <Link to="/jv/listings" className="text-blue-600 hover:underline">Go to JV Listings →</Link></p>
        </div>

        {cfg.configured && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl border text-[13px] ${cfg.lastStatus === "error" ? "bg-red-50 border-red-200 text-red-900" : cfg.lastStatus === "partial" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
            {cfg.lastStatus === "error" ? <XCircle className="w-4 h-4 mt-0.5" /> : cfg.lastStatus === "partial" ? <AlertTriangle className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
            <div className="flex-1">
              <p className="font-semibold">{cfg.spreadsheetTitle || "Connected"} {cfg.syncing && "· syncing…"}</p>
              <p className="opacity-90">Last successful sync: {cfg.lastSuccessAt ? `${timeAgo(cfg.lastSuccessAt)} (${fmtDateTime(cfg.lastSuccessAt)})` : "never"}{cfg.lastError ? ` — ${cfg.lastError.message}` : ""}</p>
            </div>
          </div>
        )}

        <Card title="1 · Connection" subtitle="Choose how the CRM reads your Google Sheet.">
          <div className="grid md:grid-cols-3 gap-3 mb-5">
            {[["public_link", "Paste a link", "Easiest. Share the sheet as “Anyone with the link → Viewer”, paste the link, and the data is fetched. No keys or scripts."],
              ["service_account", "Google service account", "Most private. Share the sheet (Viewer) with a robot e-mail. Needs a Google Cloud key on the server."],
              ["apps_script", "Apps Script Web App", "Private. A small read-only script owned by your Google account."]].map(([v, t, d]) => (
              <label key={v} className={`cursor-pointer p-3.5 rounded-xl border-2 transition ${provider === v ? "border-teal-500 bg-teal-50/60 dark:bg-teal-500/10" : "border-slate-200 dark:border-white/10 hover:border-slate-300"}`}>
                <input type="radio" name="prov" className="sr-only" checked={provider === v} onChange={() => { setProvider(v); setTestMsg(null); }} />
                <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">{t}{v === "public_link" && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-600 text-white align-middle">quickest</span>}</span>
                <span className="block text-[12px] text-slate-500 mt-0.5">{d}</span>
              </label>
            ))}
          </div>

          {provider === "public_link" && (
            <div className="mb-4 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[12.5px] text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">How it works</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>In Google Sheets click <b>Share</b> → <b>General access</b> → <b>Anyone with the link</b> → role <b>Viewer</b>.</li>
                <li>Copy the sheet's address and paste it below. The CRM reads every worksheet and opens JV Listings.</li>
              </ol>
              <p className="mt-2 flex items-start gap-1.5 text-amber-800 dark:text-amber-300"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />Anyone who has the link can open the sheet (it is read-only and unlisted). The sheet contains contact details, so don't share the link publicly — or use one of the private options.</p>
            </div>
          )}

          {provider === "service_account" && (
            creds?.configured ? (
              <div className="mb-4 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[12.5px] text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 mb-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Server credentials are configured</p>
                In Google Sheets choose <b>Share</b> and add this e-mail as a <b>Viewer</b>:
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-[12px] break-all">{creds.serviceAccountEmail}</code>
                  <button onClick={copyEmail} className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600" title="Copy">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}</button>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px]">
                <p className="flex items-center gap-1.5 font-semibold mb-1"><KeyRound className="w-4 h-4" /> Server credentials are not configured</p>
                The server needs a Google service-account key in its environment (<code>GOOGLE_SERVICE_ACCOUNT_JSON_BASE64</code>, or <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> + <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code>). Secrets are never entered in this screen — see <code>docs/GOOGLE_SETUP.md</code>.
              </div>
            )
          )}

          <div className="space-y-4">
            <div>
              <label className={label}>Google Sheet URL or ID {provider === "apps_script" && <span className="font-normal text-slate-400">(optional)</span>}</label>
              <input className={input} value={sheet} placeholder="https://docs.google.com/spreadsheets/d/…"
                onChange={(e) => {
                  const v = e.target.value;
                  setSheet(v);
                  // Pasting a full Google Sheets link on first setup connects and fetches immediately.
                  const pasted = ["insertFromPaste", "insertFromDrop"].includes(e.nativeEvent?.inputType);
                  if (pasted && provider === "public_link" && !cfg.configured && !testing && /\/spreadsheets\/d\/[\w-]{15,}/.test(v)) connectAndFetch(v);
                }} />
            </div>
            {provider === "apps_script" && (
              <>
                <div><label className={label}>Apps Script Web App URL</label><input className={input} value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" /></div>
                <div><label className={label}>Shared secret {cfg.appsScriptSecretSet && <span className="font-normal text-emerald-600">· saved (leave blank to keep)</span>}</label>
                  <input className={input} type="password" autoComplete="new-password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={cfg.appsScriptSecretSet ? "••••••••" : "Same value as SECRET in the script"} /></div>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {provider === "public_link" && (
              <button onClick={() => connectAndFetch()} disabled={testing} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 text-white text-[13px] font-semibold disabled:opacity-50">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Connect &amp; fetch data
              </button>
            )}
            <button onClick={testConnection} disabled={testing} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-transparent text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 disabled:opacity-50">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />} Test connection
            </button>
            {testMsg && <span className={`text-[13px] flex items-start gap-1.5 ${testMsg.ok ? "text-emerald-700" : "text-red-700"}`}>{testMsg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}{testMsg.text}</span>}
          </div>
        </Card>

        <Card title="2 · Worksheets" subtitle="Choose which tabs employees can see. Each tab keeps its own columns. New tabs found later stay hidden until you enable them.">
          {tabs.length === 0 ? <p className="text-[13px] text-slate-400">Test the connection to list the worksheets.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {tabs.map((t, i) => (
                <li key={t.key} className="flex flex-wrap items-center gap-3 py-3">
                  <input type="checkbox" className="w-4 h-4 accent-teal-600" checked={t.enabled} onChange={(e) => setTabs((x) => x.map((y, j) => (j === i ? { ...y, enabled: e.target.checked } : y)))} />
                  <span className="flex-1 min-w-[140px] text-[14px] font-medium text-slate-800 dark:text-slate-100">{t.title}{t.hidden && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">hidden in Sheets</span>}</span>
                  <label className="text-[12px] text-slate-500 flex items-center gap-1.5">Header row
                    <input type="number" min={1} max={50} value={t.headerRow} onChange={(e) => setTabs((x) => x.map((y, j) => (j === i ? { ...y, headerRow: Math.max(1, Math.min(50, Number(e.target.value) || 1)) } : y)))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-transparent text-[13px]" />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="3 · Synchronisation & access">
          <div className="space-y-4">
            <Toggle checked={auto.enabled} onChange={(v) => setAuto((a) => ({ ...a, enabled: v }))} hint="The CRM keeps a cached copy and refreshes it automatically so searching is fast and Google's quota is respected.">Refresh automatically</Toggle>
            {auto.enabled && (
              <label className="flex items-center gap-2 text-[13px] text-slate-600 ml-7">Every
                <select value={auto.intervalMinutes} onChange={(e) => setAuto((a) => ({ ...a, intervalMinutes: Number(e.target.value) }))} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-transparent text-[13px]">
                  {[5, 10, 15, 30, 60, 180, 360, 1440].map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}</option>)}
                </select>
              </label>
            )}
            <Toggle checked={allowRefresh} onChange={setAllowRefresh} hint="Employees can press Refresh (limited to once every 30 seconds).">Let employees refresh data</Toggle>
            <Toggle checked={allowExport} onChange={setAllowExport} hint="Employees can download the filtered list as CSV. Exports are recorded in the access audit log.">Let employees export CSV</Toggle>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 text-white text-[13px] font-semibold disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Save &amp; sync now
            </button>
            <button onClick={() => save(false)} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-[13px] font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"><Save className="w-4 h-4" /> Save only</button>
          </div>
        </Card>

        {synced.length > 0 && (
          <Card title="4 · Column mapping" subtitle="Used for dashboard statistics and mobile cards. Detected from your real headers — correct anything that's wrong. All columns remain searchable regardless.">
            <div className="space-y-3">{synced.map((t) => <RoleMapping key={t.key} tab={t} roleKeys={roleKeys} onSaved={load} />)}</div>
          </Card>
        )}

        <Card title="Sync history" subtitle="Last 10 attempts (kept for 90 days).">
          {logs.length === 0 ? <p className="text-[13px] text-slate-400">No syncs yet.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-2 pr-3">When</th><th className="pr-3">Result</th><th className="pr-3">Trigger</th><th className="pr-3">Rows</th><th>Details</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {logs.map((l) => (
                  <tr key={l._id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{fmtDateTime(l.startedAt)}</td>
                    <td className={`pr-3 font-semibold capitalize ${l.status === "success" ? "text-emerald-600" : l.status === "partial" ? "text-amber-600" : "text-red-600"}`}>{l.status}</td>
                    <td className="pr-3 text-slate-500 capitalize">{l.trigger}{l.by ? ` · ${l.by}` : ""}</td>
                    <td className="pr-3 tabular-nums">{fmtNum(l.totals.rows)}{l.totals.added ? ` (+${l.totals.added}` : ""}{l.totals.removed ? ` −${l.totals.removed}` : ""}{l.totals.added ? ")" : ""}</td>
                    <td className="text-slate-500">{l.errorMessage || l.tabs.filter((t) => t.error).map((t) => `${t.title}: ${t.error}`).join("; ") || `${(l.durationMs / 1000).toFixed(1)}s`}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </Card>

        {cfg.configured && (
          <Card title="Danger zone">
            <p className="text-[13px] text-slate-500 mb-3">Disconnecting removes the saved settings and the cached copy of the JV data from this CRM. Your Google Sheet is not changed.</p>
            <button onClick={disconnect} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-[13px] font-semibold"><Trash2 className="w-4 h-4" /> Disconnect sheet</button>
          </Card>
        )}
        <p className="text-[11.5px] text-slate-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Setup steps: <code>docs/GOOGLE_SETUP.md</code></p>
      </div>
    </div>
  );
}
