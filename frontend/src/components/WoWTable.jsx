import React from 'react'
import { formatMetric, metricLabel, formatDelta } from '../utils/formatters.js'

function SkeletonRow() {
  return (
    <tr>
      <td className="py-2 px-4"><div className="h-3 bg-[#334155] rounded w-24 skeleton" /></td>
      <td className="py-2 px-4"><div className="h-3 bg-[#334155] rounded w-20 skeleton" /></td>
      <td className="py-2 px-4"><div className="h-3 bg-[#334155] rounded w-20 skeleton" /></td>
      <td className="py-2 px-4"><div className="h-3 bg-[#334155] rounded w-16 skeleton" /></td>
    </tr>
  )
}

export default function WoWTable({ wow, loading, dashboardType }) {
  const salesMetrics = [
    'spend', 'impr', 'clicks', 'ctr',
    'regs', 'cpr', 'leads', 'cpl',
    'qual_leads', 'cpql', 'bookings', 'cpb',
    'buyers', 'cpbu', 'new_acc',
  ]
  const purchaseMetrics = [
    'spend', 'impr', 'clicks', 'ctr',
    'regs', 'cpr', 'inps', 'cpi',
    'inps_made', 'cpim', 'purchases', 'cpp',
    'leads', 'cpl', 'new_acc',
  ]

  const metrics = dashboardType === 'Sale' ? salesMetrics : purchaseMetrics

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#334155]">
        <h3 className="text-white font-semibold text-sm">Week-over-Week Comparison</h3>
        {!loading && wow && (
          <p className="text-[#94A3B8] text-xs mt-0.5">
            Current: {wow.current_week_range?.start} – {wow.current_week_range?.end}
            &nbsp;·&nbsp;
            Prev: {wow.prev_week_range?.start} – {wow.prev_week_range?.end}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#94A3B8] text-xs uppercase tracking-wider bg-[#0F172A]/40">
              <th className="text-left py-3 px-4 font-semibold">Metric</th>
              <th className="text-right py-3 px-4 font-semibold">Current Week</th>
              <th className="text-right py-3 px-4 font-semibold">Prev Week</th>
              <th className="text-right py-3 px-4 font-semibold">Δ%</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : metrics.map((key, i) => {
                  const curr = wow?.current_week?.[key]
                  const prev = wow?.prev_week?.[key]
                  const deltaPct = wow?.delta_pct?.[key]
                  const delta = formatDelta(deltaPct)

                  return (
                    <tr
                      key={key}
                      className={`border-t border-[#334155]/50 hover:bg-[#253347]/50 transition-colors ${
                        i % 2 === 0 ? 'bg-transparent' : 'bg-[#253347]/20'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-[#94A3B8] font-medium text-xs">
                        {metricLabel(key)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-semibold tabular-nums text-xs">
                        {formatMetric(key, curr)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#94A3B8] tabular-nums text-xs">
                        {formatMetric(key, prev)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-semibold tabular-nums">
                        {delta.positive !== null ? (
                          <span style={{ color: delta.positive ? '#10B981' : '#EF4444' }}>
                            {delta.text}
                          </span>
                        ) : (
                          <span className="text-[#475569]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
