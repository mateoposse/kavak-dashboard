import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import { fetchInventoryWeekly, fetchRotation } from '../utils/api.js'

const ACCENT = '#22D3EE'

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtN    = v => v == null ? '—' : Math.round(v).toLocaleString('pt-BR')
const fmtPct  = v => v == null ? '—' : `${Number(v).toFixed(1)}%`
const fmtPix  = v => v == null ? '—' : Number(v).toFixed(3)
const fmtDays = v => v == null ? '—' : `${Number(v).toFixed(0)}d`
const fmtMoh  = v => v == null ? '—' : Number(v).toFixed(2)
const fmtGMV  = v => {
  if (v == null) return '—'
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  return `R$${Math.round(v / 1_000)}k`
}
const fmtR$   = v => v == null ? '—' : `R$${Math.round(v).toLocaleString('pt-BR')}`
const fmtDec  = (v, d = 1) => v == null ? '—' : Number(v).toFixed(d)

// ── Color helpers ─────────────────────────────────────────────────────────────
const retColor  = r => r == null ? '#64748B' : r >= 85 ? '#10B981' : r >= 70 ? '#F59E0B' : '#EF4444'
const pixColor  = p => p == null ? '#94A3B8' : p >= 1.0 ? '#EF4444' : p >= 0.96 ? '#F59E0B' : '#10B981'
const agingColor= a => a == null ? '#94A3B8' : a > 90 ? '#EF4444' : a > 60 ? '#F59E0B' : '#94A3B8'

const PIX_BUCKET_COLORS = {
  '< 0.81':    '#10B981',
  '0.81-0.87': '#34D399',
  '0.87-0.92': '#A3E635',
  '0.92-0.96': '#FBBF24',
  '0.96-1.0':  '#F59E0B',
  '1.0-1.1':   '#F97316',
  '1.1-1.2':   '#EF4444',
  '≥ 1.2':     '#991B1B',
}

const AGING_BUCKET_COLORS = {
  '0-30':   '#22D3EE',
  '30-60':  '#94A3B8',
  '60-90':  '#F59E0B',
  '90-120': '#F97316',
  '120+':   '#EF4444',
}

const CAT_COLORS = {
  'Quase zero':  '#10B981',
  'Seminovo':    '#3B82F6',
  'Usado Novo':  '#8B5CF6',
  'Usado Maduro':'#F59E0B',
  'Outlet':      '#F97316',
  'Repasse':     '#EF4444',
  'Others':      '#475569',
}

const VIP_BUCKET_COLORS = {
  '0 VIPs': '#475569',
  '1-10':   '#64748B',
  '11-50':  '#94A3B8',
  '51-200': '#22D3EE',
  '200+':   '#F59E0B',
}

const CONDITION_COLORS = {
  'Competitivo': '#10B981',
  'Normal':      '#F59E0B',
  'Caro':        '#EF4444',
}

// ── Condition Badge ────────────────────────────────────────────────────────────
function ConditionBadge({ condition }) {
  if (!condition) return <span className="text-[#475569]">—</span>
  const color = CONDITION_COLORS[condition] || '#64748B'
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {condition}
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col gap-1.5">
      <span className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider leading-none">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: color || 'white' }}>
        {value}
      </span>
      {sub && <span className="text-[#64748B] text-[11px] leading-none">{sub}</span>}
    </div>
  )
}

