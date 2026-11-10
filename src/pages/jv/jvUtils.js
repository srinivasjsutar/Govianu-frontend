import { useEffect, useState } from "react";

export function useDebounce(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function timeAgo(date) {
  if (!date) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtNum = (n) => (Number.isFinite(n) ? n.toLocaleString() : "—");

export const apiError = (err, fallback = "Something went wrong.") =>
  err?.response?.data?.message || err?.message || fallback;

export const roleLabel = {
  name: "Name / Owner", phone: "Phone", email: "Email", project: "Project",
  location: "Location", status: "Status", date: "Date",
};

// Safe link for a cell, based on the column kind detected from real values.
export function cellHref(kind, value) {
  const v = String(value || "").trim();
  if (!v) return null;
  if (kind === "phone") return `tel:${v.replace(/[^\d+]/g, "")}`;
  if (kind === "email") return `mailto:${v}`;
  if (kind === "url" && /^https?:\/\//i.test(v)) return v;
  return null;
}
