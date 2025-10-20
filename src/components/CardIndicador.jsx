export default function CardIndicador({ title, value, sub }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}
