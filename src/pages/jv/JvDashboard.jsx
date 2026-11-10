import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Database, Layers, FolderKanban, MapPin, Sparkles, RefreshCw, Search, Settings, CheckCircle2,
  AlertTriangle, XCircle, Loader2, ArrowRight, Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { clearCache } from "../../data/axiosConfig";
import { BRAND } from "../../config/brand";
import { timeAgo, fmtNum, fmtDateTime, apiError } from "./jvUtils";

function Stat({ icon: Icon, label, value, hint, tone = "blue" }) {
  const tones = { blue: "from-blue-50 to-blue-100/60 text-blue-600", teal: "from-teal-50 to-teal-100/60 text-teal-600", slate: "from-slate-50 to-slate-100 text-slate-600", amber: "from-amber-50 to-amber-100/60 text-amber-600" };
  return (
    <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={`w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center ${tones[tone]}`}><Icon className="w-4 h-4" /></span>
      </div>
      <p className="mt-2 text-[28px] leading-8 font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11.5px] text-slate-400 truncate" title={hint}>{hint}</p>}
    </div>
  );
}

function Breakdown({ b, onPick }) {
  const max = Math.max(1, ...b.items.map((i) => i.count));
  return (
    <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">By {b.column}</h3>
        <span className="text-[11px] text-slate-400">{b.tabTitle}</span>
      </div>
      <ul className="space-y-2.5">
        {b.items.map((i) => (
          <li key={i.value}>
            <button onClick={() => onPick(b, i.value)} className="w-full text-left group">
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="truncate text-slate-700 dark:text-slate-200 group-hover:text-teal-700">{i.value}</span>
                <span className="text-slate-500 tabular-nums ml-2">{fmtNum(i.count)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      {(b.otherCount > 0 || b.emptyCount > 0) && (
        <p className="mt-3 text-[11.5px] text-slate-400">
          {b.otherCount > 0 && <>+ {fmtNum(b.otherCount)} in {fmtNum(Math.max(0, b.distinct - b.items.length))} other values</>}
          {b.otherCount > 0 && b.emptyCount > 0 && " · "}
          {b.emptyCount > 0 && <>{fmtNum(b.emptyCount)} blank</>}
        </p>
      )}
    </div>
  );
}

const statusIcon = { success: CheckCircle2, partial: AlertTriangle, error: XCircle };
const statusColor = { success: "text-emerald-600", partial: "text-amber-600", error: "text-red-600" };

export default function JvDashboard() {
  const nav = useNavigate();
  const [res, setRes] = useState(null);
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api.get("/jv/dashboard"), api.get("/jv/status")]);
      setRes(d.data); setStatus(s.data); setErr("");
    } catch (e) { setErr(apiError(e, "Could not load the dashboard.")); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setSyncing(true);
    const t = toast.loading("Refreshing from Google Sheets…");
    try { await api.post("/jv/sync"); toast.success("Data refreshed", { id: t }); }
    catch (e) { toast.error(apiError(e, "Refresh failed."), { id: t, duration: 6000 }); }
    finally { clearCache("/jv/"); await load(); setSyncing(false); }
  };

  const search = (e) => { e.preventDefault(); nav(`/jv/listings${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); };
  const pick = (b, value) => nav(`/jv/listings?tab=${b.tabKey}&q=${encodeURIComponent(value)}`);

  const d = res?.dashboard;
  const hello = user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white dark:from-[#0D0F14] dark:to-[#0D0F14] px-4 sm:px-6 py-5">
      <div className="max-w-[1300px] mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1F4B] via-[#12356F] to-[#0D6E6A] text-white p-6 sm:p-8 mb-6 shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute right-16 bottom-[-60px] w-44 h-44 rounded-full bg-teal-300/10" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-200">{BRAND.company}</p>
              <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight mt-1">{hello}</h1>
              <p className="text-[13.5px] text-blue-100/90 mt-1 max-w-xl">Your joint-venture listings, in one searchable place.</p>
            </div>
            <form onSubmit={search} className="relative w-full lg:w-[420px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, location, project…"
                className="w-full pl-10 pr-24 py-3 rounded-xl bg-white text-slate-900 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold">Search</button>
            </form>
          </div>
        </div>

        {err && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[13px] mb-4 flex items-center justify-between gap-3">{err}<button onClick={load} className="font-semibold underline">Retry</button></div>}
        {!res && !err && <div className="flex justify-center py-24 text-slate-400"><Loader2 className="w-7 h-7 animate-spin" /></div>}

        {res && !res.configured && (
          <div className="max-w-xl mx-auto text-center bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-3xl p-10 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-teal-600 flex items-center justify-center mb-4"><Database className="w-7 h-7" /></div>
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">Connect your JV Listing sheet</h2>
            <p className="text-[13.5px] text-slate-500 mt-1.5 mb-5">
              {res.canManage ? "Link the company Google Sheet to see live statistics and search every listing." : "An administrator needs to connect the JV Listing Google Sheet. Check back soon."}
            </p>
            {res.canManage && <Link to="/jv/settings" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 text-white text-[13px] font-semibold"><Settings className="w-4 h-4" /> Open Sheet Settings</Link>}
          </div>
        )}

        {d && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="text-[12.5px] text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {d.lastSuccessAt ? <>Last successful sync <b className="font-semibold text-slate-700 dark:text-slate-200">{timeAgo(d.lastSuccessAt)}</b> ({fmtDateTime(d.lastSuccessAt)})</> : "Not synchronised yet"}
                {d.spreadsheetTitle && <span className="hidden sm:inline"> · {d.spreadsheetTitle}</span>}
              </p>
              {status?.permissions?.canRefresh && (
                <button onClick={refresh} disabled={syncing} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white dark:bg-transparent dark:text-slate-200 dark:border-white/15 text-[13px] font-semibold text-slate-700 hover:border-teal-500 disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Refresh now
                </button>
              )}
            </div>

            {(d.lastStatus === "error" || d.lastStatus === "partial") && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] mb-4">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>The latest refresh from Google Sheets {d.lastStatus === "partial" ? "partly failed" : "failed"}. Figures below come from the last successful sync.
                  {res.canManage && <> <Link to="/jv/settings" className="font-semibold underline">Review settings</Link></>}</span>
              </div>
            )}

            {!d.hasData ? (
              <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-[13.5px] text-slate-500">
                No records yet. {res.canManage ? "Run a sync from Sheet Settings once the sheet is connected and shared." : "Data will appear after the first synchronisation."}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <Stat icon={Database} label="JV records" value={fmtNum(d.totals.records)} hint={`across ${d.totals.tabs} worksheet${d.totals.tabs === 1 ? "" : "s"}`} tone="blue" />
                  <Stat icon={Layers} label="Worksheets" value={fmtNum(d.totals.tabs)} hint={d.tabs.map((t) => t.title).join(", ")} tone="slate" />
                  {d.projects.available
                    ? <Stat icon={FolderKanban} label="Projects" value={fmtNum(d.projects.count)} hint={`distinct “${d.projects.columns[0].header}” values`} tone="teal" />
                    : <Stat icon={FolderKanban} label="Projects" value="—" hint="No project column mapped (see Sheet Settings)" tone="slate" />}
                  {d.locations.available
                    ? <Stat icon={MapPin} label="Locations" value={fmtNum(d.locations.count)} hint={`distinct “${d.locations.columns[0].header}” values`} tone="teal" />
                    : <Stat icon={MapPin} label="Locations" value="—" hint="No location column mapped (see Sheet Settings)" tone="slate" />}
                  <Stat icon={Sparkles} label={`New in ${d.recent.days} days`} value={fmtNum(d.recent.count)} hint="rows added or edited in the sheet" tone="amber" />
                </div>

                <div className="grid lg:grid-cols-3 gap-4 mt-4">
                  {d.breakdowns.map((b) => <Breakdown key={`${b.tabKey}-${b.column}`} b={b} onPick={pick} />)}
                  {d.breakdowns.length === 0 && (
                    <div className="lg:col-span-3 bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-[13px] text-slate-500">
                      No categorical column found to summarise. Map columns in Sheet Settings to see breakdowns.
                    </div>
                  )}
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Recently added or changed</h3>
                      <Link to="/jv/listings" className="text-[12px] text-blue-600 hover:underline inline-flex items-center gap-1">Open listings <ArrowRight className="w-3 h-3" /></Link>
                    </div>
                    {d.recent.items.length === 0 ? (
                      <p className="text-[13px] text-slate-400 py-6 text-center">No rows have been added or edited in the last {d.recent.days} days.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-white/5">
                        {d.recent.items.map((r) => (
                          <li key={r._id}>
                            <Link to={`/jv/listings?tab=${r.tab}&q=${encodeURIComponent(r.title)}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 -mx-2 px-2 rounded-lg">
                              <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[12px] font-bold shrink-0">{(r.title || "?").slice(0, 1).toUpperCase()}</span>
                              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</span><span className="block text-[11.5px] text-slate-400 truncate">{r.subtitle || r.tabTitle}</span></span>
                              <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(r.firstSeenAt)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[11px] text-slate-400 mt-3">Detected when the CRM syncs; the first import of a worksheet is treated as the baseline.</p>
                  </div>

                  <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-3">Recent synchronisation activity</h3>
                    {d.syncActivity.length === 0 ? <p className="text-[13px] text-slate-400 py-6 text-center">No syncs yet.</p> : (
                      <ul className="divide-y divide-slate-100 dark:divide-white/5">
                        {d.syncActivity.map((s) => {
                          const I = statusIcon[s.status] || CheckCircle2;
                          return (
                            <li key={s._id} className="flex items-center gap-3 py-2.5">
                              <I className={`w-4 h-4 shrink-0 ${statusColor[s.status]}`} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] text-slate-800 dark:text-slate-100 capitalize">{s.status}{s.by ? ` · ${s.by}` : ""}</span>
                                <span className="block text-[11.5px] text-slate-400">
                                  {fmtNum(s.rows)} rows{s.added ? ` · +${fmtNum(s.added)}` : ""}{s.removed ? ` · −${fmtNum(s.removed)}` : ""}{s.errorMessage ? ` · ${s.errorMessage}` : ""}
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-400 shrink-0" title={fmtDateTime(s.at)}>{timeAgo(s.at)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
