import React from 'react'
import { formatMetric, formatDelta } from '../utils/formatters.js'

function Skeleton() {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 animate-pulse">
      <div className="h-3 bg-[#334155] rounded w-20 mb-3" />
      <div className="h-8 bg-[#334155] rounded w-28 mb-3" />
      <div className="h-3 bg-[#334155] rounded w-16" />
    </div>
  )
}

export default function KPICard({ metricKey, label, value, wowDelta, loading, accentColor }) {
  if (loading) return <Skeleton />

  const delta = formatDelta(wowDelta)

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 hover:border-[#475569] hover:shadow-lg hover:shadow-black/20 transition-all duration-200 group">
      <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-2 truncate">
        {label}
      </p>
      <p className="text-white text-2xl font-bold leading-none mb-3 tabular-nums">
        {value !== null && value !== undefined ? formatMetric(metricKey, value) : '—'}
      </p>
      <div className="flex items-center gap-1.5">
        {delta.positive !== null ? (
          <>
            <span
              className="text-xs font-semibold"
              style={{ color: delta.positive ? '#10B981' : '#EF4444' }}
            >
              {delta.positive ? '▲' : '▼'} {delta.text}
            </span>
            <span className="text-[#475569] text-xs">WoW</span>
          </>
        ) : (
          <span className="text-[#475569] text-xs">No WoW data</span>
        )}
      </div>
    </div>
  )
}
