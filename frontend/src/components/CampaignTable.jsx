import React, { useState, useMemo } from 'react'
import { formatMetric, formatCurrency } from '../utils/formatters.js'

const PAGE_SIZE = 25

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3 bg-[#334155] rounded skeleton" style={{ width: i === 0 ? '120px' : '50px' }} />
        </td>
      ))}
    </tr>
  )
}

function SortIcon({ dir }) {
  if (!dir) return <span className="text-[#334155] ml-1">⇅</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

const BADGE_COLORS = {
  'Facebook Ads': '#1877F2',   // blue
  'Google Ads':   '#EAB308',   // yellow
  'Taboola Ads':  '#00C8FF',
  'Tiktok Ads':   '#000000',
  'Other Paid':   '#9CA3AF',
}

function getBadgeColor(channel, network) {
  if (network && /pmax|performance.?max/i.test(network)) return '#EF4444' // red
  return BADGE_COLORS[channel] || '#9CA3AF'
}

export default function CampaignTable({ campaigns, loading, dashboardType, filterChannel }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [copiedCampaign, setCopiedCampaign] = useState(null)

  const metricCols = dashboardType === 'Sale'
    ? ['spend', 'impr', 'clicks', 'ctr', 'cpm', 'cpc', 'regs', 'cpr', 'leads', 'cpl', 'qual_leads', 'cpql', 'bookings', 'cpb', 'buyers', 'cpbu', 'new_acc']
    : ['spend', 'impr', 'clicks', 'ctr', 'cpm', 'cpc', 'regs', 'cpr', 'inps', 'cpi', 'inps_made', 'cpim', 'purchases', 'cpp', 'leads', 'cpl', 'new_acc']

  const colLabels = {
    spend: 'Spend', impr: 'Impr', clicks: 'Clicks', ctr: 'CTR', cpm: 'CPM', cpc: 'CPC',
    regs: 'Regs', cpr: 'CPR', inps: 'Insp', cpi: 'CPI', inps_made: 'Insp Made', cpim: 'CPIM',
    leads: 'Leads', cpl: 'CPL', qual_leads: 'Qual L.', cpql: 'CPQL',
    bookings: 'Bookings', cpb: 'CPB', buyers: 'Buyers', cpbu: 'CPBu',
    purchases: 'Purch', cpp: 'CPP', new_acc: 'New Acc',
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  async function handleCopy(name) {
    try {
      await navigator.clipboard.writeText(name)
      setCopiedCampaign(name)
      setTimeout(() => setCopiedCampaign(null), 2000)
    } catch {}
  }

  const filtered = useMemo(() => {
    let rows = campaigns || []
    // Exclude campaigns with zero spend
    rows = rows.filter(r => (r.spend || 0) > 0)
    if (filterChannel) {
      rows = rows.filter(r => r.channel === filterChannel)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.campaign_name?.toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [campaigns, filterChannel, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalCols = 3 + metricCols.length

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] gap-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Campaigns</h3>
          <p className="text-[#94A3B8] text-xs mt-0.5">
            {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            {filterChannel ? ` · ${filterChannel}` : ''}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search campaigns…"
          className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-white text-xs w-56 focus:outline-none focus:border-[#475569] placeholder-[#475569]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#94A3B8] uppercase tracking-wider bg-[#0F172A]/40">
              <th className="text-left py-3 px-3 font-semibold sticky left-0 bg-[#0F172A]" style={{ whiteSpace: 'nowrap' }}>
                Campaign
              </th>
              <th className="text-left py-3 px-3 font-semibold">Channel</th>
              <th className="text-left py-3 px-3 font-semibold">Network</th>
              {metricCols.map(key => (
                <th
                  key={key}
                  className="text-right py-3 px-3 font-semibold cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  {colLabels[key] || key}
                  <SortIcon dir={sortKey === key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={totalCols} />)
              : pageData.length === 0
              ? (
                <tr>
                  <td colSpan={totalCols} className="py-12 text-center text-[#475569]">
                    No campaigns found
                  </td>
                </tr>
              )
              : pageData.map((row, i) => (
                <tr
                  key={row.campaign_name + i}
                  className={`border-t border-[#334155]/50 hover:bg-[#253347]/50 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-[#253347]/20'
                  }`}
                >
                  <td className="py-2.5 px-3 sticky left-0 bg-[#1E293B]" style={{ whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleCopy(row.campaign_name)}
                      title="Click to copy campaign name"
                      className="text-left block text-white hover:text-[#94A3B8] transition-colors"
                    >
                      {copiedCampaign === row.campaign_name
                        ? <span className="text-[#10B981]">✓ Copied!</span>
                        : row.campaign_name
                      }
                    </button>
                  </td>
                  <td className="py-2.5 px-3" style={{ whiteSpace: 'nowrap' }}>
                    {(() => {
                      const badgeColor = getBadgeColor(row.channel, row.network)
                      const label = row.channel === 'Facebook Ads' ? 'Meta Ads' : row.channel
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-white text-[10px] font-medium"
                          style={{ backgroundColor: badgeColor + '22', border: `1px solid ${badgeColor}55` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badgeColor }} />
                          {label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-2.5 px-3 text-[#94A3B8]">{row.network || '—'}</td>
                  {metricCols.map(key => (
                    <td key={key} className="py-2.5 px-3 text-right tabular-nums text-[#94A3B8]">
                      {formatMetric(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#334155]">
          <span className="text-[#94A3B8] text-xs">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] border border-[#334155] hover:text-white hover:border-[#475569] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1
              if (totalPages > 5 && page > 3) {
                p = page - 2 + i
                if (p > totalPages) p = totalPages - (4 - i)
              }
              return p
            }).filter((p, i, arr) => arr.indexOf(p) === i && p >= 1 && p <= totalPages).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-7 rounded-lg text-xs transition-colors ${
                  page === p
                    ? 'bg-[#334155] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] border border-[#334155] hover:text-white hover:border-[#475569] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
