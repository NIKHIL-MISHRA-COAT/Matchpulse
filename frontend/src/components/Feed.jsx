import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { explain } from "../api";

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-emerald-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export default function Feed({ events, lang, t }) {
  const [sel, setSel] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function open(ev) {
    setSel(ev);
    setText("");
    setLoading(true);
    try {
      const r = await explain(ev.id, lang);
      setText(r.text);
    } catch {
      setText(t.error);
    } finally {
      setLoading(false);
    }
  }

  const tone = (e) =>
    e.wicket
      ? "bg-rose-500/15 ring-rose-400/40"
      : e.runs >= 4
      ? "bg-amber-400/10 ring-amber-300/30"
      : "bg-white/5 ring-white/10";

  return (
    <>
      <p className="mb-3 text-sm text-slate-400">{t.feedHint}</p>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => open(e)}
                className={`w-full rounded-2xl p-3 text-left ring-1 ${tone(e)}`}
              >
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {e.over} • {e.bowler}
                  </span>
                  <span className="font-bold text-slate-200">{e.wicket ? "W" : e.runs}</span>
                </div>
                <p className="mt-1 text-sm">{e.commentary}</p>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {sel && (
          <motion.div
            className="fixed inset-0 z-20 flex items-end bg-black/60"
            onClick={() => setSel(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-md rounded-t-3xl bg-slate-900 p-6 ring-1 ring-white/10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <p className="text-xs uppercase tracking-widest text-slate-400">
                {t.explainTitle} • {sel.over}
              </p>
              <p className="mt-2 text-sm italic text-slate-300">{sel.commentary}</p>
              <div className="mt-4 min-h-16 text-base leading-relaxed">{loading ? <Dots /> : text}</div>
              <button
                onClick={() => setSel(null)}
                className="mt-6 w-full rounded-xl bg-white/10 py-2"
              >
                {t.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
