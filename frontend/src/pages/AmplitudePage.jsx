import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import Sidebar from '../components/Sidebar.jsx'
import { apiGet } from '../utils/api.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const AMPLITUDE_URL = 'https://app.amplitude.com/analytics/kavak/dashboard/19zkop65'

const CHANNEL_COLORS = {
  'Meta Ads':     '#1877F2',
  'Google Search':'#FBBC04',
  'PMax':         '#EA4335',
  'Discovery':    '#34A853',
  'TikTok':       '#FF3B5C',
  'Other':        '#9CA3AF',
}

const CHANNEL_SHORT = {
  'Meta Ads': 'META', 'Google Search': 'GADS', 'PMax': 'PMAX',
  'Discovery': 'DISC', 'TikTok': 'TIK', 'Other': 'OTH',
}

const CAMPAIGN_PALETTE = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
  '#06B6D4','#F97316','#84CC16','#EC4899','#14B8A6','#9CA3AF',
]

// ── Config-driven chart definitions ───────────────────────────────────────────
// Adding a new chart = add one entry here + one backend endpoint.

const CHARTS_CONFIG = [
  {
    id: 'leads_by_channel',
    title: 'BR — Total Leads by Channel',
    description: 'Weekly leads by paid channel · Sale · last 12 weeks',
    type: 'stacked_bar',
    endpoint: '/amplitude/leads_by_channel',
    xKey: 'week',
    dataKeys: ['Meta Ads','Google Search','PMax','Discovery','TikTok','Other'],
    colors: CHANNEL_COLORS,
  },
  {
    id: 'qualified_leads_by_channel',
    title: 'Qualified Leads by Channel',
    description: 'Daily checkout + appointment leads · Sale · last 30 days',
    type: 'stacked_bar',
    endpoint: '/amplitude/qualified_leads_by_channel',
    xKey: 'date',
    dataKeys: ['Meta Ads','Google Search','PMax','Discovery','TikTok','Other'],
    colors: CHANNEL_COLORS,
  },
  {
    id: 'registers_by_campaign',
    title: 'Registers by Campaign (Purchase)',
    description: 'Weekly registers for top 10 campaigns · last 12 weeks',
    type: 'stacked_bar_dynamic',
    endpoint: '/amplitude/registers_by_campaign',
    xKey: 'week',
  },
  {
    id: 'registers_by_channel_weekly',
    title: 'Registers by Channel (Purchase)',
    description: 'Weekly registers by network · last 12 weeks',
    type: 'stacked_bar',
    endpoint: '/amplitude/registers_by_channel_weekly',
    xKey: 'week',
    dataKeys: ['Meta Ads','Google Search','PMax','Discovery','TikTok','Other'],
    colors: CHANNEL_COLORS,
  },
  {
    id: 'leads_vs_ql_by_channel',
    title: 'Leads vs Qualified Leads',
    description: 'Leads and QL grouped by channel · Sale · select week',
    type: 'grouped_by_week',
    endpoint: '/amplitude/leads_vs_ql_by_channel',
  },
  {
    id: 'inspections_per_week',
    title: 'Inspections per Week',
    description: 'Total purchase inspections · last 6 weeks',
    type: 'line_single',
    endpoint: '/amplitude/inspections_per_week',
    xKey: 'week',
    dataKey: 'value',
    color: '#8B5CF6',
  },
  {
    id: 'cpr_cpl_weekly',
    title: 'CPR & CPL by Channel',
    description: 'Cost per register (Purchase) and cost per lead (Sale) · last 12 weeks',
    type: 'line_toggle',
    endpoint: '/amplitude/cpr_cpl_weekly',
    dataKeys: ['Meta Ads','Google Search','PMax','Discovery','TikTok','Other'],
    colors: CHANNEL_COLORS,
  },
]

// ── Shared Recharts styling ────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#F8FAFC', fontWeight: 700 },
  itemStyle: { color: '#94A3B8' },
}

const AXIS_TICK = { fill: '#64748B', fontSize: 11 }

function ChartGrid({ children, ...props }) {
  return (
    <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} {...props} />
  )
}

// ── Individual chart renderers ─────────────────────────────────────────────────

