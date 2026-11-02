import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { explain } from "../api";

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 bg-lime"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function chip(e) {
  if (e.wicket) return "bg-alert text-white";
  if (e.runs === 6) return "bg-lime text-ink";
  if (e.runs === 4) return "bg-white text-ink";
  return "bg-white/10 text-white";
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

  return (
    <>
      <p className="mb-3 text-sm text-white/60">{t.feedHint}</p>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => open(e)}
                className="flex w-full items-stretch gap-3 bg-white/5 p-3 text-left"
              >
                <div className={`flex w-14 shrink-0 items-center justify-center font-display text-3xl ${chip(e)}`}>
                  {e.wicket ? "W" : e.runs}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-white/50">
                    {e.over} • {e.bowler}
                  </div>
                  <p className="mt-1 text-sm leading-snug">{e.commentary}</p>
                </div>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {sel && (
          <motion.div
            className="fixed inset-0 z-20 flex items-end bg-black/70"
            onClick={() => setSel(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-md border-t-4 border-lime bg-ink p-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <p className="font-display text-2xl uppercase text-lime">
                {t.explainTitle} • {sel.over}
              </p>
              <p className="mt-2 text-sm italic text-white/60">{sel.commentary}</p>
              <div className="mt-4 min-h-16 text-base leading-relaxed">{loading ? <Dots /> : text}</div>
              <button
                onClick={() => setSel(null)}
                className="mt-6 w-full border-2 border-lime py-2 font-display text-lg uppercase tracking-wide text-lime"
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