// In local dev, VITE_API_BASE is empty and Vite's proxy forwards /api to localhost:8000.
// In production, set VITE_API_BASE to your backend URL.
const BASE = import.meta.env.VITE_API_BASE ?? "";

const json = (r) => {
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
};

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(json);

export const getMatch = () => fetch(`${BASE}/api/match`).then(json);
export const advance = () => post("/api/advance");
export const reset = () => post("/api/reset");
export const explain = (index, lang) => post("/api/explain", { index, lang });
export const ask = (question, lang) => post("/api/ask", { question, lang });
export const catchup = (lang) => fetch(`${BASE}/api/catchup?lang=${lang}`).then(json);