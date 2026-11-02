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
      <div className="mb-4 flex flex-wrap gap-2">
        {t.suggestions.map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.95 }}
            onClick={() => send(s)}
            className="border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wide hover:border-lime hover:text-lime"
          >
            {s}
          </motion.button>
        ))}
      </div>

      <div className="flex min-h-40 flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] px-4 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "self-end bg-lime font-semibold text-ink" : "self-start border-l-4 border-alert bg-white/5"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {pending && <div className="self-start px-4 py-2 font-display text-lime">…</div>}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={t.askPlaceholder}
          className="flex-1 border-b-2 border-lime bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-white/40"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => send(input)}
          className="bg-alert px-5 font-display text-lg uppercase tracking-wide text-white"
        >
          {t.send}
        </motion.button>
      </div>
    </div>
  );
}