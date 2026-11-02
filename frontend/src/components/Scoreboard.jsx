import { AnimatePresence, motion } from "framer-motion";

function Num({ value }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const PRESSURE_STYLE = {
  high: "bg-rose-500/20 text-rose-200",
  tightening: "bg-amber-400/20 text-amber-200",
  on_track: "bg-emerald-400/20 text-emerald-200",
  over: "bg-slate-500/30 text-slate-200",
};

export default function Scoreboard({ state: s, t }) {
  const stats = [
    [t.need, s.need],
    [t.rrr, s.rrr],
    [t.crr, s.crr],
  ];

  return (
    <motion.div
      layout
      className="rounded-3xl bg-gradient-to-br from-emerald-600/30 via-slate-900 to-slate-950 p-5 ring-1 ring-white/10"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>{s.batting_team}</span>
        <span>
          {t.target} {s.target}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-6xl font-black tabular-nums">
          <Num value={s.runs} />
        </span>
        <span className="pb-2 text-3xl font-bold text-slate-300">
          /<Num value={s.wickets} />
        </span>
        <span className="pb-3 text-sm text-slate-400">({s.overs} ov)</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map(([label, val]) => (
          <div key={label} className="rounded-2xl bg-white/5 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
            <div className="text-xl font-bold tabular-nums">
              <Num value={val} />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={s.pressure}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`mt-4 rounded-full px-3 py-1 text-center text-sm font-medium ${PRESSURE_STYLE[s.pressure]}`}
        >
          {t.pressure[s.pressure]}
        </motion.div>
      </AnimatePresence>

      <p className="mt-4 text-sm text-slate-300">
        {s.on_strike && `${s.on_strike.name} ${s.on_strike.runs}(${s.on_strike.balls})`}
        {s.non_striker && ` • ${s.non_striker.name} ${s.non_striker.runs}(${s.non_striker.balls})`}
      </p>
    </motion.div>
  );
}
