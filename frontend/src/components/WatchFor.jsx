import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { notices } from "../api";

export default function WatchFor({ lang, t, ballKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await notices(lang);
      setItems(r.items);
    } catch {
      setItems([t.error]);
    } finally {
      setLoading(false);
    }
  }

  // Refresh whenever the language or the ball changes.
  useEffect(() => {
    load();
  }, [lang, ballKey]);

  return (
    <div className="border-2 border-lime p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl uppercase leading-none text-lime">{t.watchTitle}</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          {loading ? t.thinking : t.watchLive}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/60">{t.watchHint}</p>

      <ul className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.li
              key={`${ballKey}-${i}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border-l-4 border-alert bg-white/5 px-4 py-2 text-sm leading-relaxed"
            >
              {item}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}