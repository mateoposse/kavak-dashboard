import React, { useMemo, useState, useEffect } from 'react'
import { fetchDashboard } from '../utils/api.js'

// ── Week helpers ───────────────────────────────────────────────────────────────

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns n weeks including the current (possibly incomplete) week
function getRecentWeeks(n = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, …
  // Days since Monday (ISO week starts Monday)
  const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weeks = []
  for (let i = 0; i < n; i++) {
    const mon = new Date(today)
    mon.setDate(today.getDate() - daysSinceMon - i * 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const end = sun > today ? today : sun  // cap at today if ongoing
    weeks.push({ start: toISO(mon), end: toISO(end), isCurrent: i === 0 })
  }
  return weeks // [0] = current/most recent week, [1] = last closed, …
}

function getISOWeek(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1)
  const diff = d - startOfWeek1
  return Math.floor(diff / 604800000) + 1
}

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function weekLabel(range) {
  if (!range?.start) return '—'
  const d = new Date(range.start + 'T00:00:00')
  return `S${getISOWeek(d)}`
}

function fmtLabel(range) {
  if (!range?.start) return '—'
  const [, m, d]   = range.start.split('-')
  const [, me, de] = range.end.split('-')
  return `${parseInt(d)} ${MONTH_SHORT[parseInt(m) - 1]} – ${parseInt(de)} ${MONTH_SHORT[parseInt(me) - 1]}`
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}

function fmtBRL(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(n)
}

// ── Metric definitions ─────────────────────────────────────────────────────────

