import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import DateRangePicker, { getDefaultRange } from '../components/DateRangePicker.jsx'
import { fetchInventory, fetchDashboard } from '../utils/api.js'

const ACCENT = '#F97316'  // orange — distinto de Sales (verde) y Purchase (azul)

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtPct  = v => v == null ? '—' : `${(v * 100).toFixed(1)}%`
const fmtPix  = v => v == null ? '—' : v.toFixed(3)
const fmtNum  = v => v == null ? '—' : Math.round(v).toLocaleString('pt-BR')
const fmtDec  = (v, d = 1) => v == null ? '—' : v.toFixed(d)

// ── Colores de PIX ────────────────────────────────────────────────────────────
function pixColor(pix) {
  if (pix == null) return '#94A3B8'
  if (pix < 0.87) return '#22C55E'
  if (pix < 0.92) return '#F59E0B'
  return '#EF4444'
}

function agingColor(days) {
  if (days == null) return '#94A3B8'
  if (days <= 30)  return '#22C55E'
  if (days <= 60)  return '#F59E0B'
  return '#EF4444'
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[#64748B] text-[11px] font-medium uppercase tracking-wider">{label}</span>
      <span className="text-white text-2xl font-bold tabular-nums" style={{ color: color || 'white' }}>
        {value}
      </span>
      {sub && <span className="text-[#64748B] text-[11px]">{sub}</span>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="mb-3">
      <h2 className="text-white font-semibold text-sm">{title}</h2>
      {sub && <p className="text-[#64748B] text-[11px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Tabla genérica ────────────────────────────────────────────────────────────
function DataTable({ cols, rows, keyField }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]">
            {cols.map(c => (
              <th key={c.key} className={`pb-2 text-[#64748B] font-semibold uppercase tracking-wider text-[10px] ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[keyField] ?? i} className="border-b border-[#1E293B] hover:bg-[#1E293B]/50 transition-colors">
              {cols.map(c => (
                <td key={c.key} className={`py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.render ? c.render(row[c.key], row) : (
                    <span className="text-[#94A3B8] tabular-nums">{row[c.key] ?? '—'}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Bar horizontal ────────────────────────────────────────────────────────────
function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color || ACCENT }} />
      </div>
      <span className="text-[#94A3B8] text-[11px] tabular-nums w-12 text-right">{fmtNum(value)}</span>
    </div>
  )
}

// ── CTR Trend desde sales data ─────────────────────────────────────────────────
function CtrTrendTable({ trends }) {
  if (!trends || trends.length === 0) return <p className="text-[#475569] text-xs">Sin datos de CTR</p>

  const sorted = [...trends].sort((a, b) => new Date(a.week_start) - new Date(b.week_start))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]">
            {['Semana', 'CTR', 'Spend', 'Impr', 'Clicks'].map(h => (
              <th key={h} className="pb-2 text-[#64748B] font-semibold uppercase tracking-wider text-[10px] text-right first:text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const ctr = row.impr > 0 ? (row.clicks / row.impr) * 100 : null
            const isLow = ctr != null && ctr < 2.5
            const isHigh = ctr != null && ctr > 4.0
            return (
              <tr key={i} className="border-b border-[#1E293B] hover:bg-[#1E293B]/50 transition-colors">
                <td className="py-2.5 text-[#94A3B8]">
                  {new Date(row.week_start).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                </td>
                <td className="py-2.5 text-right font-bold tabular-nums"
                  style={{ color: isHigh ? '#22C55E' : isLow ? '#EF4444' : '#F59E0B' }}>
                  {ctr != null ? `${ctr.toFixed(2)}%` : '—'}
                </td>
                <td className="py-2.5 text-right text-[#94A3B8] tabular-nums">
                  {row.spend != null ? `R$${Math.round(row.spend / 1000)}k` : '—'}
                </td>
                <td className="py-2.5 text-right text-[#94A3B8] tabular-nums">
                  {row.impr != null ? `${Math.round(row.impr / 1000)}k` : '—'}
                </td>
                <td className="py-2.5 text-right text-[#94A3B8] tabular-nums">
                  {row.clicks != null ? fmtNum(row.clicks) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PricingDashboard() {
  const defaultRange = getDefaultRange()
  const [dateFrom, setDateFrom]   = useState(defaultRange.date_from)
  const [dateTo, setDateTo]       = useState(defaultRange.date_to)
  const [inv, setInv]             = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchRef = useRef(0)

  const load = useCallback(async (from, to) => {
    const id = ++fetchRef.current
    setLoading(true)
    setError('')
    try {
      const [invResult, salesResult] = await Promise.all([
        fetchInventory(),
        fetchDashboard({ date_from: from, date_to: to, campaign_type: 'Sale' }),
      ])
      if (id !== fetchRef.current) return
      setInv(invResult)
      setSalesData(salesResult)
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      if (id !== fetchRef.current) return
      setError(err.message || 'Error al cargar datos')
    } finally {
      if (id === fetchRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { load(dateFrom, dateTo) }, [dateFrom, dateTo, load])

  const s = inv?.summary
  const maxAutos = Math.max(...(inv?.by_category?.map(r => r.n_autos) ?? [1]))
  const maxVips  = Math.max(...(inv?.by_pix_bucket?.map(r => r.vips_7d) ?? [1]))

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title="Pricing & Inventario"
          lastUpdated={lastUpdated}
          rightSlot={
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
            />
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-[#1E293B] rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* ── KPIs ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KpiCard
                  label="Autos en stock"
                  value={fmtNum(s?.total_autos)}
                  sub="publicados hoy"
                />
                <KpiCard
                  label="PIX promedio"
                  value={s?.avg_pix != null ? s.avg_pix.toFixed(3) : '—'}
                  sub="precio / FIPE"
                  color={s?.avg_pix != null ? pixColor(s.avg_pix) : undefined}
                />
                <KpiCard
                  label="Aging promedio"
                  value={s?.avg_aging != null ? `${Math.round(s.avg_aging)}d` : '—'}
                  sub="días publicado"
                  color={s?.avg_aging != null ? agingColor(s.avg_aging) : undefined}
                />
                <KpiCard
                  label="MOH promedio"
                  value={s?.avg_moh != null ? s.avg_moh.toFixed(1) : '—'}
                  sub="meses de horizonte"
                />
                <KpiCard
                  label="> 60 días"
                  value={s?.pct_over_60d != null ? `${s.pct_over_60d}%` : '—'}
                  sub="del stock"
                  color={s?.pct_over_60d > 30 ? '#EF4444' : s?.pct_over_60d > 15 ? '#F59E0B' : '#22C55E'}
                />
                <KpiCard
                  label="VIPs 7D"
                  value={fmtNum(s?.total_vips_7d)}
                  sub={`Leads: ${fmtNum(s?.total_leads_7d)}`}
                  color={ACCENT}
                />
              </div>

              {/* ── CTR semanal × Inventario ───────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* CTR semanal */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                  <SectionHeader
                    title="CTR semanal — Sales"
                    sub={`${dateFrom} → ${dateTo} · datos de campañas`}
                  />
                  <CtrTrendTable trends={salesData?.trends} />
                </div>

                {/* Estado actual del inventario */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                  <SectionHeader
                    title="Inventario actual por aging"
                    sub="Snapshot de hoy — N autos, PIX y demanda 7D"
                  />
                  <DataTable
                    keyField="aging_group"
                    cols={[
                      {
                        key: 'aging_group', label: 'Aging',
                        render: v => <span className="text-white font-semibold">{v}</span>
                      },
                      { key: 'n_autos', label: 'Autos', align: 'right',
                        render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                      },
                      { key: 'pct_total', label: '%', align: 'right',
                        render: v => <span className="text-[#64748B] tabular-nums">{v}%</span>
                      },
                      { key: 'avg_pix', label: 'PIX', align: 'right',
                        render: v => <span className="font-bold tabular-nums" style={{ color: pixColor(v) }}>{fmtPix(v)}</span>
                      },
                      { key: 'vips_7d', label: 'VIPs 7D', align: 'right',
                        render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                      },
                      { key: 'lead_rate', label: 'VIP→Lead', align: 'right',
                        render: v => <span className="text-[#94A3B8] tabular-nums">{v != null ? `${v}%` : '—'}</span>
                      },
                    ]}
                    rows={inv?.by_aging ?? []}
                  />
                </div>
              </div>

              {/* ── PIX impact (como MX) ───────────────────────────────────── */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                <SectionHeader
                  title="Impacto del PIX en demanda"
                  sub="Autos agrupados por posición de precio vs FIPE — a menor PIX, más competitivo"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Tabla PIX por bucket */}
                  <DataTable
                    keyField="pix_bucket"
                    cols={[
                      {
                        key: 'pix_bucket', label: 'PIX bucket',
                        render: (v, row) => {
                          const isGreen = v === '< 0.81' || v === '0.81-0.87'
                          return (
                            <span className="font-semibold" style={{ color: isGreen ? '#22C55E' : v === '0.87-0.92' ? '#F59E0B' : '#EF4444' }}>
                              {v}
                            </span>
                          )
                        }
                      },
                      { key: 'n_autos', label: 'Autos', align: 'right',
                        render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                      },
                      { key: 'pct_total', label: '%stock', align: 'right',
                        render: v => <span className="text-[#64748B] tabular-nums">{v}%</span>
                      },
                      { key: 'avg_vips_per_car', label: 'VIPs/auto', align: 'right',
                        render: v => <span className="text-[#94A3B8] tabular-nums">{v != null ? v.toFixed(1) : '—'}</span>
                      },
                      { key: 'lead_rate', label: 'VIP→Lead', align: 'right',
                        render: v => (
                          <span className="font-bold tabular-nums"
                            style={{ color: v == null ? '#475569' : v > 5 ? '#22C55E' : v > 2 ? '#F59E0B' : '#EF4444' }}>
                            {v != null ? `${v}%` : '—'}
                          </span>
                        )
                      },
                    ]}
                    rows={inv?.by_pix_bucket ?? []}
                  />

                  {/* Barras de VIPs por PIX bucket */}
                  <div className="space-y-3">
                    <p className="text-[#64748B] text-[11px] font-semibold uppercase tracking-wider mb-2">
                      VIPs 7D por bucket de PIX
                    </p>
                    {(inv?.by_pix_bucket ?? []).map(row => (
                      <div key={row.pix_bucket} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#94A3B8]">{row.pix_bucket}</span>
                          <span className="text-[#64748B]">{row.pct_total}% del stock</span>
                        </div>
                        <HBar value={row.vips_7d} max={maxVips}
                          color={['< 0.81','0.81-0.87'].includes(row.pix_bucket) ? '#22C55E' : row.pix_bucket === '0.87-0.92' ? '#F59E0B' : '#EF4444'} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Por categoría ─────────────────────────────────────────── */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                <SectionHeader
                  title="Funnel por categoría"
                  sub="Stock actual · VIPs → Leads → Bookings (últimos 7 días)"
                />
                <DataTable
                  keyField="category"
                  cols={[
                    {
                      key: 'category', label: 'Categoría',
                      render: v => <span className="text-white font-semibold">{v}</span>
                    },
                    {
                      key: 'n_autos', label: 'Autos',
                      render: (v, row) => (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(v/maxAutos)*100}%`, backgroundColor: ACCENT }} />
                          </div>
                          <span className="text-[#94A3B8] tabular-nums text-[11px] w-10 text-right">{fmtNum(v)}</span>
                        </div>
                      )
                    },
                    { key: 'pct_total', label: '%', align: 'right',
                      render: v => <span className="text-[#64748B] tabular-nums">{v}%</span>
                    },
                    { key: 'avg_pix', label: 'PIX', align: 'right',
                      render: v => <span className="font-bold tabular-nums" style={{ color: pixColor(v) }}>{fmtPix(v)}</span>
                    },
                    { key: 'avg_aging', label: 'Aging', align: 'right',
                      render: v => <span className="tabular-nums" style={{ color: agingColor(v) }}>{v != null ? `${Math.round(v)}d` : '—'}</span>
                    },
                    { key: 'avg_moh', label: 'MOH', align: 'right',
                      render: v => <span className="text-[#94A3B8] tabular-nums">{v != null ? v.toFixed(1) : '—'}</span>
                    },
                    { key: 'vips_7d', label: 'VIPs 7D', align: 'right',
                      render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                    },
                    { key: 'leads_7d', label: 'Leads 7D', align: 'right',
                      render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                    },
                    { key: 'lead_rate', label: 'VIP→Lead', align: 'right',
                      render: v => (
                        <span className="font-bold tabular-nums"
                          style={{ color: v == null ? '#475569' : v > 5 ? '#22C55E' : v > 2 ? '#F59E0B' : '#EF4444' }}>
                          {v != null ? `${v}%` : '—'}
                        </span>
                      )
                    },
                    { key: 'bookings_7d', label: 'Books 7D', align: 'right',
                      render: v => <span className="text-[#94A3B8] tabular-nums">{fmtNum(v)}</span>
                    },
                    { key: 'booking_rate', label: 'Lead→Book', align: 'right',
                      render: v => (
                        <span className="font-bold tabular-nums"
                          style={{ color: v == null ? '#475569' : v > 10 ? '#22C55E' : v > 5 ? '#F59E0B' : '#EF4444' }}>
                          {v != null ? `${v}%` : '—'}
                        </span>
                      )
                    },
                  ]}
                  rows={inv?.by_category ?? []}
                />
              </div>

              {/* ── Nota al pie ───────────────────────────────────────────── */}
              <div className="text-[#475569] text-[10px] pb-4 space-y-0.5">
                <p>• Inventario: snapshot del último día disponible en inventory_history · Solo autos publicados, no-fleet, no-crab, status ≠ SOLD</p>
                <p>• VIPs / Leads / Bookings: ventana de 7 días rolling · CTR de campañas Sale según el rango de fechas seleccionado</p>
                <p>• PIX = precio publicado / FIPE — menor a 1 significa por debajo del mercado</p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
