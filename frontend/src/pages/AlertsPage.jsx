import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { fetchAlerts } from '../utils/api.js'

// ── Severity config ──────────────────────────────────────────────────────────

const SEV = {
  critica: {
    label: 'CRÍTICA',
    dot: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    text: '#FCA5A5',
    badge: 'bg-red-500/20 text-red-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  alta: {
    label: 'ALTA',
    dot: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    text: '#FDBA74',
    badge: 'bg-orange-500/20 text-orange-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  media: {
    label: 'MEDIA',
    dot: '#EAB308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.2)',
    text: '#FDE047',
    badge: 'bg-yellow-500/20 text-yellow-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  positiva: {
    label: 'POSITIVA',
    dot: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    text: '#6EE7B7',
    badge: 'bg-emerald-500/20 text-emerald-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
}

const TIPO_LABELS = {
  conversion: 'Conversión',
  pacing: 'Pacing',
  cpa: 'CPA',
  roas: 'ROAS',
  ctr: 'CTR',
  cpm: 'CPM',
}

const CHANNEL_COLORS = {
  'Facebook Ads': '#1877F2',
  'Google Ads': '#4285F4',
  'Taboola Ads': '#00C8FF',
  'Tiktok Ads': '#94A3B8',
  'Other Paid': '#6B7280',
  'Todos': '#94A3B8',
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, count, config, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[130px] rounded-2xl border p-4 text-left transition-all duration-200 ${
        active ? 'ring-1' : 'opacity-80 hover:opacity-100'
      }`}
      style={{
        background: active ? config.bg : 'rgba(30,41,59,0.6)',
        borderColor: active ? config.border : '#334155',
        ringColor: config.dot,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: config.dot }}>{config.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.text }}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-white">{count}</div>
      <div className="text-xs text-[#475569] mt-0.5">
        {count === 1 ? 'alerta' : 'alertas'}
      </div>
    </button>
  )
}

// ── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEV[alert.severidad] || SEV.media
  const chColor = CHANNEL_COLORS[alert.entidad.canal] || '#94A3B8'
  const isNeg = (alert.variacion_pct || 0) < 0
  const varColor = alert.severidad === 'positiva'
    ? (isNeg ? '#EF4444' : '#10B981')
    : (isNeg ? '#10B981' : '#EF4444')

  return (
    <div
      className="rounded-2xl border transition-all duration-200"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Header row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Severity icon */}
          <div className="mt-0.5 flex-shrink-0" style={{ color: cfg.dot }}>
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Top row: badges + delta */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#334155] text-[#94A3B8] uppercase tracking-wide">
                {TIPO_LABELS[alert.tipo] || alert.tipo}
              </span>
              {/* Channel badge */}
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: chColor + '22',
                  color: chColor,
                }}
              >
                {alert.entidad.canal}
              </span>
              {/* Vertical badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                alert.entidad.vertical === 'Sale'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-blue-500/15 text-blue-400'
              }`}>
                {alert.entidad.vertical}
              </span>

              {/* Urgency */}
              <span className="ml-auto text-xs text-[#475569] flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {alert.urgencia_horas === 1 ? 'Ya' : `${alert.urgencia_horas}h`}
              </span>
            </div>

            {/* Metric + values */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">{alert.metrica}</span>
              <span className="text-xs text-[#475569]">
                {typeof alert.valor_actual === 'number' ? alert.valor_actual.toLocaleString('es', { maximumFractionDigits: 2 }) : '—'}
                {' '}vs{' '}
                {typeof alert.valor_referencia === 'number' ? alert.valor_referencia.toLocaleString('es', { maximumFractionDigits: 2 }) : '—'}
                {' '}
                <span className="text-[#334155]">({alert.tipo_referencia?.replace('_', ' ')})</span>
              </span>
              <span
                className="ml-auto text-base font-bold tabular-nums flex-shrink-0"
                style={{ color: varColor }}
              >
                {(alert.variacion_pct || 0) >= 0 ? '+' : ''}
                {(alert.variacion_pct || 0).toFixed(1)}%
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
              {alert.descripcion}
            </p>
          </div>

          {/* Expand chevron */}
          <span className="text-[#475569] flex-shrink-0 mt-1 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {/* Expanded: recommendation */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-[#334155] pt-3 flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              <span className="text-[#F59E0B] font-semibold">Acción: </span>
              {alert.recomendacion}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-4 h-4 rounded-full bg-[#334155] mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 w-16 bg-[#334155] rounded-full" />
                <div className="h-4 w-20 bg-[#334155] rounded-full" />
                <div className="h-4 w-24 bg-[#334155] rounded-full" />
              </div>
              <div className="h-4 w-48 bg-[#334155] rounded" />
              <div className="h-3 w-full bg-[#334155] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page constants ────────────────────────────────────────────────────────────

const SEV_FILTERS = ['all', 'critica', 'alta', 'media', 'positiva']
const TIPO_FILTERS = ['all', 'conversion', 'pacing', 'cpa', 'ctr', 'cpm']
const VERT_FILTERS = ['all', 'Sale', 'Purchase']

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d) {
  return d.toISOString().split('T')[0]
}

function getAutoDate() {
  const now = new Date()
  const offset = now.getHours() < 12 ? 2 : 1
  const d = new Date(now)
  d.setDate(d.getDate() - offset)
  return toISO(d)
}

function buildDateOptions() {
  const autoDate = getAutoDate()
  const options = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = toISO(d)
    const mmdd = iso.slice(5).replace('-', '/')
    const dayLabel = i === 1 ? 'Ayer' : i === 2 ? 'Anteayer' : `Hace ${i} días`
    options.push({ iso, label: `${dayLabel} · ${mmdd}`, isAuto: iso === autoDate })
  }
  return options
}

export default function AlertsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [tipoFilter, setTipoFilter] = useState('all')
  const [vertFilter, setVertFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(getAutoDate)

  const dateOptions = buildDateOptions()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchAlerts(selectedDate)
      setData(res)
    } catch (e) {
      setError(e.message || 'Error al cargar alertas')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { load() }, [load])

  const alerts = data?.alertas || []
  const resumen = data?.resumen || {}

  const filtered = alerts.filter(a => {
    if (sevFilter  !== 'all' && a.severidad           !== sevFilter)  return false
    if (tipoFilter !== 'all' && a.tipo                !== tipoFilter) return false
    if (vertFilter !== 'all' && a.entidad?.vertical   !== vertFilter) return false
    return true
  })

  const hasCritical = (resumen.criticas || 0) > 0

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Alertas de Performance</h1>
                {hasCritical && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    {resumen.criticas} CRÍTICA{resumen.criticas > 1 ? 'S' : ''}
                  </span>
                )}
              </div>
              {resumen.periodo_referencia && (
                <p className="text-sm text-[#475569] mt-1">
                  Análisis de <span className="text-[#94A3B8]">{resumen.fecha_analisis}</span>
                  {' '}· Referencia: <span className="text-[#94A3B8]">{resumen.periodo_referencia}</span>
                </p>
              )}
            </div>

            {/* Date selector + refresh */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Date picker */}
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="appearance-none bg-[#1E293B] border border-[#334155] text-sm text-[#94A3B8] rounded-xl pl-8 pr-8 py-2 outline-none hover:border-[#475569] hover:text-white transition-all cursor-pointer"
                >
                  {dateOptions.map(opt => (
                    <option key={opt.iso} value={opt.iso}>
                      {opt.label}{opt.isAuto ? ' ✦' : ''}
                    </option>
                  ))}
                </select>
                {/* Calendar icon */}
                <svg className="w-3.5 h-3.5 text-[#475569] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {/* Chevron icon */}
                <svg className="w-3 h-3 text-[#475569] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Refresh */}
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-sm text-[#94A3B8] hover:text-white hover:border-[#475569] transition-all disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Summary cards ──────────────────────────────────────────────── */}
          {!loading && data && (
            <div className="flex gap-3 flex-wrap">
              {['critica', 'alta', 'media', 'positiva'].map(sev => (
                <SummaryCard
                  key={sev}
                  label={SEV[sev].label}
                  count={resumen[sev === 'critica' ? 'criticas' : sev === 'alta' ? 'altas' : sev === 'media' ? 'medias' : 'positivas'] || 0}
                  config={SEV[sev]}
                  active={sevFilter === sev}
                  onClick={() => setSevFilter(prev => prev === sev ? 'all' : sev)}
                />
              ))}
              <div className="flex-1 min-w-[130px] rounded-2xl border border-[#334155] bg-[#1E293B] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Total</span>
                </div>
                <div className="text-3xl font-bold text-white">{resumen.total_alertas || 0}</div>
                <div className="text-xs text-[#475569] mt-0.5">alertas activas</div>
              </div>
            </div>
          )}

          {/* ── Filters row ────────────────────────────────────────────────── */}
          {!loading && alerts.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {/* Tipo filter */}
              <div className="flex items-center gap-1 bg-[#1E293B] border border-[#334155] rounded-xl p-1">
                {TIPO_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setTipoFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tipoFilter === f
                        ? 'bg-[#334155] text-white'
                        : 'text-[#475569] hover:text-[#94A3B8]'
                    }`}
                  >
                    {f === 'all' ? 'Todos los tipos' : TIPO_LABELS[f] || f}
                  </button>
                ))}
              </div>

              {/* Vertical filter */}
              <div className="flex items-center gap-1 bg-[#1E293B] border border-[#334155] rounded-xl p-1">
                {VERT_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setVertFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      vertFilter === f
                        ? 'bg-[#334155] text-white'
                        : 'text-[#475569] hover:text-[#94A3B8]'
                    }`}
                  >
                    {f === 'all' ? 'Ambas verticales' : f}
                  </button>
                ))}
              </div>

              {/* Active filter count */}
              {(sevFilter !== 'all' || tipoFilter !== 'all' || vertFilter !== 'all') && (
                <button
                  onClick={() => { setSevFilter('all'); setTipoFilter('all'); setVertFilter('all') }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#94A3B8] hover:text-white border border-[#334155] hover:border-[#475569] bg-[#1E293B] transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar filtros · {filtered.length} de {alerts.length}
                </button>
              )}
            </div>
          )}

          {/* ── Alert list ─────────────────────────────────────────────────── */}
          {loading ? (
            <Skeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">Sin alertas</p>
              <p className="text-[#475569] text-sm mt-1">
                {alerts.length > 0 ? 'No hay alertas con los filtros actuales' : 'Todas las métricas dentro de los rangos normales'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(a => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          {!loading && data && (
            <p className="text-center text-xs text-[#334155] pb-4">
              Actualizado: {new Date(resumen.ultima_actualizacion).toLocaleString('es-AR')}
              {' · '}Motor de reglas: 7d ref vs día anterior · Sale + Purchase
            </p>
          )}

        </div>
      </main>
    </div>
  )
}