const METRICS = {
  Sale: [
    { key: 'spend',      label: 'Spend',       fmt: fmtBRL, section: 'volume'     },
    { key: 'impr',       label: 'Impressions', fmt: fmtNum, section: 'volume'     },
    { key: 'clicks',     label: 'Clicks',      fmt: fmtNum, section: 'volume'     },
    { key: 'leads',      label: 'Leads',       fmt: fmtNum, section: 'conversion' },
    { key: 'qual_leads', label: 'Qual. Leads', fmt: fmtNum, section: 'conversion' },
    { key: 'buyers',     label: 'Buyers',      fmt: fmtNum, section: 'conversion' },
  ],
  Purchase: [
    { key: 'spend',     label: 'Spend',       fmt: fmtBRL, section: 'volume'     },
    { key: 'impr',      label: 'Impressions', fmt: fmtNum, section: 'volume'     },
    { key: 'clicks',    label: 'Clicks',      fmt: fmtNum, section: 'volume'     },
    { key: 'regs',      label: 'Registers',   fmt: fmtNum, section: 'conversion' },
    { key: 'inps',      label: 'Inspections', fmt: fmtNum, section: 'conversion' },
    { key: 'purchases', label: 'Purchases',   fmt: fmtNum, section: 'conversion' },
  ],
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ count }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 animate-pulse">
      <div className="h-4 w-48 bg-[#334155] rounded mb-5" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 h-3 bg-[#334155] rounded" />
            <div className="flex-1 h-7 bg-[#334155] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Single metric row ──────────────────────────────────────────────────────────

function MetricRow({ metric, prev, curr, delta, accentColor }) {
  const { label, fmt } = metric
  const rowMax = Math.max(prev || 0, curr || 0)

  const prevPct = rowMax > 0 && prev ? Math.max((prev / rowMax) * 100, 2) : 0
  const currPct = rowMax > 0 && curr ? Math.max((curr / rowMax) * 100, 2) : 0

  const deltaColor = delta == null ? '#475569'
    : delta > 5  ? '#22C55E'
    : delta < -5 ? '#EF4444'
    : '#F59E0B'

  return (
    <div className="grid grid-cols-[7rem_1fr_1fr_4.5rem] items-center gap-2">
      {/* Metric name */}
      <span className="text-[#94A3B8] text-xs font-medium truncate">{label}</span>

      {/* Prev bar (right-aligned) */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-[#475569] text-[11px] tabular-nums w-16 text-right">
          {fmt(prev)}
        </span>
        <div className="w-28 h-6 bg-[#0F172A] rounded-lg overflow-hidden flex items-center justify-end">
          <div
            className="h-full rounded-lg bg-[#334155] transition-all duration-700"
            style={{ width: `${prevPct}%` }}
          />
        </div>
      </div>

      {/* Curr bar (left-aligned) */}
      <div className="flex items-center gap-2">
        <div className="w-28 h-6 bg-[#0F172A] rounded-lg overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-700"
            style={{ width: `${currPct}%`, backgroundColor: accentColor }}
          />
        </div>
        <span className="text-white text-[11px] font-semibold tabular-nums w-16">
          {fmt(curr)}
        </span>
      </div>

      {/* Delta */}
      <span
        className="text-[11px] font-bold tabular-nums text-right"
        style={{ color: deltaColor }}
      >
        {delta == null ? '—' : (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%'}
      </span>
    </div>
  )
}

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-[#334155]" />
      <span className="text-[#475569] text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      <div className="flex-1 h-px bg-[#334155]" />
    </div>
  )
}

// ── Week select dropdown ───────────────────────────────────────────────────────

function WeekSelect({ weeks, value, onChange, accentColor, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#475569] text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-[#0F172A] border border-[#334155] rounded-lg px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-[#475569] cursor-pointer"
        style={{ color: accentColor || 'white' }}
      >
        {weeks.map((w, i) => (
          <option key={i} value={i} style={{ color: 'white', backgroundColor: '#0F172A' }}>
            {weekLabel(w)} · {fmtLabel(w)}{w.isCurrent ? ' ★' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Pre-computed week list (module-level, stable) ──────────────────────────────

const WEEKS = getRecentWeeks(14)

// ── Component ──────────────────────────────────────────────────────────────────

export default function FunnelChart({ campaignType, accentColor }) {
  const metrics = METRICS[campaignType] || []

  // currIdx: index of the "current" (right) week
  // prevIdx: index of the "previous" (left) week
  const [currIdx, setCurrIdx] = useState(0)  // most recent by default
  const [prevIdx, setPrevIdx] = useState(1)  // one before by default

  const [currKpis,  setCurrKpis]  = useState(null)
  const [prevKpis,  setPrevKpis]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  const currWeek = WEEKS[currIdx]
  const prevWeek = WEEKS[prevIdx]

  // Fetch both weeks whenever selection or campaignType changes
  useEffect(() => {
    if (!currWeek || !prevWeek) return
    let cancelled = false
    setLoading(true)
    setCurrKpis(null)
    setPrevKpis(null)

    Promise.all([
      fetchDashboard({ date_from: currWeek.start, date_to: currWeek.end, campaign_type: campaignType }),
      fetchDashboard({ date_from: prevWeek.start, date_to: prevWeek.end, campaign_type: campaignType }),
    ])
      .then(([curr, prev]) => {
        if (cancelled) return
        setCurrKpis(curr?.kpis || null)
        setPrevKpis(prev?.kpis || null)
      })
      .catch(() => {
        if (cancelled) return
        setCurrKpis(null)
        setPrevKpis(null)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currIdx, prevIdx, campaignType])

  // Compute delta locally
  const delta = useMemo(() => {
    if (!currKpis || !prevKpis) return {}
    const d = {}
    for (const key of Object.keys(currKpis)) {
      const c = currKpis[key], p = prevKpis[key]
      d[key] = (c == null || p == null || p === 0) ? null : ((c - p) / p) * 100
    }
    return d
  }, [currKpis, prevKpis])

  const rows = useMemo(() => {
    return metrics.map(m => ({
      ...m,
      prev:  prevKpis?.[m.key]  ?? null,
      curr:  currKpis?.[m.key]  ?? null,
      delta: delta[m.key]       ?? null,
    }))
  }, [currKpis, prevKpis, delta, campaignType])

  if (loading) return <Skeleton count={metrics.length} />

  const noData = !currKpis && !loading

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-white font-semibold text-sm">Comparación Semanal</h3>

        {!noData && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Prev week selector */}
            <WeekSelect
              weeks={WEEKS}
              value={prevIdx}
              onChange={setPrevIdx}
              accentColor="#94A3B8"
              label="Base"
            />

            <span className="text-[#334155] text-xs font-bold">vs</span>

            {/* Curr week selector */}
            <WeekSelect
              weeks={WEEKS}
              value={currIdx}
              onChange={setCurrIdx}
              accentColor={accentColor}
              label="Comp."
            />
          </div>
        )}
      </div>

      {noData ? (
        <p className="text-[#475569] text-xs text-center py-6">
          No hay datos para las semanas seleccionadas.
        </p>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[7rem_1fr_1fr_4.5rem] items-center gap-2 mb-3">
            <div />
            <div className="text-[10px] text-[#475569] text-right pr-2 uppercase tracking-wider font-semibold">
              {weekLabel(prevWeek)}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold pl-2"
              style={{ color: accentColor }}>
              {weekLabel(currWeek)}
            </div>
            <div className="text-[10px] text-[#475569] text-right uppercase tracking-wider font-semibold">
              Δ%
            </div>
          </div>

          {/* Metric rows with section dividers */}
          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const prevRow = rows[i - 1]
              const showDivider = i > 0 && row.section !== prevRow?.section
              return (
                <React.Fragment key={row.key}>
                  {showDivider && <SectionDivider label="Conversión" />}
                  <MetricRow
                    metric={row}
                    prev={row.prev}
                    curr={row.curr}
                    delta={row.delta}
                    accentColor={accentColor}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
