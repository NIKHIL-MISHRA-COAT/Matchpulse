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
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
      <h2 className="text-lg font-semibold">{t.catchupTitle}</h2>
      <p className="mt-1 text-sm text-slate-400">{t.catchupHint}</p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={run}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 disabled:opacity-60"
      >
        {loading ? t.thinking : t.catchupBtn}
      </motion.button>

      <AnimatePresence>
        {text && (
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 leading-relaxed"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
