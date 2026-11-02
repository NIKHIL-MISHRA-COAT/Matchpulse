import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { catchup } from "../api";

export default function CatchUp({ lang, t }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText("");
  }, [lang]);

  async function run() {
    setLoading(true);
    setText("");
    try {
      const r = await catchup(lang);
      setText(r.text);
    } catch {
      setText(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-2 border-lime p-5">
      <h2 className="font-display text-3xl uppercase leading-none text-lime">{t.catchupTitle}</h2>
      <p className="mt-2 text-sm text-white/60">{t.catchupHint}</p>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={run}
        disabled={loading}
        className="mt-4 w-full bg-lime py-3 font-display text-xl uppercase tracking-wide text-ink disabled:opacity-60"
      >
        {loading ? t.thinking : t.catchupBtn}
      </motion.button>

      <AnimatePresence>
        {text && (
          <motion.p
            key={text}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-4 border-l-4 border-alert pl-4 leading-relaxed"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}