function StackedBarRenderer({ config, data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <ChartGrid />
        <XAxis dataKey={config.xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={n => <span style={{ color: '#94A3B8' }}>{CHANNEL_SHORT[n] || n}</span>}
        />
        {config.dataKeys.map(k => (
          <Bar key={k} dataKey={k} stackId="a" fill={config.colors[k] || '#9CA3AF'} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function StackedBarDynamicRenderer({ config, data: raw }) {
  if (!raw?.campaigns || !raw?.data) return null
  const { campaigns, data } = raw

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <ChartGrid />
        <XAxis dataKey={config.xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v, name) => [v, name.length > 30 ? name.slice(0, 30) + '…' : name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
          formatter={n => (
            <span style={{ color: '#94A3B8' }}>
              {n === 'Other' ? 'Other' : n.replace(/^br-purchase-/, '').slice(0, 22)}
            </span>
          )}
        />
        {campaigns.map((camp, i) => (
          <Bar key={camp} dataKey={camp} stackId="a" fill={CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function LineSingleRenderer({ config, data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <ChartGrid />
        <XAxis dataKey={config.xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={50} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey={config.dataKey}
          stroke={config.color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: config.color }}
          activeDot={{ r: 6 }}
          name="Inspections"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function GroupedByWeekRenderer({ data }) {
  const weeks = [...new Set((data || []).map(d => d.week))]
  const [selectedWeek, setSelectedWeek] = useState(weeks[weeks.length - 1] || '')

  useEffect(() => {
    if (weeks.length && !selectedWeek) setSelectedWeek(weeks[weeks.length - 1])
  }, [weeks.length])

  const filtered = (data || [])
    .filter(d => d.week === selectedWeek)
    .map(d => ({ ...d, channelShort: CHANNEL_SHORT[d.channel] || d.channel }))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#64748B] text-xs">Week:</span>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
          className="bg-[#0F172A] border border-[#334155] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#475569]"
        >
          {weeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={filtered} barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <ChartGrid />
          <XAxis dataKey="channelShort" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={v => {
              const row = filtered.find(d => d.channelShort === v)
              return row?.channel || v
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            formatter={n => <span style={{ color: '#94A3B8' }}>{n}</span>}
          />
          <Bar dataKey="leads" name="Leads" fill="#1877F2" radius={[3, 3, 0, 0]} />
          <Bar dataKey="ql" name="QL" fill="#10B981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LineToggleRenderer({ config, data }) {
  const [series, setSeries] = useState('cpr')
  const chartData = data?.[series] || []

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        {[['cpr', 'CPR (Purchase)'], ['cpl', 'CPL (Sale)']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSeries(key)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={
              series === key
                ? { backgroundColor: '#334155', color: '#F8FAFC' }
                : { color: '#64748B' }
            }
          >
            {label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <ChartGrid />
          <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            tickFormatter={v => v !== null && v !== undefined ? '$' + Math.round(v) : ''}
            tick={AXIS_TICK} axisLine={false} tickLine={false} width={50}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [
              v !== null && v !== undefined ? '$' + v.toFixed(2) : '—',
              CHANNEL_SHORT[name] || name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            formatter={n => <span style={{ color: '#94A3B8' }}>{CHANNEL_SHORT[n] || n}</span>}
          />
          {config.dataKeys.map(ch => (
            <Line
              key={ch}
              type="monotone"
              dataKey={ch}
              stroke={config.colors[ch]}
              strokeWidth={2}
              dot={{ r: 3, fill: config.colors[ch] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── ChartContent dispatcher ────────────────────────────────────────────────────

function ChartContent({ config, data }) {
  switch (config.type) {
    case 'stacked_bar':         return <StackedBarRenderer config={config} data={data} />
    case 'stacked_bar_dynamic': return <StackedBarDynamicRenderer config={config} data={data} />
    case 'line_single':         return <LineSingleRenderer config={config} data={data} />
    case 'grouped_by_week':     return <GroupedByWeekRenderer data={data} />
    case 'line_toggle':         return <LineToggleRenderer config={config} data={data} />
    default:                    return null
  }
}

// ── ChartCard: fetches data + renders card ─────────────────────────────────────

function ChartCard({ config }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet(config.endpoint)
      .then(res => { setData(res); setLoading(false) })
      .catch(err => { setError(err?.message || 'Failed to load'); setLoading(false) })
  }, [config.endpoint])

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-white font-bold leading-tight" style={{ fontSize: 14 }}>
            {config.title}
          </h3>
          <p className="text-[#64748B] text-xs mt-0.5">{config.description}</p>
        </div>
        <a
          href={AMPLITUDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[#475569] hover:text-[#94A3B8] transition-colors text-xs flex items-center gap-1"
          title="View in Amplitude"
        >
          <span>↗</span>
        </a>
      </div>

      {/* Divider */}
      <div className="border-t border-[#334155]/50 my-3" />

      {/* Chart area */}
      <div className="flex-1">
        {loading ? (
          <div className="space-y-2">
            <div className="h-48 bg-[#334155]/30 rounded-xl skeleton" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-400 text-xs">Failed to load — {error}</span>
          </div>
        ) : (
          <ChartContent config={config} data={data} />
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const ACCENT = '#F59E0B'

export default function AmplitudePage() {
  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1700px]">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ACCENT }} />
              <div>
                <h1 className="text-white text-xl font-bold leading-none">Amplitude Analytics</h1>
                <p className="text-[#94A3B8] text-xs mt-1">Replicating Brazil · Mateo dashboard from Redshift</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: ACCENT + '18', color: ACCENT, border: `1px solid ${ACCENT}44` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                LIVE · Redshift
              </span>
              <a
                href={AMPLITUDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] border border-[#334155] rounded-lg text-[#94A3B8] hover:text-white text-xs font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Amplitude
              </a>
            </div>
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {CHARTS_CONFIG.map(config => (
              <ChartCard key={config.id} config={config} />
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
