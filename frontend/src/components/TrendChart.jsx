import React, { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency, formatMetric, metricLabel } from '../utils/formatters.js'

const ALL_METRICS = [
  'impr', 'clicks', 'ctr', 'cpm', 'cpc',
  'regs', 'cpr', 'inps', 'cpi', 'inps_made', 'cpim',
  'leads', 'cpl', 'qual_leads', 'cpql',
  'bookings', 'cpb', 'buyers', 'cpbu',
  'purchases', 'cpp', 'new_acc', 'total_users', 'cpu',
]

function SkeletonChart() {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 h-80 skeleton" />
  )
}

function CustomTooltip({ active, payload, label, selectedMetric }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#94A3B8] mb-2 font-medium">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#94A3B8]">{entry.name}:</span>
          <span className="text-white font-semibold">
            {entry.dataKey === 'spend'
              ? formatCurrency(entry.value)
              : formatMetric(selectedMetric, entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data, loading, accentColor }) {
  const [selectedMetric, setSelectedMetric] = useState('clicks')

  if (loading) return <SkeletonChart />

  const chartData = (data || []).map(d => ({
    ...d,
    date: d.date ? d.date.slice(5) : d.date, // MM-DD
  }))

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Daily Trend</h3>
          <p className="text-[#94A3B8] text-xs mt-0.5">
            Spend (bars) vs {metricLabel(selectedMetric)} (line)
          </p>
        </div>
        <select
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value)}
          className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#475569] cursor-pointer"
        >
          {ALL_METRICS.map(m => (
            <option key={m} value={m}>{metricLabel(m)}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => formatCurrency(v).replace('R$\u00a0', 'R$').replace(/\./g, 'k').slice(0, 8)}
            width={70}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => formatMetric(selectedMetric, v)}
            width={70}
          />
          <Tooltip
            content={<CustomTooltip selectedMetric={selectedMetric} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }}
          />
          <Bar
            yAxisId="left"
            dataKey="spend"
            name="Spend (BRL)"
            fill="#334155"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={selectedMetric}
            name={metricLabel(selectedMetric)}
            stroke={accentColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: accentColor }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
