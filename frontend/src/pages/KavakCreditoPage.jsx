import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { apiGet, fetchCreditoCampaigns } from '../utils/api.js'

const ACCENT = '#6366F1'

// Mapeo event → label corto estilo referencia
const STEP_LABELS = {
  funnelName_viewed:                'Step 1 – View',
  funnelName_started:               'Step 1 – Start',
  otpVerification_viewed:           'Step 2 – OTP Exibido',
  otpVerification_completed:        'Step 2 – OTP Validado',
  vehicleInformation_viewed:        'Step 3 – Veículo',
  simulationOffers_viewed:          'Step 4 – Simulação',
  simulationOffer_selected:         'Step 5 – Oferta Selecion.',
  complementaryInformation_viewed:  'Step 6.1 – Comp. View',
  complementaryInformation_selected:'Step 6.1 – Comp. Sel.',
  addressInformation_viewed:        'Step 6.2 – Endereço View',
  addressInformation_selected:      'Step 6.2 – Endereço Sel.',
  bankInformation_viewed:           'Step 6.3 – Banco View',
  bankInformation_selected:         'Step 6.3 – Banco Sel.',
  documentsUpload_viewed:           'Step 7 – Docs View',
  documentsUpload_selected:         'Step 7 – Docs Enviados',
  proposalFinalization_completed:   'Step 8 – Proposta ✓',
}

const CONV_LABELS = {
  funnelName_started:               'Start / View (Step 1)',
  otpVerification_viewed:           'OTP Exibido / Start',
  otpVerification_completed:        'OTP Validado / OTP Exibido',
  vehicleInformation_viewed:        'Veículo / OTP Validado',
  simulationOffers_viewed:          'Simulação / Veículo',
  simulationOffer_selected:         'Oferta Sel. / Simulação',
  complementaryInformation_viewed:  'Comp. View / Oferta Sel.',
  complementaryInformation_selected:'Comp. Sel. / Comp. View',
  addressInformation_viewed:        'Endereço View / Comp. Sel.',
  addressInformation_selected:      'Endereço Sel. / End. View',
  bankInformation_viewed:           'Banco View / End. Sel.',
  bankInformation_selected:         'Banco Sel. / Banco View',
  documentsUpload_viewed:           'Docs View / Banco Sel.',
  documentsUpload_selected:         'Docs Enviados / Docs View',
  proposalFinalization_completed:   'Proposta ✓ / Docs Enviados',
}

const TOP_EVENT = 'funnelName_viewed'
const COMPLETO_EVENT = 'simulationOffers_viewed'
const APROBADO_EVENT = 'proposalFinalization_completed'

