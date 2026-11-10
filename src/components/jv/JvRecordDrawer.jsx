import { useEffect, useState } from "react";
import { X, Copy, Phone, Mail, ExternalLink, Loader2, AlertCircle, Check } from "lucide-react";
import api from "../../data/axiosConfig";
import { apiError, cellHref, fmtDateTime } from "../../pages/jv/jvUtils";

export default function JvRecordDrawer({ id, onClose }) {
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let live = true;
    api.get(`/jv/records/${id}`)
      .then((r) => live && setRec(r.data.record))
      .catch((e) => live && setErr(apiError(e, "Could not load this record.")));
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200); } catch { /* clipboard unavailable */ }
  };

  const fields = rec ? rec.fields.filter((f) => showEmpty || f.value) : [];
  const roles = rec?.roles || {};
  const title = rec ? (rec.fields[roles.name]?.value || rec.fields[roles.project]?.value || rec.fields.find((f) => f.value)?.value || `Row ${rec.rowNumber}`) : "";
  const sub = rec ? [rec.fields[roles.project]?.value, rec.fields[roles.location]?.value].filter(Boolean).join(" · ") : "";

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Record details">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative w-full sm:max-w-md h-full bg-white dark:bg-[#13161E] shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">{rec?.tab?.title || "JV record"}</p>
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white truncate">{title || "Loading…"}</h2>
            {sub && <p className="text-[12px] text-slate-500 truncate">{sub}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!rec && !err && <div className="flex justify-center py-16 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
          {err && <div className="flex gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-[13px]"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{err}</div>}
          {rec && (
            <>
              <dl className="space-y-3.5">
                {fields.map((f) => {
                  const href = cellHref(f.kind, f.value);
                  return (
                    <div key={f.index} className="group">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{f.name}</dt>
                      <dd className="mt-0.5 flex items-start gap-2">
                        <span className={`text-[14px] break-words min-w-0 flex-1 whitespace-pre-wrap ${f.value ? "text-slate-800 dark:text-slate-100" : "text-slate-300 italic"}`}>
                          {f.value || "empty"}
                        </span>
                        {f.value && (
                          <span className="flex items-center gap-1 opacity-60 group-hover:opacity-100 shrink-0">
                            {href && (
                              <a href={href} target={f.kind === "url" ? "_blank" : undefined} rel="noopener noreferrer" className="p-1 rounded hover:bg-teal-50 text-teal-600" title="Open">
                                {f.kind === "phone" ? <Phone className="w-3.5 h-3.5" /> : f.kind === "email" ? <Mail className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                              </a>
                            )}
                            <button onClick={() => copy(f.value, f.index)} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Copy">
                              {copied === f.index ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {rec.fields.some((f) => !f.value) && (
                <button onClick={() => setShowEmpty((v) => !v)} className="mt-5 text-[12px] font-medium text-blue-600 hover:underline">
                  {showEmpty ? "Hide empty fields" : `Show ${rec.fields.filter((f) => !f.value).length} empty fields`}
                </button>
              )}
            </>
          )}
        </div>

        {rec && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>Sheet row {rec.rowNumber}</span>
            <span>Synced {fmtDateTime(rec.syncedAt)}</span>
            {rec.firstSeenAt && <span>First seen {fmtDateTime(rec.firstSeenAt)}</span>}
            <span className="w-full">Read-only view of Google Sheet data. Edit the source sheet to change a record.</span>
          </div>
        )}
      </aside>
    </div>
  );
}
