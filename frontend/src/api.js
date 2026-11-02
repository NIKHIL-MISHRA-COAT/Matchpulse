const json = (r) => {
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
};

const post = (path, body) =>
  fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(json);

export const getMatch = () => fetch("/api/match").then(json);
export const advance = () => post("/api/advance");
export const explain = (index, lang) => post("/api/explain", { index, lang });
export const ask = (question, lang) => post("/api/ask", { question, lang });
export const catchup = (lang) => fetch(`/api/catchup?lang=${lang}`).then(json);
