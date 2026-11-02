import { AnimatePresence, motion } from "framer-motion";

function Num({ value }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const TAG = {
  high: "bg-alert text-white",
  tightening: "bg-white text-ink",
  on_track: "bg-ink text-lime ring-2 ring-lime",
  over: "bg-white/20 text-white",
};

export default function Scoreboard({ state: s, t }) {
  const result =
    s.status === "won"
      ? t.wonWickets(s.batting_team, 10 - s.wickets)
      : s.status === "lost"
      ? t.wonRuns(s.bowling_team, s.need - 1)
      : null;

  const stats = [
    [t.need, s.need],
    [t.rrr, s.rrr],
    [t.crr, s.crr],
  ];

  return (
    <motion.div layout className="relative overflow-hidden bg-lime p-5 text-ink">
      <div className="stripes absolute inset-0" />
      <div className="relative">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
          <span>{s.batting_team}</span>
          <span>
            {t.target} {s.target}
          </span>
        </div>

        <div className="mt-1 flex items-end gap-3 font-display leading-none">
          <span className="text-[120px] tracking-tight">
            <Num value={s.runs} />
          </span>
          <span className="pb-4 text-6xl">
            /<Num value={s.wickets} />
          </span>
        </div>
        <div className="text-sm font-bold uppercase">({s.overs} ov)</div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map(([label, val]) => (
            <div key={label} className="bg-ink p-2 text-center text-lime">
              <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
              <div className="font-display text-3xl tabular-nums">
                <Num value={val} />
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={s.pressure}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-4 -skew-x-12 px-4 py-1 text-center font-display text-xl uppercase tracking-wide ${TAG[s.pressure]}`}
          >
            <span className="inline-block skew-x-12">{t.pressure[s.pressure]}</span>
          </motion.div>
        </AnimatePresence>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide">
          {s.on_strike && `${s.on_strike.name} ${s.on_strike.runs}(${s.on_strike.balls})`}
          {s.non_striker && ` • ${s.non_striker.name} ${s.non_striker.runs}(${s.non_striker.balls})`}
        </p>

        {result && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mt-4 origin-left bg-ink px-4 py-3 font-display text-2xl uppercase text-lime"
          >
            {result}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}