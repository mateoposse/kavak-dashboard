import React, { useState, useEffect, useCallback } from 'react'
import { fetchDashboard } from '../utils/api.js'

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kavak_monthly_targets_v1'

function loadTargets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

// ── Month helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function todayLocal() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function pad(n) { return String(n).padStart(2, '0') }

function monthRange(year, month) {
  const t           = todayLocal()
  const isCurrent   = year === t.year && month === t.month
  const dateFrom    = `${year}-${pad(month)}-01`
  const lastDay     = isCurrent ? t.day : daysInMonth(year, month)
  const dateTo      = `${year}-${pad(month)}-${pad(lastDay)}`
  const daysElapsed = isCurrent ? t.day : daysInMonth(year, month)
  const totalDays   = daysInMonth(year, month)
  return { dateFrom, dateTo, isCurrent, daysElapsed, totalDays }
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}
function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

// ── Metric config ─────────────────────────────────────────────────────────────

const CVR_METRIC = {
  Sale:     { key: 'leads', label: 'Leads'     },
  Purchase: { key: 'regs',  label: 'Registers' },
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtBRL = n =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(n || 0)

const fmtNum = n =>
  (n == null || isNaN(n)) ? '—' : Math.round(n).toLocaleString('pt-BR')

// ── Inline editable target ────────────────────────────────────────────────────

function EditableTarget({ label, value, onSave, formatFn }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  function start()  { setDraft(value ? String(value) : ''); setEditing(true) }
  function commit() {
    const v = parseFloat(draft.replace(/[^0-9.]/g, ''))
    if (!isNaN(v) && v > 0) onSave(v)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[#475569] text-xs w-20 flex-shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            autoFocus type="text" inputMode="numeric"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={commit}
            className="flex-1 min-w-0 bg-[#0F172A] border border-[#334155] focus:border-[#475569] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
          />
          <button onClick={commit}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#334155] hover:bg-[#475569] transition-colors flex-shrink-0">
            ✓
          </button>
        </div>
      ) : (
        <button onClick={start}
          className="flex-1 text-left text-xs font-semibold flex items-center gap-1.5 group hover:opacity-70 transition-opacity">
          {value > 0
            ? <span className="text-white">{formatFn(value)}</span>
            : <span className="text-[#475569] italic font-normal">Definir target...</span>
          }
          <svg className="w-3 h-3 text-[#475569] group-hover:text-white flex-shrink-0 transition-colors"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Progress row ──────────────────────────────────────────────────────────────

function ProgressRow({ label, current, target, formatFn, accentColor, projection, isCurrent, timeElapsedPct }) {
  if (!target) return null
  const ratio   = current / target
  const pctDisp = ratio * 100

  let barColor = accentColor
  if (ratio > 1.05)     barColor = '#22C55E'
  else if (ratio < 0.7) barColor = '#EF4444'
  else if (ratio < 0.9) barColor = '#F59E0B'

  // Diferencia vs pace esperado (solo mes actual)
  const diff = isCurrent && timeElapsedPct != null ? pctDisp - timeElapsedPct : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between">
        <span className="text-[#94A3B8] text-xs font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-bold tabular-nums">{formatFn(current)}</span>
          <span className="text-[#475569] text-[10px]">/ {formatFn(target)}</span>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: barColor }}>
            {pctDisp.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Barra con marcador de pace */}
      <div className="relative h-2.5 bg-[#0F172A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: barColor }}
        />
        {/* Marca de % del mes transcurrido */}
        {isCurrent && timeElapsedPct != null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/40"
            style={{ left: `${Math.min(timeElapsedPct, 100)}%` }}
          />
        )}
      </div>

      {/* Pace del mes */}
      {isCurrent && timeElapsedPct != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] text-[10px]">Pace del mes:</span>
          <span className="text-[#64748B] text-[10px] font-semibold tabular-nums">
            {timeElapsedPct.toFixed(1)}%
          </span>
          {diff != null && (
            <span className="text-[10px] font-semibold tabular-nums"
              style={{ color: diff >= 0 ? '#22C55E' : '#EF4444' }}>
              {diff >= 0 ? `▲ +${diff.toFixed(1)}pp` : `▼ ${diff.toFixed(1)}pp`}
            </span>
          )}
        </div>
      )}

      {/* Proyección fin de mes */}
      {isCurrent && projection != null && projection > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] text-[10px]">Proyección fin de mes:</span>
          <span className="text-[#94A3B8] text-[10px] font-semibold tabular-nums">
            {formatFn(projection)}
          </span>
          <span className="text-[10px] font-semibold"
            style={{ color: projection >= target ? '#22C55E' : '#F59E0B' }}>
            {projection >= target ? '✓ sobre target' : '↓ bajo target'}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BudgetPacingCard({ campaignType, accentColor }) {
  const t0     = todayLocal()
  const [selYear,  setSelYear]  = useState(t0.year)
  const [selMonth, setSelMonth] = useState(t0.month)
  const [targets,  setTargets]  = useState(loadTargets)
  const [kpis,     setKpis]     = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
  }, [targets])

  const range   = monthRange(selYear, selMonth)
  const cvrMeta = CVR_METRIC[campaignType]
  const t       = targets[campaignType] || {}
  const spendT  = t.spend || 0
  const cvrT    = t.cvr   || 0

  // ── Fetch month data ────────────────────────────────────────────────────────
  const loadMonth = useCallback(async (year, month) => {
    setLoading(true)
    setKpis(null)
    try {
      const r      = monthRange(year, month)
      const result = await fetchDashboard({
        date_from: r.dateFrom,
        date_to:   r.dateTo,
        campaign_type: campaignType,
      })
      setKpis(result?.kpis || null)
    } catch {
      setKpis(null)
    } finally {
      setLoading(false)
    }
  }, [campaignType])

  useEffect(() => { loadMonth(selYear, selMonth) }, [selYear, selMonth, loadMonth])

  function goPrev() {
    const { year, month } = prevMonth(selYear, selMonth)
    setSelYear(year); setSelMonth(month)
  }
  function goNext() {
    const t      = todayLocal()
    const { year, month } = nextMonth(selYear, selMonth)
    if (year > t.year || (year === t.year && month > t.month)) return
    setSelYear(year); setSelMonth(month)
  }

  const isNextDisabled = (() => {
    const { year, month } = nextMonth(selYear, selMonth)
    const t = todayLocal()
    return year > t.year || (year === t.year && month > t.month)
  })()

  function setField(field, value) {
    setTargets(prev => ({
      ...prev,
      [campaignType]: { ...(prev[campaignType] || {}), [field]: value },
    }))
  }

  // ── Actuals ─────────────────────────────────────────────────────────────────
  const spend  = kpis?.spend          || 0
  const cvrVal = kpis?.[cvrMeta?.key] || 0

  // ── Projection (only for current month) ─────────────────────────────────────
  const factor    = range.totalDays / range.daysElapsed
  const spendProj = range.isCurrent && spend  > 0 ? spend  * factor : null
  const cvrProj   = range.isCurrent && cvrVal > 0 ? cvrVal * factor : null

  // ── % del mes transcurrido (pace de tiempo) ──────────────────────────────────
  const timeElapsedPct = range.isCurrent
    ? (range.daysElapsed / range.totalDays) * 100
    : null

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col gap-4 h-full">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-white font-semibold text-sm">Targets Mensuales</h3>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-1">
          <button onClick={goPrev}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[#475569] hover:text-white hover:bg-[#334155] transition-colors text-sm">
            ‹
          </button>
          <span className="text-white text-xs font-semibold w-32 text-center">
            {MONTH_NAMES[selMonth - 1]} {selYear}
            {loading && <span className="ml-1 text-[#475569] text-[10px]">…</span>}
          </span>
          <button onClick={goNext} disabled={isNextDisabled}
            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors text-sm
              ${isNextDisabled ? 'text-[#334155] cursor-not-allowed' : 'text-[#475569] hover:text-white hover:bg-[#334155]'}`}>
            ›
          </button>
        </div>
      </div>

      {/* Day counter */}
      {!loading && (
        <p className="text-[#475569] text-[10px] -mt-2">
          {range.isCurrent
            ? `Día ${range.daysElapsed} de ${range.totalDays} · datos hasta hoy`
            : `Mes completo · ${range.totalDays} días`
          }
        </p>
      )}

      {/* ── Target inputs ────────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-3 border-b border-[#334155]">
        <EditableTarget label="Spend" value={spendT} onSave={v => setField('spend', v)} formatFn={fmtBRL} />
        <EditableTarget label={cvrMeta?.label} value={cvrT} onSave={v => setField('cvr', v)} formatFn={fmtNum} />
      </div>

      {/* ── Progress ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4 animate-pulse flex-1">
          <div className="h-3 bg-[#334155] rounded w-full" />
          <div className="h-2.5 bg-[#334155] rounded-full w-3/4" />
          <div className="h-3 bg-[#334155] rounded w-full mt-4" />
          <div className="h-2.5 bg-[#334155] rounded-full w-1/2" />
        </div>
      ) : (spendT > 0 || cvrT > 0) ? (
        <div className="space-y-4 flex-1">
          <ProgressRow
            label="Spend"
            current={spend}
            target={spendT}
            formatFn={fmtBRL}
            accentColor={accentColor}
            projection={spendProj}
            isCurrent={range.isCurrent}
            timeElapsedPct={timeElapsedPct}
          />
          <ProgressRow
            label={cvrMeta?.label}
            current={cvrVal}
            target={cvrT}
            formatFn={fmtNum}
            accentColor={accentColor}
            projection={cvrProj}
            isCurrent={range.isCurrent}
            timeElapsedPct={timeElapsedPct}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#475569] text-xs text-center">
            Definí los targets para ver el progreso
          </p>
        </div>
      )}
    </div>
  )
}
