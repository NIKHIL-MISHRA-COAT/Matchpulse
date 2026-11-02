import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ask } from "../api";

export default function Ask({ lang, t }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send(text) {
    const q = text.trim();
    if (!q || pending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setPending(true);
    try {
      const res = await ask(q, lang);
      setMessages((m) => [...m, { role: "bot", text: res.text }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: t.error }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {t.suggestions.map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.95 }}
            onClick={() => send(s)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/10"
          >
            {s}
          </motion.button>
        ))}
      </div>

      <div className="flex min-h-40 flex-col gap-2">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end bg-emerald-500 text-slate-950"
                  : "self-start bg-white/10"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {pending && (
          <div className="self-start rounded-2xl bg-white/10 px-4 py-2 text-sm text-slate-400">…</div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={t.askPlaceholder}
          className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-emerald-400"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => send(input)}
          className="rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
        >
          {t.send}
        </motion.button>
      </div>
    </div>
  );
}
