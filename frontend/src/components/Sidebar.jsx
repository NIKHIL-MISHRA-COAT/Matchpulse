export default function Sidebar({ t }) {
  return (
    <aside className="hidden xl:fixed xl:left-6 xl:top-24 xl:block xl:w-64">
      <div className="border-2 border-lime p-4">
        <h2 className="font-display text-2xl uppercase leading-none text-lime">{t.about.title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/60">{t.about.intro}</p>
        <dl className="mt-4 space-y-3">
          {t.about.items.map(([label, body]) => (
            <div key={label}>
              <dt className="text-xs font-bold uppercase tracking-wider">{label}</dt>
              <dd className="text-xs leading-relaxed text-white/60">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}