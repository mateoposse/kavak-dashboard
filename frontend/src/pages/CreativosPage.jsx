import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import { request } from '../utils/api.js'

// ── Formatters ─────────────────────────────────────────────────────────────────

const fmtBRL = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtNum = (n) => {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}

const fmtPct = (n) => (n == null ? '—' : n.toFixed(2) + '%')

// ── Metric pill ────────────────────────────────────────────────────────────────

function Metric({ label, value, highlight }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[#475569] text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: highlight ? '#EC4899' : '#F1F5F9' }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Creative card ──────────────────────────────────────────────────────────────

function CreativeCard({ ad, rank, variant }) {
  const ins = ad.insights || {}
  const isBest  = variant === 'best'
  const isWorst = variant === 'worst'

  const borderColor = isBest ? '#15803d' : isWorst ? '#991b1b' : '#334155'
  const badgeBg     = isBest ? '#052e16' : '#450a0a'
  const badgeText   = isBest ? '#4ade80' : '#f87171'
  const badgeLabel  = isBest ? `#${rank} Best` : `#${rank} Worst`

  return (
    <div
      className="bg-[#0F172A] rounded-2xl overflow-hidden flex flex-col border"
      style={{ borderColor }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#1E293B] flex items-center justify-center overflow-hidden">
        {ad.thumbnail ? (
          <img
            src={ad.thumbnail}
            alt={ad.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        {/* Fallback placeholder */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ display: ad.thumbnail ? 'none' : 'flex' }}
        >
          <svg className="w-10 h-10 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {badgeLabel}
        </div>

        {/* Status badge */}
        {ad.status === 'PAUSED' && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1c1917] text-[#a8a29e]">
            Pausado
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* Ad name */}
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2" title={ad.name}>
          {ad.name}
        </p>

        {/* Body copy preview */}
        {ad.body && (
          <p className="text-[#475569] text-[11px] leading-snug line-clamp-2">{ad.body}</p>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1 border-t border-[#1E293B]">
          <Metric label="Spend"  value={fmtBRL(ins.spend)}       highlight={isBest} />
          <Metric label="Impr."  value={fmtNum(ins.impressions)} />
          <Metric label="CTR"    value={fmtPct(ins.ctr)}         highlight={isBest && ins.ctr > 1} />
          <Metric label="CPC"    value={fmtBRL(ins.cpc)}         highlight={isWorst && ins.cpc > 0} />
          {ins.cpl != null && <Metric label="CPL"  value={fmtBRL(ins.cpl)} />}
          {ins.cpp != null && <Metric label="CPP"  value={fmtBRL(ins.cpp)} />}
          {ins.leads != null && <Metric label="Leads" value={fmtNum(ins.leads)} />}
          {ins.purchases != null && <Metric label="Purchases" value={fmtNum(ins.purchases)} />}
        </div>
      </div>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────

function CreativeSection({ title, subtitle, ads, variant, accentColor }) {
  if (!ads || ads.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-1 h-6 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <div>
          <h3 className="text-white font-bold text-base">{title}</h3>
          {subtitle && <p className="text-[#475569] text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(ads.length, 5)}, minmax(0, 1fr))` }}
      >
        {ads.map((ad, i) => (
          <CreativeCard key={ad.id} ad={ad} rank={i + 1} variant={variant} />
        ))}
      </div>
    </div>
  )
}

// ── Account selector ───────────────────────────────────────────────────────────

function AccountSelector({ accounts, selected, onChange }) {
  return (
    <select
      value={selected || ''}
      onChange={e => onChange(e.target.value)}
      className="bg-[#1E293B] border border-[#334155] text-white text-sm rounded-xl px-3 py-2
                 focus:outline-none focus:border-[#EC4899] cursor-pointer min-w-[220px]"
    >
      <option value="" disabled>Seleccionar cuenta…</option>
      {accounts.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  )
}

// ── Date preset selector ───────────────────────────────────────────────────────

const DATE_PRESETS = [
  { value: 'last_7d',    label: 'Últimos 7 días'  },
  { value: 'last_14d',   label: 'Últimos 14 días' },
  { value: 'last_30d',   label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes'        },
  { value: 'last_month', label: 'Mes anterior'    },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CreativosPage() {
  const [accounts,     setAccounts]     = useState([])
  const [selectedAcc,  setSelectedAcc]  = useState(null)
  const [datePreset,   setDatePreset]   = useState('last_30d')
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [loadingAcc,   setLoadingAcc]   = useState(true)

  // Load accounts
  useEffect(() => {
    request('/meta/accounts')
      .then(d => {
        const accs = d.accounts || []
        setAccounts(accs)
        if (accs.length > 0) setSelectedAcc(accs[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingAcc(false))
  }, [])

  // Load creatives when account or datePreset changes
  useEffect(() => {
    if (!selectedAcc) return
    setLoading(true)
    setError(null)
    setData(null)
    request(`/meta/creatives?account_id=${selectedAcc}&date_preset=${datePreset}`)
      .then(d => setData(d))
      .catch(e => setError(e.message || 'Error al cargar creativos'))
      .finally(() => setLoading(false))
  }, [selectedAcc, datePreset])

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Creativos" subtitle="Meta Ads · Análisis de performance por creativo" />

        <main className="flex-1 p-6 space-y-8">

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-white font-bold text-lg">Análisis de Creativos</h2>
            </div>

            <div className="flex items-center gap-3">
              {!loadingAcc && accounts.length > 0 && (
                <AccountSelector
                  accounts={accounts}
                  selected={selectedAcc}
                  onChange={setSelectedAcc}
                />
              )}
              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] text-white text-sm rounded-xl px-3 py-2
                           focus:outline-none focus:border-[#EC4899] cursor-pointer"
              >
                {DATE_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {(loadingAcc || loading) && (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* No account selected */}
          {!loadingAcc && !selectedAcc && !error && (
            <p className="text-center text-[#475569] text-sm py-20">
              Seleccioná una cuenta para ver los creativos.
            </p>
          )}

          {/* Results */}
          {!loading && data && (
            <>
              {/* Top 5 */}
              <CreativeSection
                title="🏆 Top 5 — Mayor Spend"
                subtitle={`Los 5 ads con mayor inversión en el período seleccionado`}
                ads={data.top}
                variant="best"
                accentColor="#22c55e"
              />

              {/* Worst 3 */}
              <CreativeSection
                title="⚠️ Peores Performers"
                subtitle="Los 3 ads con menor spend entre los que llevan más de 15 días activos"
                ads={data.worst}
                variant="worst"
                accentColor="#ef4444"
              />

              {data.top?.length === 0 && data.worst?.length === 0 && (
                <p className="text-center text-[#475569] text-sm py-12">
                  No se encontraron ads con datos de spend para el período seleccionado.
                </p>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