function fmt(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0'
  const n = Number(val)
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

function fmtPct(val) {
  if (val === null || val === undefined) return '—'
  return Math.round(Number(val)) + '%'
}

function convBg(pct) {
  if (pct === null || pct === undefined) return 'bg-[#1a1f2e] text-[#475569]'
  const v = Number(pct)
  if (v >= 70) return 'bg-[#166534]/60 text-emerald-300'
  if (v >= 40) return 'bg-[#854d0e]/60 text-yellow-300'
  return 'bg-[#7f1d1d]/60 text-red-300'
}

function fmtCurrency(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtNum(v) {
  if (!v && v !== 0) return '—'
  const n = Number(v)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('pt-BR')
}

// ── Daily Spend Table (USD) ─────────────────────────────────────────────────────
function fmtUSD(v) {
  if (!v && v !== 0) return '—'
  return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function DailySpendTable({ campData }) {
  if (!campData) return null
  const { rows, dates } = campData
  if (!rows || !dates || dates.length === 0) return null

  const metaAlfa   = rows.find(r => r.channel === 'Facebook Ads' && !r.show_leads)
  const metaBeta   = rows.find(r => r.channel === 'Facebook Ads' && r.show_leads)
  const googleAlfa = rows.find(r => r.channel !== 'Facebook Ads')

  const campaigns = [
    { key: 'meta_alfa',   label: 'Meta Alfa',              row: metaAlfa,   color: '#1877F2' },
    { key: 'meta_beta',   label: 'Meta Beta',              row: metaBeta,   color: '#60A5FA' },
    { key: 'google_alfa', label: 'Google Alfa (BR Brand)', row: googleAlfa, color: '#4285F4' },
  ].filter(c => c.row)

  const visibleDates = dates.slice(-14)

  const dailyTotal = {}
  for (const d of visibleDates) {
    dailyTotal[d] = campaigns.reduce((sum, c) => sum + (c.row?.daily?.[d]?.spend || 0), 0)
  }
  const grandTotal = campaigns.reduce((sum, c) => sum + (c.row?.total?.spend || 0), 0)

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#334155] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="text-white font-semibold text-sm">Daily Spend – USD</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#334155] text-[#94A3B8] uppercase tracking-wide">
          Meta Alfa · Meta Beta · Google Alfa
        </span>
        <span className="ml-auto text-[#475569] text-xs">
          {visibleDates[0]?.slice(5)} → {visibleDates[visibleDates.length - 1]?.slice(5)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0F172A]">
              <th className="text-left px-4 py-3 text-[#64748B] font-semibold whitespace-nowrap" style={{ minWidth: 180 }}>Campaña</th>
              {visibleDates.map(d => (
                <th key={d} className="text-right px-2 py-3 text-[#64748B] font-semibold whitespace-nowrap">{d.slice(5)}</th>
              ))}
              <th className="text-right px-4 py-3 text-indigo-400 font-semibold whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(({ key, label, row, color }) => (
              <tr key={key} className="border-t border-[#0F172A] hover:bg-[#334155]/20 transition-colors">
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[#CBD5E1] font-medium">{label}</span>
                  </div>
                </td>
                {visibleDates.map(d => {
                  const v = row.daily?.[d]?.spend
                  return (
                    <td key={d} className="text-right px-2 py-2.5 font-mono text-[#94A3B8] whitespace-nowrap">
                      {v > 0 ? fmtUSD(v) : <span className="text-[#2d3f55]">—</span>}
                    </td>
                  )
                })}
                <td className="text-right px-4 py-2.5 font-mono font-bold text-white whitespace-nowrap">
                  {fmtUSD(row.total?.spend)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#334155] bg-[#0A1628]">
              <td className="px-4 py-3 text-indigo-400 font-bold whitespace-nowrap pl-10">Total</td>
              {visibleDates.map(d => (
                <td key={d} className="text-right px-2 py-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                  {dailyTotal[d] > 0 ? fmtUSD(dailyTotal[d]) : <span className="text-[#2d3f55]">—</span>}
                </td>
              ))}
              <td className="text-right px-4 py-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                {fmtUSD(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Channel badge config ────────────────────────────────────────────────────────
const CH_BADGE = {
  'Facebook Ads': { color: '#1877F2', label: 'Meta Ads' },
  'Google Ads':   { color: '#4285F4', label: 'Google Ads' },
}

// ── Campaign performance section ────────────────────────────────────────────────
function CampaignSection({ dateFrom, dateTo, onDataLoaded }) {
  const [campData, setCampData] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchCreditoCampaigns({ date_from: dateFrom, date_to: dateTo })
      setCampData(res)
      if (onDataLoaded) onDataLoaded(res)
    } catch (e) {
      setError(e.message || 'Error al cargar campañas')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  function toggle(idx) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const rows    = campData?.rows    || []
  const summary = campData?.summary || {}
  const grandImpr   = rows.reduce((s, r) => s + (r.total?.impressions || 0), 0)
  const grandClicks = rows.reduce((s, r) => s + (r.total?.clicks || 0), 0)

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <h2 className="text-white font-semibold text-sm">Performance Campañas AutoEquity + Crédito</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#334155] text-[#94A3B8] uppercase tracking-wide">
            Google Ads + Meta
          </span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] hover:text-white hover:border-[#475569] transition-all disabled:opacity-50"
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[#64748B] text-sm">Conectando a Google Ads y Meta API...</span>
        </div>
      ) : campData && (
        <>
          {/* KPI mini-cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Spend (período)', value: fmtCurrency(summary.total_spend),                      color: '#6366F1' },
              { label: 'Impressões',      value: fmtNum(grandImpr),                                     color: '#94A3B8' },
              { label: 'Clicks',          value: fmtNum(grandClicks),                                   color: '#94A3B8' },
              { label: 'Leads (Beta)',    value: fmtNum(summary.total_leads),                           color: '#10B981' },
              { label: 'CPL (Beta)',      value: summary.avg_cpl ? fmtCurrency(summary.avg_cpl) : '—', color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3">
                <p className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-6 py-10 text-center">
              <p className="text-[#475569] text-sm">No se encontraron campañas en el período.</p>
            </div>
          ) : (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#334155] flex items-center gap-2">
                <span className="text-[#64748B] text-xs">{rows.length} campaña{rows.length !== 1 ? 's' : ''}</span>
                <span className="text-[#334155]">·</span>
                <span className="text-[#475569] text-xs">click para ver detalle diario</span>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0A1628]">
                    <th className="text-left px-4 py-3 text-[#64748B] font-semibold sticky left-0 bg-[#0A1628] z-10 whitespace-nowrap" style={{ minWidth: 260 }}>
                      Canal · Campaña
                    </th>
                    <th className="text-right px-4 py-3 text-indigo-400 font-semibold whitespace-nowrap">Spend</th>
                    <th className="text-right px-3 py-3 text-[#64748B] font-semibold whitespace-nowrap">Impr.</th>
                    <th className="text-right px-3 py-3 text-[#64748B] font-semibold whitespace-nowrap">Clicks</th>
                    <th className="text-right px-3 py-3 text-emerald-400 font-semibold whitespace-nowrap">Leads</th>
                    <th className="text-right px-4 py-3 text-yellow-400 font-semibold whitespace-nowrap">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isOpen = expanded.has(idx)
                    const badge  = CH_BADGE[row.channel] || { color: '#94A3B8', label: row.channel }
                    const t      = row.total || {}
                    const days   = Object.keys(row.daily || {}).sort()

                    return (
                      <React.Fragment key={idx}>
                        {/* ── Campaign summary row ── */}
                        <tr
                          onClick={() => toggle(idx)}
                          className={`border-t border-[#1a2535] cursor-pointer select-none transition-colors ${isOpen ? 'bg-[#182236]' : 'hover:bg-[#1a2535]'}`}
                        >
                          <td
                            className="px-4 py-3 sticky left-0 z-10 transition-colors"
                            style={{ background: isOpen ? '#182236' : '#1E293B' }}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Chevron */}
                              <span className={`flex-shrink-0 text-[9px] w-4 h-4 rounded flex items-center justify-center transition-colors
                                ${isOpen ? 'text-indigo-400 bg-indigo-500/15' : 'text-[#475569] bg-[#334155]/40'}`}>
                                {isOpen ? '▼' : '▶'}
                              </span>
                              {/* Channel + campaign name */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: badge.color }} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: badge.color }}>
                                    {badge.label}
                                  </span>
                                </div>
                                <span className="text-[#CBD5E1] font-medium leading-tight break-all">
                                  {row.campaign}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-right px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                            {fmtCurrency(t.spend)}
                          </td>
                          <td className="text-right px-3 py-3 font-mono text-[#64748B] whitespace-nowrap">
                            {t.impressions > 0 ? fmtNum(t.impressions) : '—'}
                          </td>
                          <td className="text-right px-3 py-3 font-mono text-[#64748B] whitespace-nowrap">
                            {t.clicks > 0 ? fmtNum(t.clicks) : '—'}
                          </td>
                          <td className="text-right px-3 py-3 font-mono whitespace-nowrap">
                            {row.show_leads && t.leads > 0
                              ? <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold">{t.leads}</span>
                              : <span className="text-[#2d3f55]">—</span>
                            }
                          </td>
                          <td className="text-right px-4 py-3 font-mono font-semibold whitespace-nowrap">
                            {row.show_leads && t.cpl
                              ? <span className="text-yellow-400">{fmtCurrency(t.cpl)}</span>
                              : <span className="text-[#2d3f55]">—</span>
                            }
                          </td>
                        </tr>

                        {/* ── Daily breakdown rows ── */}
                        {isOpen && days.map((d, di) => {
                          const v    = row.daily[d] || {}
                          const isLast = di === days.length - 1
                          const dCpl   = row.show_leads && v.leads > 0 && v.spend > 0
                            ? fmtCurrency(v.spend / v.leads) : null
                          return (
                            <tr key={d} className="border-t border-[#0d1724] bg-[#0d1a2e] hover:bg-[#0d1724] transition-colors">
                              <td className="sticky left-0 bg-[#0d1a2e] z-10 pl-11 pr-4 py-2 font-mono text-[#4a6080] whitespace-nowrap">
                                <span className="mr-1.5 opacity-30 text-[10px]">{isLast ? '└' : '├'}</span>
                                <span className="text-[#64748B]">{d.slice(5)}</span>
                              </td>
                              <td className="text-right px-4 py-2 font-mono text-[#94A3B8] whitespace-nowrap">
                                {v.spend > 0 ? fmtCurrency(v.spend) : <span className="text-[#2d3f55]">—</span>}
                              </td>
                              <td className="text-right px-3 py-2 font-mono text-[#475569] whitespace-nowrap">
                                {v.impressions > 0 ? fmtNum(v.impressions) : <span className="text-[#2d3f55]">—</span>}
                              </td>
                              <td className="text-right px-3 py-2 font-mono text-[#475569] whitespace-nowrap">
                                {v.clicks > 0 ? fmtNum(v.clicks) : <span className="text-[#2d3f55]">—</span>}
                              </td>
                              <td className="text-right px-3 py-2 font-mono whitespace-nowrap">
                                {row.show_leads
                                  ? (v.leads > 0
                                    ? <span className="text-emerald-400">{v.leads}</span>
                                    : <span className="text-[#2d3f55]">—</span>)
                                  : <span className="text-[#2d3f55]">—</span>
                                }
                              </td>
                              <td className="text-right px-4 py-2 font-mono whitespace-nowrap">
                                {dCpl ? <span className="text-yellow-400/70">{dCpl}</span> : <span className="text-[#2d3f55]">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}

                  {/* ── Grand total row ── */}
                  <tr className="border-t-2 border-[#334155] bg-[#0A1628]">
                    <td className="px-4 py-3 text-indigo-400 font-bold sticky left-0 bg-[#0A1628] z-10 whitespace-nowrap pl-11">
                      Total
                    </td>
                    <td className="text-right px-4 py-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                      {fmtCurrency(summary.total_spend)}
                    </td>
                    <td className="text-right px-3 py-3 font-mono text-[#475569] whitespace-nowrap">
                      {grandImpr > 0 ? fmtNum(grandImpr) : '—'}
                    </td>
                    <td className="text-right px-3 py-3 font-mono text-[#475569] whitespace-nowrap">
                      {grandClicks > 0 ? fmtNum(grandClicks) : '—'}
                    </td>
                    <td className="text-right px-3 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {summary.total_leads > 0 ? summary.total_leads : '—'}
                    </td>
                    <td className="text-right px-4 py-3 font-mono font-bold text-yellow-400 whitespace-nowrap">
                      {summary.avg_cpl ? fmtCurrency(summary.avg_cpl) : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function KavakCreditoPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState('2026-03-01')
  const [dateTo, setDateTo] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [campData, setCampData] = useState(null)

  const load = useCallback(async (from, to) => {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/ga4-credito/funnel-daily', { date_from: from, date_to: to })
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(dateFrom, dateTo) }, [])

  const handleDate = (e, field) => {
    const val = e.target.value
    const from = field === 'from' ? val : dateFrom
    const to   = field === 'to'   ? val : dateTo
    if (field === 'from') setDateFrom(val)
    else setDateTo(val)
    if (from && to) load(from, to)
  }

  const dates = data?.dates || []
  const rows  = data?.rows  || []

  // Build lookup: event → { date → count }
  const byEvent = {}
  rows.forEach(r => { byEvent[r.event] = r.values })

  const events = rows.map(r => r.event)

  // Média = average over all visible dates (including zeros)
  const avg = (event) => {
    const vals = byEvent[event] || {}
    const all = dates.map(d => vals[d] ?? 0)
    if (!all.length) return 0
    return all.reduce((a, b) => a + b, 0) / all.length
  }

  const conv = (eventA, eventB, date) => {
    const a = (byEvent[eventA] || {})[date] ?? 0
    const b = (byEvent[eventB] || {})[date] ?? 0
    return a > 0 ? (b / a) * 100 : null
  }

  const convAvg = (eventA, eventB) => {
    const vals = dates.map(d => conv(eventA, eventB, d)).filter(v => v !== null)
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const convTopAvg = (event) => {
    const vals = dates.map(d => conv(TOP_EVENT, event, d)).filter(v => v !== null)
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const orderedEvents = Object.keys(STEP_LABELS).filter(ev => events.includes(ev) || byEvent[ev])

  const totalCompleto = dates.reduce((s, d) => s + ((byEvent[COMPLETO_EVENT] || {})[d] ?? 0), 0)
  const totalAprobado = dates.reduce((s, d) => s + ((byEvent[APROBADO_EVENT] || {})[d] ?? 0), 0)
  const totalLeads    = dates.reduce((s, d) => s + ((byEvent[TOP_EVENT] || {})[d] ?? 0), 0)

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />
      <main className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="p-6 space-y-5" style={{ minWidth: 900 }}>

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-white text-2xl font-bold">Funil de Crédito Kavak</h1>
              <p className="text-[#64748B] text-sm mt-0.5">
                GA4 · {lastUpdated ? `Atualizado ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-2.5">
                <input type="date" value={dateFrom} onChange={e => handleDate(e, 'from')}
                  className="bg-transparent text-white text-sm outline-none" />
                <span className="text-[#475569]">→</span>
                <input type="date" value={dateTo} onChange={e => handleDate(e, 'to')}
                  className="bg-transparent text-white text-sm outline-none" />
              </div>
              <button onClick={() => load(dateFrom, dateTo)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: ACCENT }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Leads (Step 1 View)', value: fmt(totalLeads), color: '#94A3B8' },
              { label: 'Total Completos (Step 4)', value: fmt(totalCompleto), sub: totalLeads > 0 ? fmtPct(totalCompleto / totalLeads * 100) + ' dos leads' : null, color: '#F59E0B' },
              { label: 'Total Aprobados (Step 8)', value: fmt(totalAprobado), sub: totalCompleto > 0 ? fmtPct(totalAprobado / totalCompleto * 100) + ' dos completos' : 'Aguardando dados', color: '#10B981' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-[#1E293B] border border-[#334155] rounded-2xl px-5 py-4">
                <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
                <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                {sub && <p className="text-[#64748B] text-xs mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-[#64748B] text-sm">Carregando dados GA4...</span>
            </div>
          ) : (
            <>
              {/* ── VOLUME TABLE ── */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#334155] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                    <span className="text-white font-semibold text-sm">Funil de Crédito Kavak – Últimos {dates.length} Dias</span>
                  </div>
                  <span className="text-[#475569] text-xs">{dateFrom} → {dateTo}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0F172A]">
                        <th className="text-left px-4 py-3 text-[#64748B] font-semibold w-52 whitespace-nowrap">Evento / Data</th>
                        {dates.map(d => (
                          <th key={d} className="text-right px-2 py-3 text-[#64748B] font-semibold whitespace-nowrap">{d}</th>
                        ))}
                        <th className="text-right px-4 py-3 text-[#6366F1] font-semibold whitespace-nowrap">Média {dates.length}d</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-[#0F172A]/50">
                        <td colSpan={dates.length + 2} className="px-4 py-2 text-[#475569] font-bold text-[10px] uppercase tracking-wider">
                          VOLUME DE EVENTOS
                        </td>
                      </tr>
                      {Object.keys(STEP_LABELS).map(ev => {
                        const vals = byEvent[ev] || {}
                        const isCompleto = ev === COMPLETO_EVENT
                        const isAprobado = ev === APROBADO_EVENT
                        const highlight  = isCompleto || isAprobado
                        const media = avg(ev)
                        return (
                          <tr key={ev}
                            className={`border-t border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${highlight ? 'bg-[#334155]/20' : ''}`}>
                            <td className={`px-4 py-2.5 whitespace-nowrap font-medium ${highlight ? 'text-white' : 'text-[#94A3B8]'}`}>
                              {isCompleto && <span className="mr-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">COMPLETO</span>}
                              {isAprobado && <span className="mr-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">APROBADO</span>}
                              {STEP_LABELS[ev]}
                            </td>
                            {dates.map(d => (
                              <td key={d} className={`text-right px-2 py-2.5 font-mono ${highlight ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>
                                {vals[d] ?? 0}
                              </td>
                            ))}
                            <td className={`text-right px-4 py-2.5 font-mono font-semibold ${highlight ? 'text-[#6366F1]' : 'text-[#475569]'}`}>
                              {fmt(media)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── CONVERSION TABLE ── */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#334155] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-semibold text-sm">CONVERSÃO ETAPA → ETAPA (% da etapa anterior)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0F172A]">
                        <th className="text-left px-4 py-3 text-[#64748B] font-semibold w-52 whitespace-nowrap">Evento / Data</th>
                        {dates.map(d => (
                          <th key={d} className="text-right px-2 py-3 text-[#64748B] font-semibold whitespace-nowrap">{d}</th>
                        ))}
                        <th className="text-right px-4 py-3 text-[#6366F1] font-semibold whitespace-nowrap">Média {dates.length}d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const evList = Object.keys(CONV_LABELS)
                        const prevMap = {}
                        let prevEv = TOP_EVENT
                        evList.forEach(ev => { prevMap[ev] = prevEv; prevEv = ev })

                        return evList.map(ev => {
                          const pEv = prevMap[ev]
                          const media = convAvg(pEv, ev)
                          const isAprobado = ev === APROBADO_EVENT
                          return (
                            <tr key={ev} className={`border-t border-[#0F172A] ${isAprobado ? 'border-t-2 border-t-[#334155]' : ''}`}>
                              <td className={`px-4 py-2 whitespace-nowrap font-medium ${isAprobado ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                                {isAprobado ? '— ' : ''}{CONV_LABELS[ev]}
                              </td>
                              {dates.map(d => {
                                const pct = conv(pEv, ev, d)
                                return (
                                  <td key={d} className={`text-right px-2 py-2 font-mono font-semibold rounded-sm ${pct !== null ? convBg(pct) : 'text-[#334155]'}`}>
                                    {pct !== null ? fmtPct(pct) : '0%'}
                                  </td>
                                )
                              })}
                              <td className={`text-right px-4 py-2 font-mono font-bold ${convBg(media)}`}>
                                {media !== null ? fmtPct(media) : '—'}
                              </td>
                            </tr>
                          )
                        })
                      })()}

                      {/* Last row: Proposta / Topo */}
                      <tr className="border-t-2 border-[#334155]">
                        <td className="px-4 py-2 text-red-400 font-semibold whitespace-nowrap">— Proposta ✓ / Topo (Step1)</td>
                        {dates.map(d => {
                          const pct = conv(TOP_EVENT, APROBADO_EVENT, d)
                          return (
                            <td key={d} className={`text-right px-2 py-2 font-mono font-bold ${pct !== null ? convBg(pct) : 'bg-[#7f1d1d]/60 text-red-300'}`}>
                              {pct !== null ? fmtPct(pct) : '0%'}
                            </td>
                          )
                        })}
                        <td className={`text-right px-4 py-2 font-mono font-bold ${convBg(convTopAvg(APROBADO_EVENT))}`}>
                          {convTopAvg(APROBADO_EVENT) !== null ? fmtPct(convTopAvg(APROBADO_EVENT)) : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 px-1 pb-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#166534]/60 border border-emerald-500/30" /><span className="text-[#64748B] text-xs">≥70% bueno</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#854d0e]/60 border border-yellow-500/30" /><span className="text-[#64748B] text-xs">≥40% ok</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#7f1d1d]/60 border border-red-500/30" /><span className="text-[#64748B] text-xs">&lt;40% crítico</span></div>
              </div>
            </>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-[#334155]" />

          {/* ── Daily Spend USD ── */}
          <DailySpendTable campData={campData} />

          {/* ── Campaign Performance ── */}
          <CampaignSection dateFrom={dateFrom} dateTo={dateTo} onDataLoaded={setCampData} />

        </div>
      </main>
    </div>
  )
}
