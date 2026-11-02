import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { advance, getMatch, reset } from "./api";
import { T } from "./i18n";
import Scoreboard from "./components/Scoreboard";
import CatchUp from "./components/CatchUp";
import Feed from "./components/Feed";
import Ask from "./components/Ask";
import Sidebar from "./components/Sidebar";
import WatchFor from "./components/WatchFor";

const TABS = ["catchup", "feed", "watch", "ask"];

function Ticker({ items }) {
  if (!items.length) return null;
  const line = items.map((e) => `${e.over}  ${e.commentary}`).join("   ◆   ");
  return (
    <div className="overflow-hidden bg-alert py-2 text-xs font-bold uppercase tracking-wider text-white">
      <motion.div
        className="flex w-max gap-16 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 35 }}
      >
        <span>{line}</span>
        <span>{line}</span>
      </motion.div>
    </div>
  );
}

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

  async function restart() {
    setPlaying(false);
    setTab("catchup");
    await load(reset);
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-2xl uppercase text-lime">
        {error ? T.en.error : T.en.loading}
      </div>
    );
  }

  const over = data.state.status !== "in_progress";

  return (
    <div className="min-h-screen pb-36">
      <Sidebar t={t} />
      <Ticker items={data.feed.slice(0, 6)} />

      <div className="mx-auto max-w-md px-4 pt-5">
        <motion.header
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-4 flex items-end justify-between gap-3"
        >
          <div>
            <h1 className="font-display text-4xl uppercase italic leading-none tracking-wide">
              Match<span className="text-lime">Pulse</span>
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50">{data.title}</p>
          </div>
          <div className="flex items-stretch gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={restart}
              className="border-2 border-alert px-3 text-xs font-bold uppercase tracking-wide text-alert"
            >
              ↻ {t.restart}
            </motion.button>
            <div className="flex border-2 border-lime text-xs font-bold">
              {["en", "hi"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 ${lang === l ? "bg-lime text-ink" : "text-lime"}`}
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>
          </div>
        </motion.header>

        <Scoreboard state={data.state} t={t} />

        <nav className="mt-5 grid grid-cols-4 gap-2">
          {TABS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative py-3 font-display text-lg uppercase tracking-wide ${
                tab === id ? "text-ink" : "text-white/50"
              }`}
            >
              {tab === id && (
                <motion.span
                  layoutId="tab"
                  className="absolute inset-0 -skew-x-12 bg-lime"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{t.tabs[id]}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.section
            key={tab + lang}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.18 }}
            className="mt-5"
          >
            {tab === "catchup" && <CatchUp lang={lang} t={t} />}
            {tab === "feed" && <Feed events={data.feed} lang={lang} t={t} />}
            {tab === "ask" && <Ask lang={lang} t={t} />}
            {tab === "watch" && <WatchFor lang={lang} t={t} ballKey={data.state.balls} />}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-lime bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3 p-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={over}
            className="flex-1 border-2 border-white/20 py-3 font-display text-lg uppercase tracking-wide disabled:opacity-30"
          >
            {playing ? t.pause : t.play}
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.94, skewX: -6 }}
            onClick={() => load(advance)}
            disabled={over}
            className="flex-[1.4] bg-lime py-3 font-display text-lg uppercase tracking-wide text-ink shadow-[6px_6px_0_#ff2d55] disabled:opacity-30"
          >
            {t.nextBall}
          </motion.button>
        </div>
      </div>
    </div>
  );
}