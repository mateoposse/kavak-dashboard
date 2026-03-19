import React, { useState, useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { formatMetric, formatPct, formatCurrency } from '../utils/formatters.js'

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <span className="text-[#475569] text-xs">—</span>
  return (
    <ResponsiveContainer width={64} height={28}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="spend"
          stroke={color || '#94A3B8'}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SortIcon({ dir }) {
  if (!dir) return <span className="text-[#475569] ml-1 text-[10px]">⇅</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-3 bg-[#334155] rounded skeleton" style={{ width: i === 0 ? '80px' : '50px' }} />
        </td>
      ))}
    </tr>
  )
}

export default function ChannelTable({ byChannel, byNetwork, loading, dashboardType, onChannelClick, selectedChannel }) {
  const [activeTab, setActiveTab] = useState('channel')
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState('desc')

  const rawRows = activeTab === 'channel' ? (byChannel || []) : (byNetwork || [])

  const rows = useMemo(() => {
    if (!sortKey) return rawRows
    return [...rawRows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [rawRows, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const funnelCols = dashboardType === 'Sale'
    ? [
        { key: 'regs', label: 'Regs' },
        { key: 'cpr', label: 'CPR' },
        { key: 'leads', label: 'Leads' },
        { key: 'cpl', label: 'CPL' },
        { key: 'bookings', label: 'Bookings' },
        { key: 'buyers', label: 'Buyers' },
      ]
    : [
        { key: 'regs', label: 'Regs' },
        { key: 'cpr', label: 'CPR' },
        { key: 'inps', label: 'Insp.' },
        { key: 'cpi', label: 'CPI' },
        { key: 'purchases', label: 'Purch.' },
        { key: 'cpp', label: 'CPP' },
      ]

  const allCols = [
    { key: 'spend', label: 'Spend' },
    { key: 'spend_share', label: 'Share' },
    { key: 'impr', label: 'Impr' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpm', label: 'CPM' },
    { key: 'cpc', label: 'CPC' },
    ...funnelCols,
  ]

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-1 px-5 py-4 border-b border-[#334155]">
        <h3 className="text-white font-semibold text-sm mr-4">Performance</h3>
        {['channel', 'network'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab
                ? 'bg-[#334155] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            By {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        {selectedChannel && (
          <span className="ml-auto text-[#94A3B8] text-xs">
            Filtering campaigns by: <span className="text-white font-medium">{selectedChannel}</span>
            <button
              onClick={() => onChannelClick(null)}
              className="ml-2 text-[#EF4444] hover:underline"
            >
              ✕ Clear
            </button>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#94A3B8] uppercase tracking-wider bg-[#0F172A]/40">
              <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-[#0F172A]/40">
                {activeTab === 'channel' ? 'Channel' : 'Network'}
              </th>
              {allCols.map(col => (
                <th
                  key={col.key}
                  className="text-right py-3 px-4 font-semibold cursor-pointer hover:text-white select-none transition-colors whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon dir={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
              {activeTab === 'channel' && (
                <th className="text-right py-3 px-4 font-semibold">Trend</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.map((row, i) => {
                  const name = activeTab === 'channel' ? row.channel : row.network
                  const isSelected = selectedChannel && name === selectedChannel
                  return (
                    <tr
                      key={name}
                      onClick={() => activeTab === 'channel' && onChannelClick(name)}
                      className={`border-t border-[#334155]/50 transition-colors ${
                        isSelected
                          ? 'bg-[#334155]/50'
                          : i % 2 === 0
                          ? 'hover:bg-[#253347]/40'
                          : 'bg-[#253347]/20 hover:bg-[#253347]/50'
                      } ${activeTab === 'channel' ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-3 px-4 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: row.color || '#9CA3AF' }}
                          />
                          <span className="text-white font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-semibold tabular-nums">
                        {formatCurrency(row.spend)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {row.spend_share != null ? formatPct(row.spend_share) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {formatMetric('impr', row.impr)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {formatMetric('clicks', row.clicks)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {formatMetric('ctr', row.ctr)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {formatMetric('cpm', row.cpm)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                        {formatMetric('cpc', row.cpc)}
                      </td>
                      {funnelCols.map(c => (
                        <td key={c.key} className="py-3 px-4 text-right text-[#94A3B8] tabular-nums">
                          {formatMetric(c.key, row[c.key])}
                        </td>
                      ))}
                      {activeTab === 'channel' && (
                        <td className="py-3 px-4 text-right">
                          <Sparkline data={row.sparkline} color={row.color} />
                        </td>
                      )}
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
