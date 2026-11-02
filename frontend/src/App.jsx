import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { advance, getMatch } from "./api";
import { T } from "./i18n";
import Scoreboard from "./components/Scoreboard";
import CatchUp from "./components/CatchUp";
import Feed from "./components/Feed";
import Ask from "./components/Ask";

const TABS = ["catchup", "feed", "ask"];

export default function App() {
  const [data, setData] = useState(null);
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState("catchup");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const t = T[lang];

  const load = useCallback(
    (fn) =>
      fn()
        .then((d) => {
          setData(d);
          setError(false);
        })
        .catch(() => setError(true)),
    []
  );

  useEffect(() => {
    load(getMatch);
  }, [load]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => load(advance), 2500);
    return () => clearInterval(id);
  }, [playing, load]);

  useEffect(() => {
    if (data && data.state.status !== "in_progress") setPlaying(false);
  }, [data]);

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-300">
        {error ? T.en.error : T.en.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-black tracking-tight">MatchPulse</h1>
          <p className="text-xs text-slate-400">{data.title}</p>
        </div>
        <div className="flex rounded-full bg-white/10 p-1 text-xs">
          {["en", "hi"].map((l) => (
            <button key={l} onClick={() => setLang(l)} className="relative rounded-full px-3 py-1">
              {lang === l && (
                <motion.span layoutId="lang" className="absolute inset-0 rounded-full bg-emerald-500" />
              )}
              <span className={`relative ${lang === l ? "font-semibold text-slate-950" : "text-slate-300"}`}>
                {l === "en" ? "EN" : "हिं"}
              </span>
            </button>
          ))}
        </div>
      </motion.header>

      <Scoreboard state={data.state} t={t} />

      <nav className="mt-5 grid grid-cols-3 border-b border-white/10">
        {TABS.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative py-3 text-sm ${tab === id ? "text-white" : "text-slate-400"}`}
          >
            {t.tabs[id]}
            {tab === id && (
              <motion.span layoutId="tab" className="absolute inset-x-4 -bottom-px h-0.5 rounded bg-emerald-400" />
            )}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={tab + lang}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="mt-5"
        >
          {tab === "catchup" && <CatchUp lang={lang} t={t} />}
          {tab === "feed" && <Feed events={data.feed} lang={lang} t={t} />}
          {tab === "ask" && <Ask lang={lang} t={t} />}
        </motion.section>
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2 p-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={data.state.status !== "in_progress"}
            className="flex-1 rounded-xl bg-white/10 py-2 text-sm disabled:opacity-40"
          >
            {playing ? t.pause : t.play}
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => load(advance)}
            disabled={data.state.status !== "in_progress"}
            className="flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {t.nextBall}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
