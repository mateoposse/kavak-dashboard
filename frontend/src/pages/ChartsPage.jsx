import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import Sidebar from '../components/Sidebar.jsx'
import { fetchCharts } from '../utils/api.js'

const CHANNELS = ['Facebook Ads', 'Google Ads', 'PMax', 'Tiktok Ads', 'Taboola Ads', 'Other Paid']

const CHANNEL_COLORS = {
  'Facebook Ads': '#1877F2',
  'Google Ads':   '#FBBC04',
  'PMax':         '#34D399',
  'Tiktok Ads':   '#FF3B5C',
  'Taboola Ads':  '#00C8FF',
  'Other Paid':   '#9CA3AF',
}

const CHANNEL_SHORT = {
  'Facebook Ads': 'META',
  'Google Ads':   'GADS',
  'PMax':         'PMAX',
  'Tiktok Ads':   'TIK',
  'Taboola Ads':  'TAB',
  'Other Paid':   'OTH',
}

const ACCENT = '#8B5CF6'

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-[#64748B] text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ChartsPage() {
  const [campaignType, setCampaignType] = useState('Purchase')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (ct) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchCharts({ campaign_type: ct })
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setData(null)
    load(campaignType)
  }, [campaignType])

  const convLabel = campaignType === 'Purchase' ? 'Regs' : 'Leads'
  const cprCplLabel = campaignType === 'Purchase' ? 'CPR' : 'CPL'

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 },
    labelStyle: { color: '#F8FAFC', fontWeight: 700 },
    itemStyle: { color: '#94A3B8' },
  }

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-[1600px]">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ACCENT }} />
              <div>
                <h1 className="text-white text-xl font-bold leading-none">Charts</h1>
                <p className="text-[#94A3B8] text-xs mt-1">Weekly performance trends · last 8 weeks</p>
              </div>
            </div>
            <div className="flex bg-[#0F172A] border border-[#334155] rounded-xl p-1 gap-1">
              {[{ ct: 'Purchase', label: 'Supply' }, { ct: 'Sale', label: 'Sales' }].map(({ ct, label }) => (
                <button
                  key={ct}
                  onClick={() => setCampaignType(ct)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={
                    campaignType === ct
                      ? { backgroundColor: ACCENT + '22', color: ACCENT, border: `1px solid ${ACCENT}55` }
                      : { color: '#94A3B8' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 h-80">
                  <div className="h-4 bg-[#334155] rounded w-48 skeleton mb-2" />
                  <div className="h-3 bg-[#334155] rounded w-64 skeleton mb-6" />
                  <div className="h-52 bg-[#334155]/40 rounded skeleton" />
                </div>
              ))}
            </div>
          ) : data && (
            <div className="space-y-5">

              {/* Chart 1: Spend Mix */}
              <ChartCard
                title="Spend Mix by Channel"
                subtitle="% of total spend per week (last 8 weeks)"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.spend_mix} barCategoryGap="35%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => v + '%'}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v, name) => [v.toFixed(1) + '%', CHANNEL_SHORT[name] || name]}
                    />
                    <Legend
                      formatter={n => <span style={{ color: '#94A3B8', fontSize: 12 }}>{CHANNEL_SHORT[n] || n}</span>}
                    />
                    {CHANNELS.map(ch => (
                      <Bar key={ch} dataKey={ch} stackId="a" fill={CHANNEL_COLORS[ch]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 2: WoW Variance */}
              <ChartCard
                title="WoW Variance by Channel"
                subtitle={`Spend & ${convLabel} % change vs prior week`}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.wow_variance} barCategoryGap="30%" barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="channel"
                      tickFormatter={v => CHANNEL_SHORT[v] || v}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => v + '%'}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                    <Tooltip
                      {...tooltipStyle}
                      labelFormatter={v => CHANNEL_SHORT[v] || v}
                      formatter={(v, name) => [
                        v !== null && v !== undefined ? v.toFixed(1) + '%' : '—',
                        name,
                      ]}
                    />
                    <Legend
                      formatter={n => <span style={{ color: '#94A3B8', fontSize: 12 }}>{n}</span>}
                    />
                    <Bar dataKey="spend_pct" name="Spend WoW" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="conv_pct" name={`${convLabel} WoW`} fill="#10B981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 3: CPR/CPL by Channel */}
              <ChartCard
                title={`${cprCplLabel} by Channel`}
                subtitle="Cost per conversion over last 6 weeks"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.cpr_cpl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => '$' + Math.round(v)}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v, name) => [
                        v !== null && v !== undefined ? '$' + v.toFixed(2) : '—',
                        CHANNEL_SHORT[name] || name,
                      ]}
                    />
                    <Legend
                      formatter={n => <span style={{ color: '#94A3B8', fontSize: 12 }}>{CHANNEL_SHORT[n] || n}</span>}
                    />
                    {CHANNELS.map(ch => (
                      <Line
                        key={ch}
                        type="monotone"
                        dataKey={ch}
                        stroke={CHANNEL_COLORS[ch]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHANNEL_COLORS[ch] }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 4: CPQL by Channel (Sale only) */}
              {campaignType === 'Sale' && data.cpql && data.cpql.length > 0 && (
                <ChartCard
                  title="CPQL by Channel"
                  subtitle="Cost per qualified lead over last 6 weeks"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.cpql} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tickFormatter={v => '$' + Math.round(v)}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v, name) => [
                          v !== null && v !== undefined ? '$' + v.toFixed(2) : '—',
                          CHANNEL_SHORT[name] || name,
                        ]}
                      />
                      <Legend
                        formatter={n => <span style={{ color: '#94A3B8', fontSize: 12 }}>{CHANNEL_SHORT[n] || n}</span>}
                      />
                      {CHANNELS.map(ch => (
                        <Line
                          key={ch}
                          type="monotone"
                          dataKey={ch}
                          stroke={CHANNEL_COLORS[ch]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CHANNEL_COLORS[ch] }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
