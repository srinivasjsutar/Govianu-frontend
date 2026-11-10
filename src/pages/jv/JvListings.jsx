import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, RefreshCw, Download, Filter, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Columns3, Settings, AlertCircle, Loader2, Inbox, Database, Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { clearCache } from "../../data/axiosConfig";
import JvRecordDrawer from "../../components/jv/JvRecordDrawer";
import { useDebounce, timeAgo, fmtNum, apiError, cellHref } from "./jvUtils";

const PAGE_SIZES = [25, 50, 100];

// ── Popover that closes on outside click ─────────────────────────────────────
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

// ── Facet dropdown for one column (distinct values loaded lazily) ────────────
function FacetFilter({ tabKey, col, header, selected, onChange }) {
  const { open, setOpen, ref } = usePopover();
  const [values, setValues] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || values) return;
    api.get(`/jv/columns/${tabKey}/${col}/values`).then((r) => setValues(r.data.values)).catch(() => setValues([]));
  }, [open, values, tabKey, col]);

  const list = (values || []).filter((v) => v.value.toLowerCase().includes(search.toLowerCase()));
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition ${
          selected.length ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:bg-transparent dark:border-white/10 dark:text-slate-300"}`}
      >
        {header}{selected.length > 0 && <span className="px-1.5 rounded-full bg-teal-600 text-white text-[10px]">{selected.length}</span>}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white dark:bg-[#1A1D27] dark:border-white/10 shadow-xl p-2">
          {values === null ? <div className="py-6 flex justify-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
            <>
              {values.length > 8 && (
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search values…"
                  className="w-full mb-2 px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-200 dark:bg-transparent dark:border-white/10 focus:outline-none focus:border-teal-500" />
              )}
              <div className="max-h-56 overflow-y-auto">
                {list.length === 0 && <p className="text-[12px] text-slate-400 px-2 py-3">No values</p>}
                {list.map((v) => (
                  <label key={v.value} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-[13px]">
                    <input type="checkbox" checked={selected.includes(v.value)} onChange={() => toggle(v.value)} className="accent-teal-600" />
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{v.value}</span>
                    <span className="text-[11px] text-slate-400">{v.count}</span>
                  </label>
                ))}
              </div>
              {selected.length > 0 && <button onClick={() => onChange([])} className="mt-1 w-full text-[12px] text-slate-500 hover:text-red-600 py-1">Clear</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── "Add text filter on any column" ──────────────────────────────────────────
function TextFilterAdder({ headers, onAdd }) {
  const { open, setOpen, ref } = usePopover();
  const [col, setCol] = useState(0);
  const [value, setValue] = useState("");
  const [op, setOp] = useState("contains");
  const submit = () => {
    if (op === "contains" && !value.trim()) return;
    onAdd(op === "contains" ? { col: Number(col), op, value: value.trim() } : { col: Number(col), op });
    setValue(""); setOpen(false);
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-[12px] font-medium text-slate-500 hover:text-teal-700 hover:border-teal-500 dark:border-white/20">
        <Plus className="w-3 h-3" /> Column filter
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white dark:bg-[#1A1D27] dark:border-white/10 shadow-xl p-3 space-y-2">
          <select value={col} onChange={(e) => setCol(e.target.value)} className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-slate-200 dark:bg-transparent dark:border-white/10">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
          <select value={op} onChange={(e) => setOp(e.target.value)} className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-slate-200 dark:bg-transparent dark:border-white/10">
            <option value="contains">contains…</option><option value="notEmpty">is not empty</option><option value="empty">is empty</option>
          </select>
          {op === "contains" && (
            <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Text to match"
              className="w-full px-2.5 py-1.5 text-[13px] rounded-lg border border-slate-200 dark:bg-transparent dark:border-white/10 focus:outline-none focus:border-teal-500" />
          )}
          <button onClick={submit} className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold">Apply</button>
        </div>
      )}
    </div>
  );
}

function Cell({ kind, value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const href = cellHref(kind, value);
  if (href) {
    return (
      <a href={href} onClick={(e) => e.stopPropagation()} target={kind === "url" ? "_blank" : undefined} rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {value}
      </a>
    );
  }
  return <span title={value.length > 40 ? value : undefined}>{value}</span>;
}

export default function JvListings() {
  const [sp, setSp] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const tabKey = sp.get("tab") || "";
  const [qInput, setQInput] = useState(sp.get("q") || "");
  const q = useDebounce(qInput, 350);
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [hiddenCols, setHiddenCols] = useState(null);   // Set of column indexes, null = not yet initialised
  const [openId, setOpenId] = useState(null);
  const colsPop = usePopover();
  const reqId = useRef(0);

  // ── status (tabs, permissions, last sync) ──────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const { data: s } = await api.get("/jv/status");
      setStatus(s); setStatusErr("");
      return s;
    } catch (e) { setStatusErr(apiError(e, "Could not load JV Listings.")); return null; }
  }, []);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const [reloadTick, setReloadTick] = useState(0);

  // keep polling while another refresh is running
  useEffect(() => {
    if (!status?.syncing) return;
    const t = setInterval(async () => {
      const s = await loadStatus();
      if (s && !s.syncing) { clearCache("/jv/"); setReloadTick((n) => n + 1); }
    }, 4000);
    return () => clearInterval(t);
  }, [status?.syncing, loadStatus]);

  const activeTab = useMemo(() => {
    if (!status?.tabs?.length) return null;
    return status.tabs.find((t) => t.key === tabKey) || status.tabs[0];
  }, [status, tabKey]);

  // reset per-tab view state when the worksheet changes
  useEffect(() => { setFilters([]); setSort({ col: null, dir: "asc" }); setPage(1); setHiddenCols(null); }, [activeTab?.key]);
  useEffect(() => { setPage(1); }, [q, filters, sort, limit]);

  // ── records ────────────────────────────────────────────────────────────────
  const params = useMemo(() => {
    const p = { tab: activeTab?.key, page, limit };
    if (q.trim()) p.q = q.trim();
    if (filters.length) p.filters = JSON.stringify(filters);
    if (sort.col !== null) { p.sort = `col:${sort.col}`; p.dir = sort.dir; }
    return p;
  }, [activeTab?.key, page, limit, q, filters, sort]);

  useEffect(() => {
    if (!activeTab) return;
    const id = ++reqId.current;
    setLoading(true);
    api.get("/jv/records", { params })
      .then((r) => { if (id === reqId.current) { setData(r.data); setError(""); } })
      .catch((e) => { if (id === reqId.current) setError(apiError(e, "Could not load records.")); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [params, activeTab, reloadTick]);

  // choose sensible default columns once headers are known
  useEffect(() => {
    if (!data?.tab || hiddenCols !== null) return;
    const n = data.tab.headers.length;
    if (n <= 8) { setHiddenCols(new Set()); return; }
    const keep = new Set(Object.values(data.tab.roles || {}).filter((v) => Number.isInteger(v)));
    for (let i = 0; keep.size < 7 && i < n; i++) keep.add(i);
    setHiddenCols(new Set([...Array(n).keys()].filter((i) => !keep.has(i))));
  }, [data, hiddenCols]);

  const headers = data?.tab?.headers || [];
  const kinds = useMemo(() => Object.fromEntries((data?.tab?.columns || []).map((c) => [c.index, c.kind])), [data]);
  const filterable = (data?.tab?.columns || []).filter((c) => c.filterable);
  const visible = headers.map((_, i) => i).filter((i) => !hiddenCols?.has(i));
  const roles = data?.tab?.roles || {};

  const setFacet = (col, values) =>
    setFilters((f) => [...f.filter((x) => !(x.col === col && x.op === "in")), ...(values.length ? [{ col, op: "in", values }] : [])]);
  const selectedFor = (col) => filters.find((x) => x.col === col && x.op === "in")?.values || [];
  const describe = (f) =>
    f.op === "in" ? `${headers[f.col]}: ${f.values.join(", ")}` :
    f.op === "contains" ? `${headers[f.col]} contains “${f.value}”` :
    f.op === "empty" ? `${headers[f.col]} is empty` : `${headers[f.col]} is not empty`;

  const clickSort = (col) =>
    setSort((s) => (s.col !== col ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : { col: null, dir: "asc" }));

  const refresh = async () => {
    setSyncing(true);
    const t = toast.loading("Refreshing from Google Sheets…");
    try {
      const { data: r } = await api.post("/jv/sync");
      toast.success(r.warning || `Updated — ${fmtNum(r.totals.rows)} records`, { id: t });
    } catch (e) {
      toast.error(apiError(e, "Refresh failed."), { id: t, duration: 6000 });
    } finally {
      clearCache("/jv/");
      await loadStatus();
      setReloadTick((n) => n + 1);
      setSyncing(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const exportParams = { ...params };
      delete exportParams.page; delete exportParams.limit;
      const res = await api.get("/jv/export", { params: exportParams, responseType: "blob" });
      const cd = res.headers["content-disposition"] || "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] || "govianu-jv-export.csv";
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${fmtNum(data?.filteredTotal)} record${data?.filteredTotal === 1 ? "" : "s"}`);
    } catch (e) {
      let msg = apiError(e, "Export failed.");
      if (e?.response?.data instanceof Blob) { try { msg = JSON.parse(await e.response.data.text()).message || msg; } catch { /* keep msg */ } }
      toast.error(msg);
    } finally { setExporting(false); }
  };

  const selectTab = (key) => { const n = new URLSearchParams(sp); n.set("tab", key); setSp(n, { replace: true }); };

  // ── top-level states ───────────────────────────────────────────────────────
  if (statusErr) {
    return <Shell><Banner tone="red" icon={AlertCircle} title="Couldn't load JV Listings" body={statusErr} action={<button onClick={loadStatus} className="btn-sm">Try again</button>} /></Shell>;
  }
  if (!status) return <Shell><div className="flex justify-center py-24 text-slate-400"><Loader2 className="w-7 h-7 animate-spin" /></div></Shell>;
  if (!status.configured || !status.tabs.length) {
    return (
      <Shell>
        <EmptyCard icon={Database} title="JV Listings isn't connected yet"
          body={status.canManage ? "Connect your company's JV Listing Google Sheet to start searching records here." : "Your administrator hasn't connected the JV Listing Google Sheet yet. Please check back soon."}
          action={status.canManage && <Link to="/jv/settings" className="btn-primary"><Settings className="w-4 h-4" /> Open Sheet Settings</Link>} />
      </Shell>
    );
  }

  const total = data?.total ?? activeTab.rowCount;
  const from = data && data.filteredTotal ? (data.page - 1) * data.limit + 1 : 0;
  const to = data ? Math.min(data.page * data.limit, data.filteredTotal) : 0;
  const hasCriteria = !!q.trim() || filters.length > 0;

  return (
    <Shell
      right={
        <>
          <span className="hidden sm:inline text-[12px] text-slate-500">
            {status.syncing || syncing ? "Refreshing…" : `Synced ${timeAgo(status.lastSuccessAt || status.lastSyncAt)}`}
          </span>
          {status.permissions.canRefresh && (
            <button onClick={refresh} disabled={syncing || status.syncing} className="btn-outline" title="Pull the latest data from Google Sheets">
              <RefreshCw className={`w-4 h-4 ${syncing || status.syncing ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
          {status.permissions.canExport && (
            <button onClick={exportCsv} disabled={exporting || !data?.filteredTotal} className="btn-primary" title="Download the current search & filters as CSV (opens in Excel)">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
            </button>
          )}
        </>
      }
    >
      <style>{`
        .btn-primary{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .9rem;border-radius:.65rem;background:linear-gradient(135deg,#1d4ed8,#0d9488);color:#fff;font-size:13px;font-weight:600;transition:opacity .15s}
        .btn-primary:hover:not(:disabled){opacity:.92}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-outline{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .9rem;border-radius:.65rem;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:13px;font-weight:600}
        .btn-outline:hover:not(:disabled){border-color:#0d9488;color:#0f766e}.btn-outline:disabled{opacity:.5;cursor:not-allowed}
        .dark .btn-outline{background:transparent;border-color:rgba(255,255,255,.15);color:#e2e8f0}
        .btn-sm{padding:.35rem .75rem;border-radius:.5rem;background:#fff;border:1px solid #cbd5e1;font-size:12px;font-weight:600}
      `}</style>

      {(status.lastStatus === "error" || status.lastStatus === "partial") && status.lastError && (
        <Banner tone="amber" icon={AlertCircle} title={status.lastStatus === "partial" ? "Some worksheets couldn't be refreshed" : "Latest refresh from Google Sheets failed"}
          body={`${status.lastError.message} Showing data last synchronised ${timeAgo(status.lastSuccessAt)}.`}
          action={status.canManage && <Link to="/jv/settings" className="btn-sm">Fix in settings</Link>} />
      )}

      {/* Worksheet tabs */}
      {status.tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1 mb-3">
          {status.tabs.map((t) => (
            <button key={t.key} onClick={() => selectTab(t.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition ${t.key === activeTab.key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-transparent dark:text-slate-300 dark:border-white/10"}`}>
              {t.title} <span className="opacity-60 font-medium ml-1">{fmtNum(t.rowCount)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search name, phone, email, location, project and any other column…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 dark:bg-transparent dark:text-white text-[14px] placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15" />
            {qInput && <button onClick={() => setQInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label="Clear search"><X className="w-4 h-4" /></button>}
          </div>
          <div className="relative" ref={colsPop.ref}>
            <button onClick={() => colsPop.setOpen(!colsPop.open)} className="btn-outline w-full lg:w-auto justify-center"><Columns3 className="w-4 h-4" /> Columns</button>
            {colsPop.open && (
              <div className="absolute right-0 z-30 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:bg-[#1A1D27] dark:border-white/10 shadow-xl p-2">
                {headers.map((h, i) => (
                  <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-[13px] text-slate-700 dark:text-slate-200">
                    <input type="checkbox" className="accent-teal-600" checked={!hiddenCols?.has(i)}
                      onChange={() => setHiddenCols((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
                    <span className="truncate">{h}</span>
                  </label>
                ))}
                <p className="text-[11px] text-slate-400 px-2 pt-2">Hidden columns are still searchable, exported and shown in record details.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-400 mr-1"><Filter className="w-3.5 h-3.5" /> Filters</span>
          {filterable.map((c) => (
            <FacetFilter key={`${activeTab.key}-${c.index}`} tabKey={activeTab.key} col={c.index} header={headers[c.index]} selected={selectedFor(c.index)} onChange={(v) => setFacet(c.index, v)} />
          ))}
          {headers.length > 0 && <TextFilterAdder headers={headers} onAdd={(f) => setFilters((x) => [...x, f])} />}
          {filterable.length === 0 && headers.length > 0 && <span className="text-[12px] text-slate-400">No dropdown filters for this sheet — use “Column filter”.</span>}
        </div>

        {filters.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {filters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-teal-50 text-teal-800 text-[12px] font-medium border border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30">
                <span className="max-w-[260px] truncate">{describe(f)}</span>
                <button onClick={() => setFilters((x) => x.filter((_, j) => j !== i))} className="p-0.5 rounded-full hover:bg-teal-200/60" aria-label="Remove filter"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={() => setFilters([])} className="text-[12px] text-slate-500 hover:text-red-600 px-2">Clear all</button>
          </div>
        ) : null}
      </div>

      {/* Counts */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-2 px-1">
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          {data ? (
            <>
              {data.filteredTotal ? <>Showing <b>{fmtNum(from)}–{fmtNum(to)}</b> of </> : null}
              <b>{fmtNum(data.filteredTotal)}</b> {hasCriteria ? "matching" : ""} record{data.filteredTotal === 1 ? "" : "s"}
              {hasCriteria && <span className="text-slate-400"> · {fmtNum(total)} total in “{activeTab.title}”</span>}
            </>
          ) : "Loading…"}
          {activeTab.truncated && <span className="ml-2 text-amber-600 text-[12px]">(sheet exceeds the row limit; showing the first rows)</span>}
        </p>
        <label className="text-[12px] text-slate-500 flex items-center gap-1.5">Rows
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="px-2 py-1 rounded-lg border border-slate-200 dark:bg-transparent dark:border-white/10 text-[12px]">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {error && <Banner tone="red" icon={AlertCircle} title="Couldn't load records" body={error} action={<button className="btn-sm" onClick={() => setReloadTick((n) => n + 1)}>Retry</button>} />}

      {/* Desktop table */}
      <div className="hidden md:block relative bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {loading && data && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-600 to-teal-500 animate-pulse z-10" />}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-white/[0.03] sticky top-0">
              <tr>
                <th className="w-12 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">#</th>
                {visible.map((i) => (
                  <th key={i} className="px-3 py-3 text-left whitespace-nowrap">
                    <button onClick={() => clickSort(i)} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-teal-700">
                      {headers[i]}
                      {sort.col === i ? (sort.dir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40" />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {!data && loading && Array.from({ length: 8 }).map((_, r) => (
                <tr key={r}><td colSpan={visible.length + 1} className="px-3 py-3"><div className="h-4 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td></tr>
              ))}
              {data?.records.map((r) => (
                <tr key={r._id} onClick={() => setOpenId(r._id)} className="hover:bg-teal-50/40 dark:hover:bg-white/[0.03] cursor-pointer transition-colors">
                  <td className="px-3 py-2.5 text-[11px] text-slate-400 tabular-nums">{r.rowNumber}</td>
                  {visible.map((i) => (
                    <td key={i} className="px-3 py-2.5 max-w-[280px] truncate text-slate-700 dark:text-slate-200"><Cell kind={kinds[i]} value={r.cells[i]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.records.length === 0 && (
          <EmptyInline hasCriteria={hasCriteria} onClear={() => { setQInput(""); setFilters([]); }} />
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {!data && loading && <div className="flex justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
        {data?.records.map((r) => {
          const title = r.cells[roles.name] || r.cells[roles.project] || r.cells.find(Boolean) || `Row ${r.rowNumber}`;
          const shown = visible.filter((i) => r.cells[i] && r.cells[i] !== title).slice(0, 4);
          return (
            <button key={r._id} onClick={() => setOpenId(r._id)} className="w-full text-left bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-sm active:bg-slate-50">
              <p className="font-semibold text-[14px] text-slate-900 dark:text-white truncate">{title}</p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                {shown.map((i) => (
                  <div key={i} className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-slate-400 truncate">{headers[i]}</dt><dd className="text-[12.5px] text-slate-700 dark:text-slate-200 truncate">{r.cells[i]}</dd></div>
                ))}
              </dl>
            </button>
          );
        })}
        {data && data.records.length === 0 && <EmptyInline hasCriteria={hasCriteria} onClear={() => { setQInput(""); setFilters([]); }} />}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline"><ChevronLeft className="w-4 h-4" /> Prev</button>
          <span className="text-[13px] text-slate-500">Page <b>{data.page}</b> of {fmtNum(data.totalPages)}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {openId && <JvRecordDrawer key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </Shell>
  );
}

function Shell({ children, right }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white dark:from-[#0D0F14] dark:to-[#0D0F14] px-4 sm:px-6 py-5">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">JV Listings</h1>
            <p className="text-[13px] text-slate-500">Joint-venture opportunities from the company Google Sheet — search, filter and export.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">{right}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Banner({ tone, icon: Icon, title, body, action }) {
  const c = tone === "red" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <div className={`flex flex-wrap items-start gap-3 p-3.5 rounded-xl border mb-4 ${c}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold">{title}</p><p className="text-[12.5px] opacity-90">{body}</p></div>
      {action}
    </div>
  );
}

function EmptyCard({ icon: Icon, title, body, action }) {
  return (
    <div className="max-w-lg mx-auto mt-16 text-center bg-white dark:bg-[#13161E] border border-slate-200 dark:border-white/10 rounded-3xl p-10 shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-teal-600 flex items-center justify-center mb-4"><Icon className="w-7 h-7" /></div>
      <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="text-[13.5px] text-slate-500 mt-1.5 mb-5">{body}</p>
      {action}
    </div>
  );
}

function EmptyInline({ hasCriteria, onClear }) {
  return (
    <div className="py-14 text-center">
      <Inbox className="w-9 h-9 mx-auto text-slate-300 mb-2" />
      <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">{hasCriteria ? "No records match your search" : "This worksheet has no records"}</p>
      {hasCriteria && <button onClick={onClear} className="mt-2 text-[13px] text-blue-600 hover:underline">Clear search and filters</button>}
    </div>
  );
}