// ── Collapsible Section ───────────────────────────────────────────────────────
function CollapsibleSection({ title, sub, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#334155]/20 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-white font-semibold text-sm">{title}</h2>
            {badge && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {sub && <p className="text-[#64748B] text-[11px] mt-0.5">{sub}</p>}
        </div>
        <svg
          className={`w-4 h-4 text-[#475569] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ── WoW Car Detail Table (Chile style) ────────────────────────────────────────
function WowCarTable({ data }) {
  if (!data?.length) {
    return (
      <p className="text-[#475569] text-xs py-6 text-center">Sin autos en esta categoría</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]">
            {['#', 'Marca / Modelo', 'Stock ID', 'Precio', 'PIX', 'Días', 'VIPs 7d', 'Leads 7d', 'VIPs/día', 'Condición'].map(h => (
              <th
                key={h}
                className="pb-2.5 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pix    = row.pix ?? null
            const aging  = row.aging_days ?? null
            const vips   = row.vip_7d ?? 0
            const vipDay = vips > 0 ? (vips / 7).toFixed(1) : '—'

            return (
              <tr
                key={i}
                className="border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors"
              >
                <td className="py-2.5 text-[#475569] font-mono pl-0 pr-2">{i + 1}</td>
                <td className="py-2.5 px-2 text-[#E2E8F0] font-medium whitespace-nowrap">
                  {row.car_brand && row.car_model
                    ? `${row.car_brand} ${row.car_model}`
                    : <span className="text-[#475569]">—</span>}
                </td>
                <td className="py-2.5 px-2 text-[#64748B] font-mono text-[10px] whitespace-nowrap">
                  {row.stock_id}
                </td>
                <td className="py-2.5 px-2 text-right text-[#94A3B8] tabular-nums">
                  {fmtR$(row.price)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: pixColor(pix) }}>
                  {fmtPix(pix)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold" style={{ color: agingColor(aging) }}>
                  {fmtDays(aging)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: ACCENT }}>
                  {fmtN(vips)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-[#94A3B8]">
                  {fmtN(row.leads_7d)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-[#64748B]">
                  {vipDay}
                </td>
                <td className="py-2.5 px-2 text-right">
                  <ConditionBadge condition={row.condition} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── WoW Detail Section (Chile Style) ─────────────────────────────────────────
function WowDetailSection({ weeks }) {
  const wowWeeks = weeks.filter(w => w.wow != null)
  const [selIdx, setSelIdx] = useState(wowWeeks.length - 1)
  const [activeTab, setActiveTab] = useState('stayed')

  if (!wowWeeks.length) {
    return <p className="text-[#475569] text-xs py-4 text-center">Sin datos WoW disponibles</p>
  }

  const idx       = Math.min(selIdx, wowWeeks.length - 1)
  const selWeek   = wowWeeks[idx]
  const wow       = selWeek?.wow
  const detail    = selWeek?.wow_detail
  const summary   = selWeek?.summary

  const TABS = [
    { key: 'stayed',  label: 'Permanecieron', count: wow?.stayed,  color: '#3B82F6', desc: 'estaban y siguen' },
    { key: 'new_in',  label: 'Ingresaron',    count: wow?.new_in,  color: '#10B981', desc: 'nuevos esta semana' },
    { key: 'dropped', label: 'Salieron',       count: wow?.dropped, color: '#EF4444', desc: 'no están esta semana' },
  ]

  const carData = detail?.[activeTab] ?? []
  const activeTabObj = TABS.find(t => t.key === activeTab)

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Summary stats */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Total</div>
            <div className="text-lg font-bold text-white tabular-nums">{fmtN(summary?.total_autos)}</div>
          </div>
          <div className="w-px h-8 bg-[#334155]" />
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Permanecieron</div>
            <div className="text-base font-bold text-[#3B82F6] tabular-nums">{fmtN(wow?.stayed)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Ingresaron</div>
            <div className="text-base font-bold text-[#10B981] tabular-nums">{fmtN(wow?.new_in)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Salieron</div>
            <div className="text-base font-bold text-[#EF4444] tabular-nums">{fmtN(wow?.dropped)}</div>
          </div>
          <div className="w-px h-8 bg-[#334155]" />
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Retención</div>
            <div className="text-base font-bold tabular-nums" style={{ color: retColor(wow?.retention_rate) }}>
              {fmtPct(wow?.retention_rate)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Rotación</div>
            <div className="text-base font-bold text-[#F59E0B] tabular-nums">{fmtPct(wow?.rotation_rate)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Δ Autos</div>
            <div
              className="text-base font-bold tabular-nums"
              style={{ color: (wow?.wow_change ?? 0) >= 0 ? '#10B981' : '#EF4444' }}
            >
              {wow?.wow_change != null
                ? `${wow.wow_change >= 0 ? '+' : ''}${wow.wow_change}`
                : '—'}
            </div>
          </div>
        </div>

        {/* Week selector */}
        <select
          value={idx}
          onChange={e => setSelIdx(+e.target.value)}
          className="bg-[#0F172A] border border-[#334155] text-[#E2E8F0] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22D3EE]"
        >
          {wowWeeks.map((w, i) => (
            <option key={i} value={i}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1.5">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: isActive ? `${tab.color}22` : 'transparent',
                color: isActive ? tab.color : '#64748B',
                border: `1px solid ${isActive ? `${tab.color}44` : '#334155'}`,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isActive ? tab.color : '#475569' }}
              />
              {tab.label}
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums"
                style={{ backgroundColor: isActive ? `${tab.color}33` : '#1E293B', color: isActive ? tab.color : '#475569' }}
              >
                {fmtN(tab.count)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active tab description */}
      {activeTabObj && (
        <p className="text-[#64748B] text-[11px]">
          Top {carData.length} autos por VIPs · <span style={{ color: activeTabObj.color }}>{activeTabObj.label}</span>
          {' '}— {activeTabObj.desc} · ordenados por visitas (VIPs 7 días)
        </p>
      )}

      {/* Car detail table */}
      <WowCarTable data={carData} />
    </div>
  )
}

// ── Summary Pivot Table ───────────────────────────────────────────────────────
const SUMMARY_METRICS = [
  { key: 'total_autos',        label: 'Total Autos',            fmt: fmtN,    dir: 'neutral'  },
  { key: 'avg_pix',            label: 'PIX Promedio',            fmt: fmtPix,  dir: 'neutral'  },
  { key: 'pct_above_fipe',     label: '% Sobre FIPE (≥1.0)',     fmt: fmtPct,  dir: 'up_bad'   },
  { key: 'avg_pix_above_fipe', label: 'PIX Prom. ≥1.0',          fmt: fmtPix,  dir: 'up_bad'   },
  { key: 'n_below_fipe',       label: '# Bajo FIPE',             fmt: fmtN,    dir: 'up_good'  },
  { key: 'avg_aging',          label: 'Aging Prom. (días)',      fmt: fmtDays, dir: 'up_bad'   },
  { key: 'pct_over_60d',       label: '% Antigüedad >60d',       fmt: fmtPct,  dir: 'up_bad'   },
  { key: 'avg_moh',            label: 'MoH Promedio',            fmt: fmtMoh,  dir: 'up_bad'   },
  { key: 'gmv',                label: 'GMV en Stock',            fmt: fmtGMV,  dir: 'neutral'  },
  { key: 'pct_zero_vips',      label: '% Sin Tráfico (0 VIPs)',  fmt: fmtPct,  dir: 'up_bad'   },
  { key: 'avg_vips_per_car',   label: 'VIPs/Auto (prom.)',       fmt: fmtDec,  dir: 'up_good'  },
]

function SummaryPivot({ weeks }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#334155]">
            <th className="text-left text-[#64748B] text-[10px] font-semibold pb-2.5 pr-6 min-w-[185px]">
              Métrica
            </th>
            {weeks.map(w => (
              <th
                key={w.label}
                className="text-right text-[#64748B] text-[10px] font-semibold pb-2.5 px-3 min-w-[95px] whitespace-nowrap"
              >
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SUMMARY_METRICS.map((m, mi) => (
            <tr
              key={m.key}
              className={`border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${
                mi % 2 === 1 ? 'bg-[#0F172A]/20' : ''
              }`}
            >
              <td className="py-2.5 pr-6 text-[#94A3B8] font-medium whitespace-nowrap">
                {m.label}
              </td>
              {weeks.map((w, wi) => {
                const val     = w.summary[m.key]
                const prevVal = wi > 0 ? weeks[wi - 1].summary[m.key] : null
                let color = '#E2E8F0'
                if (wi > 0 && val != null && prevVal != null) {
                  const delta = Number(val) - Number(prevVal)
                  if (Math.abs(delta) > 0.001) {
                    if (m.dir === 'up_bad')  color = delta > 0 ? '#EF4444' : '#10B981'
                    if (m.dir === 'up_good') color = delta > 0 ? '#10B981' : '#EF4444'
                  }
                }
                return (
                  <td
                    key={wi}
                    className="py-2.5 px-3 text-right tabular-nums font-semibold"
                    style={{ color }}
                  >
                    {m.fmt(val)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[#475569] text-[10px] mt-3">
        Color indica variación vs semana anterior: 🟢 mejora · 🔴 empeora · blanco = sin cambio o neutro
      </p>
    </div>
  )
}

// ── Bucket Pivot (PIX / Aging / Category) ────────────────────────────────────
function BucketPivot({ weeks, bucketKey, keyField, colorMap }) {
  if (!weeks?.length) return null
  const firstWeek = weeks.find(w => w[bucketKey]?.length > 0)
  if (!firstWeek) return null
  const bucketLabels = firstWeek[bucketKey].map(r => r[keyField])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#334155]">
            <th className="text-left text-[#64748B] text-[10px] font-semibold pb-2.5 pr-6 min-w-[120px]">
              Rango
            </th>
            {weeks.map(w => (
              <th
                key={w.label}
                className="text-right text-[#64748B] text-[10px] font-semibold pb-2.5 px-3 min-w-[105px] whitespace-nowrap"
              >
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bucketLabels.map((bl, bi) => {
            const labelColor = colorMap?.[bl] || '#94A3B8'
            return (
              <tr
                key={bl}
                className={`border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${
                  bi % 2 === 1 ? 'bg-[#0F172A]/20' : ''
                }`}
              >
                <td
                  className="py-2.5 pr-6 font-semibold whitespace-nowrap text-[11px]"
                  style={{ color: labelColor }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: labelColor }}
                  />
                  {bl}
                </td>
                {weeks.map((w, wi) => {
                  const row = (w[bucketKey] ?? []).find(r => r[keyField] === bl)
                  const n   = row?.n ?? 0
                  const pct = row?.pct ?? 0
                  return (
                    <td key={wi} className="py-2.5 px-3 text-right tabular-nums">
                      {n > 0 ? (
                        <span>
                          <span className="text-white font-bold">{fmtN(n)}</span>
                          <span className="text-[#64748B] text-[10px] ml-1">({fmtPct(pct)})</span>
                        </span>
                      ) : (
                        <span className="text-[#334155]">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── VIP Distribution Pivot ────────────────────────────────────────────────────
function VipDistributionPivot({ weeks }) {
  if (!weeks?.length) return null
  const firstWeek = weeks.find(w => w.by_vip_dist?.length > 0)
  if (!firstWeek) return null
  const buckets = firstWeek.by_vip_dist.map(r => r.bucket)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#334155]">
            <th className="text-left text-[#64748B] text-[10px] font-semibold pb-2.5 pr-6 min-w-[110px]">
              Bucket VIPs/semana
            </th>
            {weeks.map(w => (
              <th
                key={w.label}
                className="text-right text-[#64748B] text-[10px] font-semibold pb-2.5 px-3 min-w-[120px] whitespace-nowrap"
              >
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buckets.map((bkt, bi) => {
            const labelColor = VIP_BUCKET_COLORS[bkt] || '#94A3B8'
            return (
              <tr
                key={bkt}
                className={`border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${
                  bi % 2 === 1 ? 'bg-[#0F172A]/20' : ''
                }`}
              >
                <td
                  className="py-2.5 pr-6 font-semibold whitespace-nowrap text-[11px]"
                  style={{ color: labelColor }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: labelColor }}
                  />
                  {bkt}
                </td>
                {weeks.map((w, wi) => {
                  const row      = (w.by_vip_dist ?? []).find(r => r.bucket === bkt)
                  const nAutos   = row?.n_autos  ?? 0
                  const pctAutos = row?.pct_autos ?? 0
                  const pctVips  = row?.pct_vips  ?? 0
                  return (
                    <td key={wi} className="py-2.5 px-3 text-right tabular-nums">
                      {nAutos > 0 ? (
                        <div className="leading-tight">
                          <div>
                            <span className="text-white font-bold">{fmtN(nAutos)}</span>
                            <span className="text-[#64748B] text-[10px] ml-1">({fmtPct(pctAutos)})</span>
                          </div>
                          {pctVips > 0 && (
                            <div
                              className="text-[9px] mt-0.5"
                              style={{ color: bkt === '0 VIPs' ? '#475569' : ACCENT }}
                            >
                              {fmtPct(pctVips)} tráfico
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#334155]">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-[#475569] text-[10px] mt-3">
        "% tráfico" = % del total de VIPs semanales captados por ese bucket ·
        "0 VIPs" = autos sin ninguna visita en los últimos 7 días
      </p>
    </div>
  )
}

// ── Top Performers Table ──────────────────────────────────────────────────────
function TopPerformersTable({ data }) {
  if (!data?.length) {
    return <p className="text-[#475569] text-xs py-4 text-center">Sin datos disponibles</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]">
            {['#', 'Marca / Modelo', 'Stock ID', 'Precio', 'PIX', 'Días', 'VIPs 7d', 'Leads 7d', 'Condición', 'Categoría'].map(h => (
              <th
                key={h}
                className="pb-2.5 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const catColor = CAT_COLORS[row.category] || '#64748B'
            return (
              <tr
                key={i}
                className="border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors"
              >
                <td className="py-2.5 pl-0 pr-2 text-[#475569] font-mono">{i + 1}</td>
                <td className="py-2.5 px-2 text-[#E2E8F0] font-medium whitespace-nowrap">
                  {row.car_brand && row.car_model
                    ? `${row.car_brand} ${row.car_model}`
                    : <span className="text-[#64748B]">{row.sku ?? '—'}</span>}
                </td>
                <td className="py-2.5 px-2 text-[#64748B] font-mono text-[10px]">{row.stock_id}</td>
                <td className="py-2.5 px-2 text-right text-[#94A3B8] tabular-nums">{fmtR$(row.price)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: pixColor(row.pix) }}>
                  {fmtPix(row.pix)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold" style={{ color: agingColor(row.aging_days) }}>
                  {fmtDays(row.aging_days)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: ACCENT }}>
                  {fmtN(row.vip_7d)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-[#94A3B8]">
                  {fmtN(row.leads_7d)}
                </td>
                <td className="py-2.5 px-2 text-right">
                  <ConditionBadge condition={row.condition} />
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    style={{ backgroundColor: `${catColor}22`, color: catColor }}
                  >
                    {row.category ?? '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Top Offenders Table ───────────────────────────────────────────────────────
// High-VIP cars still available after ≥14 days — demand exists but no conversion
function OffendersTable({ data }) {
  if (!data?.length) {
    return <p className="text-[#475569] text-xs py-4 text-center">Sin ofensores detectados</p>
  }

  const leadRateColor = r => {
    if (r == null) return '#475569'
    if (r >= 15)  return '#10B981'
    if (r >= 5)   return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="space-y-3">
      <p className="text-[#64748B] text-[11px]">
        Autos con alta demanda (top 40% de VIPs) que llevan ≥14 días publicados sin convertir ·
        <span className="text-[#EF4444]"> Lead rate baja</span> = muchas visitas pero pocos leads → señal de precio alto o problema de ficha
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#334155]">
              {['#', 'Marca / Modelo', 'Stock ID', 'Precio', 'PIX', 'Días', 'VIPs 7d', 'Leads 7d', 'Lead Rate', 'Condición', 'Categoría'].map(h => (
                <th
                  key={h}
                  className="pb-2.5 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const catColor  = CAT_COLORS[row.category] || '#64748B'
              const lrColor   = leadRateColor(row.lead_rate)
              // Highlight rows: Caro + low lead rate = biggest opportunity
              const isHot     = row.condition === 'Caro' && (row.lead_rate ?? 100) < 5
              return (
                <tr
                  key={i}
                  className={`border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${
                    isHot ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="py-2.5 pl-0 pr-2 text-[#475569] font-mono">{i + 1}</td>
                  <td className="py-2.5 px-2 font-medium whitespace-nowrap">
                    <span className="text-[#E2E8F0]">
                      {row.car_brand && row.car_model
                        ? `${row.car_brand} ${row.car_model}`
                        : <span className="text-[#64748B]">—</span>}
                    </span>
                    {isHot && (
                      <span className="ml-1.5 text-[9px] text-[#EF4444] font-bold">⚠ AJUSTAR</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-[#64748B] font-mono text-[10px]">{row.stock_id}</td>
                  <td className="py-2.5 px-2 text-right text-[#94A3B8] tabular-nums">{fmtR$(row.price)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: pixColor(row.pix) }}>
                    {fmtPix(row.pix)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-semibold" style={{ color: agingColor(row.aging_days) }}>
                    {fmtDays(row.aging_days)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: ACCENT }}>
                    {fmtN(row.vip_7d)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-[#94A3B8]">
                    {fmtN(row.leads_7d)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: lrColor }}>
                    {row.lead_rate != null ? `${Number(row.lead_rate).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <ConditionBadge condition={row.condition} />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                      style={{ backgroundColor: `${catColor}22`, color: catColor }}
                    >
                      {row.category ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[#475569] text-[10px]">
        ⚠ AJUSTAR = PIX ≥ 1.0 + lead rate &lt; 5% → candidatos prioritarios para bajada de precio ·
        Lead Rate = leads_7d / vip_7d × 100 · Solo semana más reciente
      </p>
    </div>
  )
}

// ── Performance Feed Lists ────────────────────────────────────────────────────
function CopyBox({ ids, title, desc, color, idKey }) {
  const [copied, setCopied] = useState(false)
  const text = ids.map(r => r.stock_id).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[13px]">{title}</span>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-md"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {ids.length} IDs
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-semibold px-3 py-1 rounded-lg border transition-colors"
          style={copied
            ? { borderColor: '#10B981', color: '#10B981', backgroundColor: '#10B98122' }
            : { borderColor: '#334155', color: ACCENT, backgroundColor: 'transparent' }}
        >
          {copied ? '✓ Copied!' : 'Copy All'}
        </button>
      </div>
      <p className="text-[#64748B] text-[11px] leading-relaxed">{desc}</p>
      <textarea
        readOnly
        rows={6}
        value={text}
        className="w-full bg-[#1E293B] border border-[#334155] rounded-lg p-2.5 text-[#94A3B8] font-mono text-[11px] leading-relaxed resize-y focus:outline-none focus:border-[#22D3EE]"
        onClick={e => e.target.select()}
      />
    </div>
  )
}

function FeedListsSection({ signals }) {
  if (!signals) {
    return <p className="text-[#475569] text-xs py-4 text-center">Sin datos disponibles</p>
  }

  const exclusionList = signals.exclusion_list ?? []
  const boostList     = signals.boost_list     ?? []
  const stuck         = signals.stuck_inventory ?? {}
  const stuckCats     = stuck.by_category  ?? []
  const stuckModels   = stuck.top_models   ?? []

  return (
    <div className="space-y-6">

      {/* ── Copy boxes ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CopyBox
          ids={exclusionList}
          title="Exclusion List"
          color="#8B5CF6"
          desc="200+ VIPs this week — enough organic traffic to convert. Remove from paid campaigns to free up budget for cars that actually need help."
        />
        <CopyBox
          ids={boostList}
          title="Boost Priority"
          color={ACCENT}
          desc="≤21 days old + 0–10 VIPs — in peak conversion window but not getting visibility. Activate in campaigns NOW before day 21."
        />
      </div>

      {/* ── Boost detail table ─────────────────────────────────────────── */}
      {boostList.length > 0 && (
        <div>
          <p className="text-[#64748B] text-[11px] font-semibold uppercase tracking-wider mb-3">
            Boost Priority — Detail
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#334155]">
                  {['#', 'Car', 'Stock ID', 'Age', 'VIPs 7d', 'Price', 'PIX', 'Category'].map(h => (
                    <th
                      key={h}
                      className="pb-2.5 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boostList.map((row, i) => {
                  const catColor = CAT_COLORS[row.category] || '#64748B'
                  const urgent   = row.aging_days >= 18
                  const soon     = row.aging_days >= 14 && !urgent
                  return (
                    <tr
                      key={i}
                      className={`border-b border-[#0F172A] hover:bg-[#334155]/20 transition-colors ${urgent ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="py-2.5 pl-0 pr-2 text-[#475569] font-mono">{i + 1}</td>
                      <td className="py-2.5 px-2 text-[#E2E8F0] font-medium whitespace-nowrap">
                        {row.car_brand && row.car_model ? `${row.car_brand} ${row.car_model}` : <span className="text-[#475569]">—</span>}
                      </td>
                      <td className="py-2.5 px-2 text-[#64748B] font-mono text-[10px]">{row.stock_id}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: agingColor(row.aging_days) }}>
                        {fmtDays(row.aging_days)}
                        {urgent && <span className="ml-1 text-[9px] text-[#EF4444] font-bold">URGENT</span>}
                        {soon   && <span className="ml-1 text-[9px] text-[#F59E0B] font-bold">SOON</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#64748B]">{fmtN(row.vip_7d)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#94A3B8]">{fmtR$(row.price)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: pixColor(row.pix) }}>
                        {fmtPix(row.pix)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: `${catColor}22`, color: catColor }}>
                          {row.category ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[#475569] text-[10px] mt-2">URGENT = day 18–21 · window closing fast · SOON = day 14–17</p>
        </div>
      )}

      {/* ── Hard to sell divider ───────────────────────────────────────── */}
      <div className="border-t border-[#334155] pt-5">
        <div className="mb-3">
          <h3 className="text-white font-bold text-[13px]">Hard to Sell — Purchasing Signal</h3>
          <p className="text-[#64748B] text-[11px] mt-1 leading-relaxed">
            Cars with <strong className="text-[#94A3B8]">60+ days on lot</strong> AND{' '}
            <strong className="text-[#94A3B8]">&lt;10 VIPs</strong> — invisible and stuck.
            Use this to understand which car profiles to{' '}
            <strong className="text-[#F59E0B]">buy less of</strong>.
            {stuck.count > 0 && (
              <span className="text-[#EF4444] font-bold ml-1">
                {stuck.count} cars stuck · {fmtGMV(stuck.gmv)} GMV locked
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By segment */}
          <div>
            <p className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider mb-2">By Segment</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#334155]">
                  {['Segment', 'Stuck', '% of seg.', 'Avg age', 'GMV'].map((h, i) => (
                    <th key={h} className="pb-2 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stuckCats.map((row, i) => {
                  const catColor = CAT_COLORS[row.category] || '#64748B'
                  const sevColor = row.pct_of_cat >= 30 ? '#EF4444' : row.pct_of_cat >= 15 ? '#F59E0B' : '#94A3B8'
                  return (
                    <tr key={i} className="border-b border-[#0F172A] hover:bg-[#334155]/20">
                      <td className="py-2 pl-0 pr-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: `${catColor}22`, color: catColor }}>
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-[#E2E8F0] font-bold tabular-nums">{row.n}</td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums" style={{ color: sevColor }}>{fmtPct(row.pct_of_cat)}</td>
                      <td className="py-2 px-2 text-right text-[#64748B] tabular-nums">{fmtDays(row.avg_aging)}</td>
                      <td className="py-2 px-2 text-right text-[#475569] tabular-nums">{fmtGMV(row.gmv)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* By model */}
          <div>
            <p className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider mb-2">By Model — Buy Less</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#334155]">
                  {['Model', '# stuck', 'Avg age', 'Avg PIX', 'Signal'].map((h, i) => (
                    <th key={h} className="pb-2 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left px-2 first:pl-0 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stuckModels.map((row, i) => {
                  const sigColor = row.n >= 5 ? '#EF4444' : row.n >= 3 ? '#F59E0B' : '#64748B'
                  const sigLabel = row.n >= 5 ? 'BUY LESS' : row.n >= 3 ? 'REVIEW' : 'watch'
                  return (
                    <tr key={i} className="border-b border-[#0F172A] hover:bg-[#334155]/20">
                      <td className="py-2 pl-0 pr-2 text-[#E2E8F0] font-medium whitespace-nowrap">
                        {row.car_brand} {row.car_model}
                      </td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums" style={{ color: sigColor }}>{row.n}</td>
                      <td className="py-2 px-2 text-right text-[#64748B] tabular-nums">{fmtDays(row.avg_aging)}</td>
                      <td className="py-2 px-2 text-right tabular-nums font-bold" style={{ color: pixColor(row.avg_pix) }}>
                        {fmtPix(row.avg_pix)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-[9px] font-bold" style={{ color: sigColor }}>{sigLabel}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Price Adjustment Recommendations ─────────────────────────────────────────
function PriceRecsTable({ data }) {
  if (!data?.length) {
    return (
      <p className="text-[#475569] text-xs py-4 text-center">
        Sin vehículos elegibles para ajuste de precio
      </p>
    )
  }

  const gapColor = g => g == null || g <= 0 ? '#10B981' : g <= 3 ? '#F59E0B' : '#EF4444'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]">
            {['SKU', 'Hub', 'Semanas', 'Precio actual', 'FIPE', 'PIX actual', 'PIX similares', 'Gap (pp)', 'Desc. cons.', 'Precio cons.'].map(h => (
              <th
                key={h}
                className="pb-2.5 text-[#64748B] font-semibold text-[10px] uppercase tracking-wider text-right first:text-left whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.stock_id ?? i}
              className={`border-b border-[#0F172A] hover:bg-[#334155]/50 transition-colors ${
                row.weeks_in_stock > 10 ? 'bg-red-500/5' : ''
              }`}
            >
              <td className="py-2.5 text-[#94A3B8] font-mono text-[10px]">
                {row.old_sku ?? row.stock_id}
              </td>
              <td className="py-2.5 text-right text-[#64748B]">{row.hub_name ?? '—'}</td>
              <td className="py-2.5 text-right">
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color: row.weeks_in_stock > 10 ? '#EF4444'
                         : row.weeks_in_stock > 7  ? '#F59E0B'
                         : '#94A3B8',
                  }}
                >
                  {row.weeks_in_stock != null ? `${row.weeks_in_stock}s` : '—'}
                  {row.weeks_in_stock > 10 && ' 🔴'}
                </span>
              </td>
              <td className="py-2.5 text-right text-[#E2E8F0] tabular-nums">{fmtR$(row.publication_price)}</td>
              <td className="py-2.5 text-right text-[#64748B] tabular-nums">{fmtR$(row.fipe_price)}</td>
              <td
                className="py-2.5 text-right tabular-nums font-bold"
                style={{ color: (row.current_price_index ?? 0) > 100 ? '#EF4444' : '#F59E0B' }}
              >
                {fmtDec(row.current_price_index)}
              </td>
              <td className="py-2.5 text-right text-[#64748B] tabular-nums">
                {row.similar_median_price_index != null
                  ? `${fmtDec(row.similar_median_price_index)} (${row.similar_sales_90d ?? 0}v)`
                  : '—'}
              </td>
              <td
                className="py-2.5 text-right tabular-nums font-bold"
                style={{ color: gapColor(row.gap_vs_market_pp) }}
              >
                {row.gap_vs_market_pp != null ? `+${fmtDec(row.gap_vs_market_pp)}pp` : '—'}
              </td>
              <td className="py-2.5 text-right text-[#F59E0B] tabular-nums font-bold">
                {row.discount_conservative_pct != null ? `-${fmtDec(row.discount_conservative_pct)}%` : '—'}
              </td>
              <td className="py-2.5 text-right text-[#10B981] tabular-nums font-bold">
                {fmtR$(row.price_conservative)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[#475569] text-[10px] mt-3">
        🔴 Prioridad máxima (&gt;10 semanas) · Descuento conservador: máx −2% · Piso = costo de compra × 1.01
      </p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        {Array(9).fill(0).map((_, i) => (
          <div key={i} className="h-20 bg-[#1E293B] rounded-xl" />
        ))}
      </div>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="h-48 bg-[#1E293B] rounded-xl" />
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RotationPage() {
  const [invData, setInvData]         = useState(null)
  const [rotData, setRotData]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++fetchRef.current
    setLoading(true)
    setError('')
    try {
      const [inv, rot] = await Promise.all([
        fetchInventoryWeekly(),
        fetchRotation().catch(() => null),
      ])
      if (id !== fetchRef.current) return
      setInvData(inv)
      setRotData(rot)
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      if (id !== fetchRef.current) return
      setError(err.message || 'Error al cargar datos de inventario')
    } finally {
      if (id === fetchRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const weeks        = invData?.weeks ?? []
  const latest       = weeks[weeks.length - 1]
  const summary      = latest?.summary ?? {}
  const priceRecs    = rotData?.price_recs ?? []
  const topCount     = invData?.top_performers?.length ?? 0
  const recsCount    = priceRecs.length
  const offenders    = invData?.top_offenders ?? []
  const offendersCount = offenders.length
  const hotOffenders = offenders.filter(o => o.condition === 'Caro' && (o.lead_rate ?? 100) < 5).length
  const signals      = invData?.campaign_signals ?? null
  const exclCount    = signals?.exclusion_list?.length ?? 0
  const boostCount   = signals?.boost_list?.length ?? 0

  const avgPix = summary.avg_pix
  const avgPixColor = avgPix >= 1.0 ? '#EF4444' : avgPix >= 0.96 ? '#F59E0B' : '#10B981'

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title="Inventario"
          accentColor={ACCENT}
          lastUpdated={lastUpdated}
          onRefresh={load}
          loading={loading}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button onClick={load} className="text-red-400 hover:text-red-300 text-xs underline ml-4">
                Reintentar
              </button>
            </div>
          )}

          {loading ? <LoadingSkeleton /> : (
            <>
              {/* ── KPI Cards ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                <KpiCard
                  label="Autos Publicados"
                  value={fmtN(summary.total_autos)}
                  sub={latest?.label ?? 'semana actual'}
                />
                <KpiCard
                  label="PIX Promedio"
                  value={fmtPix(avgPix)}
                  sub="precio publicado / FIPE"
                  color={avgPixColor}
                />
                <KpiCard
                  label="Sobre FIPE"
                  value={fmtPct(summary.pct_above_fipe)}
                  sub="PIX ≥ 1.0 (caros)"
                  color={(summary.pct_above_fipe ?? 0) > 20 ? '#EF4444'
                    : (summary.pct_above_fipe ?? 0) > 10 ? '#F59E0B' : '#10B981'}
                />
                <KpiCard
                  label="PIX Prom. Caros"
                  value={fmtPix(summary.avg_pix_above_fipe)}
                  sub="promedio de los PIX ≥ 1.0"
                  color={(summary.avg_pix_above_fipe ?? 0) > 1.05 ? '#EF4444' : '#F97316'}
                />
                <KpiCard
                  label="Bajo FIPE"
                  value={fmtN(summary.n_below_fipe)}
                  sub="PIX < 1.0 (con datos FIPE)"
                  color="#10B981"
                />
                <KpiCard
                  label="Aging Promedio"
                  value={fmtDays(summary.avg_aging)}
                  sub="días desde 1ª publicación"
                  color={(summary.avg_aging ?? 0) > 60 ? '#EF4444'
                    : (summary.avg_aging ?? 0) > 45 ? '#F59E0B' : '#22D3EE'}
                />
                <KpiCard
                  label="Antigüedad >60d"
                  value={fmtPct(summary.pct_over_60d)}
                  sub="% del catálogo"
                  color={(summary.pct_over_60d ?? 0) > 35 ? '#EF4444'
                    : (summary.pct_over_60d ?? 0) > 25 ? '#F59E0B' : '#94A3B8'}
                />
                <KpiCard
                  label="MoH Promedio"
                  value={fmtMoh(summary.avg_moh)}
                  sub="meses est. para agotar inv."
                  color={(summary.avg_moh ?? 0) > 3 ? '#EF4444'
                    : (summary.avg_moh ?? 0) > 2 ? '#F59E0B' : '#10B981'}
                />
                <KpiCard
                  label="GMV en Stock"
                  value={fmtGMV(summary.gmv)}
                  sub="suma de precios publicados"
                />
              </div>

              {/* ── WoW Rotation (Chile style) ─────────────────────────────────── */}
              <CollapsibleSection
                title="Rotación Semanal del Catálogo"
                sub="Vehículos que permanecen, ingresan y salen semana a semana · tablas detalladas con precio, PIX y tráfico"
              >
                <WowDetailSection weeks={weeks} />
              </CollapsibleSection>

              {/* ── Summary Pivot ──────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Resumen Semanal"
                sub="Todas las métricas clave semana a semana · verde = mejora · rojo = empeora vs semana anterior"
              >
                <SummaryPivot weeks={weeks} />
              </CollapsibleSection>

              {/* ── PIX Pivot ─────────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Distribución PIX por Semana"
                sub="# vehículos y % del catálogo por rango de PIX (precio / FIPE) · ≥1.0 = sobre FIPE (rojo)"
              >
                <BucketPivot
                  weeks={weeks}
                  bucketKey="by_pix_bucket"
                  keyField="bucket"
                  colorMap={PIX_BUCKET_COLORS}
                />
              </CollapsibleSection>

              {/* ── Aging Pivot ────────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Distribución Antigüedad por Semana"
                sub="# vehículos y % del catálogo por rango de días desde primera publicación"
              >
                <BucketPivot
                  weeks={weeks}
                  bucketKey="by_aging"
                  keyField="bucket"
                  colorMap={AGING_BUCKET_COLORS}
                />
              </CollapsibleSection>

              {/* ── Category Pivot ─────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Mix por Categoría"
                sub="# vehículos y % del catálogo por segmento · basado en año del modelo y km"
              >
                <BucketPivot
                  weeks={weeks}
                  bucketKey="by_category"
                  keyField="category"
                  colorMap={CAT_COLORS}
                />
              </CollapsibleSection>

              {/* ── VIP Distribution ──────────────────────────────────────────── */}
              <CollapsibleSection
                title="Distribución de Tráfico (VIPs)"
                sub="Cómo se distribuye el tráfico entre el catálogo · '% tráfico' = share de visitas captadas por bucket"
              >
                <VipDistributionPivot weeks={weeks} />
              </CollapsibleSection>

              {/* ── Top Performers ─────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Top Vehículos por Tráfico"
                sub="Vehículos con más visitas (VIPs) en los últimos 7 días · semana más reciente"
                badge={topCount > 0
                  ? { label: `${topCount} autos`, bg: '#22D3EE22', text: ACCENT }
                  : undefined}
              >
                <TopPerformersTable data={invData?.top_performers} />
              </CollapsibleSection>

              {/* ── Top Offenders ──────────────────────────────────────────────── */}
              <CollapsibleSection
                title="Top Offenders — Alta Demanda Sin Conversión"
                sub="Autos con muchos VIPs que llevan ≥14 días sin vender · Lead Rate baja = señal de precio alto"
                badge={hotOffenders > 0
                  ? { label: `${hotOffenders} críticos`, bg: '#EF444433', text: '#EF4444' }
                  : offendersCount > 0
                  ? { label: `${offendersCount} autos`, bg: '#F59E0B22', text: '#F59E0B' }
                  : undefined}
              >
                <OffendersTable data={offenders} />
              </CollapsibleSection>

              {/* ── Price Adjustment ───────────────────────────────────────────── */}
              <CollapsibleSection
                title="Ajuste de Precios Sugerido"
                sub="Vehículos ≥ 4 semanas sin venta · precio encima de la mediana de similares · descuento conservador máx −2%"
                defaultOpen={false}
                badge={recsCount > 0
                  ? { label: `${recsCount} autos`, bg: '#EF444433', text: '#EF4444' }
                  : undefined}
              >
                <PriceRecsTable data={priceRecs} />
              </CollapsibleSection>

              {/* ── Performance Feed Lists ─────────────────────────────────────── */}
              <CollapsibleSection
                title="Performance Feed Lists"
                sub="Copy-paste ready stock ID lists for Google & Meta campaigns · Exclusions + Boost priority + Hard-to-sell purchasing signal"
                defaultOpen={false}
                badge={(exclCount + boostCount) > 0
                  ? { label: `${exclCount + boostCount} IDs ready`, bg: '#8B5CF622', text: '#8B5CF6' }
                  : undefined}
              >
                <FeedListsSection signals={signals} />
              </CollapsibleSection>

              {/* ── Footer Notes ───────────────────────────────────────────────── */}
              <div className="space-y-1 pb-4">
                <p className="text-[#334155] text-[10px]">
                  • <strong className="text-[#475569]">PIX</strong> = precio publicado / FIPE vigente ·
                  PIX &lt; 1.0 = por debajo de FIPE (competitivo) · PIX ≥ 1.0 = por encima (caro) ·
                  "Bajo FIPE" solo cuenta autos con datos FIPE disponibles
                </p>
                <p className="text-[#334155] text-[10px]">
                  • <strong className="text-[#475569]">MoH</strong> (Months on Hand) = meses estimados para agotar
                  el inventario actual al ritmo de ventas histórico del SKU · fuente: serving.moh
                </p>
                <p className="text-[#334155] text-[10px]">
                  • <strong className="text-[#475569]">GMV</strong> (Gross Merchandise Value) = suma del precio
                  publicado de todos los autos en stock = capital total inmovilizado en inventario
                </p>
                <p className="text-[#334155] text-[10px]">
                  • Rotación: compara stock_ids publicados semana N vs N−1 ·
                  Permanecen = intersección · Ingresan = nuevos · Salen = no aparecen en semana actual
                </p>
                <p className="text-[#334155] text-[10px]">
                  • VIPs y Leads: período actual (últimos 7 días), el mismo valor se usa para todas las semanas ·
                  Excluidos: B2B consignados, crab cars, fleet cars · País: BR
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
