import React, { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { request } from '../utils/api.js'

// ── Helpers de formato ────────────────────────────────────────────────────────

const BRL = (v) =>
  v == null
    ? '—'
    : 'R$ ' +
      Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const USD = (v) =>
  v == null
    ? '—'
    : '$ ' +
      Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PCT = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)

const NUM = (v, dec = 1) =>
  v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec })

// ── Componentes pequeños ──────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, sub2, highlight }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <p className="text-[#64748B] text-xs mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-[#A855F7]' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[#64748B] text-xs mt-1">{sub}</p>}
      {sub2 && <p className="text-[#475569] text-xs mt-0.5">{sub2}</p>}
    </div>
  )
}

function Badge({ children, color }) {
  const colors = {
    green: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    gray: 'bg-[#334155] text-[#94A3B8]',
    purple: 'bg-purple-500/20 text-purple-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function ChannelBadge({ name, campaignName }) {
  const ch = (name || '').toLowerCase()
  const cp = (campaignName || '').toLowerCase()

  let label, cls
  if (ch.includes('facebook') || cp.includes('facebook')) {
    label = name
    cls = 'bg-[#1877F2]/20 text-[#4CA3FF]'
  } else if (cp.includes('pmax')) {
    label = name
    cls = 'bg-red-500/20 text-red-400'
  } else if (ch.includes('google') || cp.includes('google')) {
    label = name
    cls = 'bg-yellow-500/20 text-yellow-400'
  } else {
    label = name
    cls = 'bg-[#334155] text-[#94A3B8]'
  }

  return (
    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

// ── Modal: Aplicar en Meta Ads (auto-selecciona cuenta BRL) ───────────────────

function matchScore(a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  if (a === b) return 1
  if (b.includes(a) || a.includes(b)) return 0.8
  const wordsA = a.split(/[\s\-_]+/)
  const wordsB = b.split(/[\s\-_]+/)
  const common = wordsA.filter(
    (w) => w.length > 2 && wordsB.some((wb) => wb.includes(w) || w.includes(wb))
  )
  return common.length / Math.max(wordsA.length, 1)
}

function MetaApplyModal({ optimizedCampaigns, onClose }) {
  const [step, setStep] = useState('loading') // loading | confirm | applying | done | error
  const [accountName, setAccountName] = useState('')
  const [mappings, setMappings] = useState([])
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  // Auto-init: encuentra la cuenta BRL → carga campañas → hace matching
  React.useEffect(() => {
    const init = async () => {
      try {
        const accsData = await request('/meta/accounts')
        const accounts = accsData.accounts || []
        const brlAcc = accounts.find((a) => a.currency === 'BRL') || accounts[0]
        if (!brlAcc) throw new Error('No se encontró ninguna cuenta de Meta Ads.')
        setAccountName(brlAcc.name)

        const campData = await request(
          `/meta/campaigns?account_id=${brlAcc.id}&date_preset=last_7d`
        )
        const active = (campData.campaigns || []).filter((c) => c.status === 'ACTIVE')

        // Matching: iterar sobre campañas QUANT → buscar mejor match en Meta
        // Así solo aparecen campañas del tipo que optimizó el usuario (Sale/Purchase)
        const usedMeta = new Set()
        const maps = []

        for (const qc of optimizedCampaigns) {
          let bestMC = null
          let bestScore = 0
          for (const mc of active) {
            if (usedMeta.has(mc.id)) continue
            const score = matchScore(qc.campaign_name, mc.name)
            if (score > bestScore) {
              bestScore = score
              bestMC = mc
            }
          }
          if (bestMC && bestScore > 0.2) {
            usedMeta.add(bestMC.id)
            maps.push({
              metaId: bestMC.id,
              metaName: bestMC.name,
              metaBudgetActual: bestMC.daily_budget ?? bestMC.lifetime_budget,
              budgetType: bestMC.budget_type === 'adset' ? 'daily' : (bestMC.budget_type || 'daily'),
              newBudget: qc.spend_otimizado,
              cambio: qc.cambio,
              cambio_pct: qc.cambio_pct,
              checked: true,
            })
          }
        }

        setMappings(maps)
        setStep('confirm')
      } catch (e) {
        setError(e.message)
        setStep('error')
      }
    }
    init()
  }, [])

  const applyBudgets = async () => {
    setStep('applying')
    const toApply = mappings.filter((m) => m.checked)
    const res = []
    for (const m of toApply) {
      try {
        await request(`/meta/campaigns/${m.metaId}/budget`, {
          method: 'PATCH',
          body: JSON.stringify({ budget_type: m.budgetType, amount_brl: m.newBudget }),
        })
        res.push({ name: m.metaName, ok: true, budget: m.newBudget })
      } catch (e) {
        res.push({ name: m.metaName, ok: false, error: e.message, budget: m.newBudget })
      }
    }
    setResults(res)
    setStep('done')
  }

  const toggleMapping = (i) =>
    setMappings((prev) => prev.map((m, idx) => (idx === i ? { ...m, checked: !m.checked } : m)))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1877F2]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Aplicar en Meta Ads</h2>
              {accountName && (
                <p className="text-[#64748B] text-xs mt-0.5">{accountName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Cargando */}
          {step === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-[#94A3B8]">Conectando con Meta Ads...</span>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Confirmar */}
          {step === 'confirm' && (
            <div>
              <p className="text-[#94A3B8] text-sm mb-4">
                Seleccioná las campañas de Meta a actualizar:
              </p>

              {mappings.length === 0 && (
                <p className="text-[#64748B] text-sm py-8 text-center">
                  No se encontraron campañas de Meta que coincidan.
                </p>
              )}

              <div className="space-y-2">
                {mappings.map((m, i) => {
                  const up = m.cambio > 1
                  const dn = m.cambio < -1
                  return (
                    <button
                      key={i}
                      onClick={() => toggleMapping(i)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                        m.checked
                          ? 'bg-[#0F172A] border-[#A855F7]/50'
                          : 'bg-[#0F172A]/50 border-[#334155] opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                              m.checked
                                ? 'bg-[#A855F7] border-[#A855F7]'
                                : 'border-[#475569]'
                            }`}
                          >
                            {m.checked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{m.metaName}</p>
                            <p className="text-[#475569] text-xs mt-0.5">
                              Budget actual: {BRL(m.metaBudgetActual)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-mono font-bold text-sm">{BRL(m.newBudget)}</p>
                          <span
                            className={`text-xs font-semibold ${
                              up ? 'text-emerald-400' : dn ? 'text-red-400' : 'text-[#64748B]'
                            }`}
                          >
                            {up ? '↑' : dn ? '↓' : '='} {PCT(m.cambio_pct)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {mappings.length > 0 && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                  <p className="text-amber-400 text-xs">
                    Los budgets de <strong>Google Ads no serán modificados</strong> — esos los ajustás manualmente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Aplicando */}
          {step === 'applying' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Aplicando budgets en Meta Ads...</p>
              <p className="text-[#64748B] text-sm mt-1">Espera, no cierres esta ventana.</p>
            </div>
          )}

          {/* Listo */}
          {step === 'done' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold">¡Listo!</p>
              </div>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                      r.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          r.ok ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {r.name}
                      </p>
                      {!r.ok && <p className="text-red-400 text-xs mt-0.5">{r.error}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-mono text-sm">{BRL(r.budget)}</p>
                      <p className={`text-xs ${r.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.ok ? '✓ Aplicado' : '✗ Error'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#64748B] text-xs mt-4">
                Recuerda: los budgets de{' '}
                <strong className="text-white">Google Ads</strong> deben ajustarse manualmente por
                ti.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#334155]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#94A3B8] hover:text-white text-sm transition-colors"
          >
            {step === 'done' ? 'Cerrar' : 'Cancelar'}
          </button>
          {step === 'confirm' && (
            <button
              onClick={applyBudgets}
              disabled={mappings.filter((m) => m.checked).length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Confirmar y Aplicar ({mappings.filter((m) => m.checked).length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal QUANT ────────────────────────────────────────────────────

const METRICS = [
  { value: 'CPL', label: 'CPL', sub: 'Costo por Lead' },
  { value: 'CPR', label: 'CPR', sub: 'Costo por Registro' },
  { value: 'CPB', label: 'CPB', sub: 'Costo por Booking' },
  { value: 'CPI', label: 'CPI', sub: 'Costo por Inspección' },
  { value: 'CPA', label: 'CPA', sub: 'Costo por Cuenta Nueva' },
]

export default function QuantDashboard() {
  // Controles
  const [campaignType, setCampaignType] = useState('Sale')
  const [metric, setMetric] = useState('CPL')
  const [budget, setBudget] = useState('')
  const [model, setModel] = useState('power_weighted')
  const [blockSize, setBlockSize] = useState(50)
  const [maxIncrease, setMaxIncrease] = useState(50)
  const [maxDecrease, setMaxDecrease] = useState(50)
  const [daysLookback, setDaysLookback] = useState(90)

  // Resultados
  const [result, setResult] = useState(null)
  const [editedBudgets, setEditedBudgets] = useState({}) // campaign_name → BRL value
  const [selectedCampaigns, setSelectedCampaigns] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Ordenamiento de tabla
  const [sortCol, setSortCol] = useState('cambio_pct')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = result
    ? [...result.campaigns]
        .filter((c) => !c.campaign_name.toLowerCase().includes('autoequity'))
        .sort((a, b) => {
          const av = a[sortCol] ?? -Infinity
          const bv = b[sortCol] ?? -Infinity
          return sortDir === 'asc' ? av - bv : bv - av
        })
    : []

  const handleOptimize = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setEditedBudgets({})
    try {
      const body = {
        campaign_type: campaignType,
        metric,
        model,
        block_size: blockSize,
        max_increase_pct: maxIncrease,
        max_decrease_pct: maxDecrease,
        days_lookback: daysLookback,
      }
      if (budget && !isNaN(parseFloat(budget))) body.budget = parseFloat(budget)
      const data = await request('/quant/optimize', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setResult(data)
      // spend_otimizado viene en USD desde el backend → guardamos directamente
      const inits = {}
      ;(data.campaigns || []).forEach((c) => {
        inits[c.campaign_name] = Math.round(c.spend_otimizado * 100) / 100
      })
      setEditedBudgets(inits)
      setSelectedCampaigns(new Set())
      setSortCol('cambio_pct')
      setSortDir('desc')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await request('/quant/refresh', { method: 'POST' })
    } catch (_) {}
    setRefreshing(false)
  }

  const toggleCampaign = (name) => {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleAllCampaigns = () => {
    if (selectedCampaigns.size === sorted.length) {
      setSelectedCampaigns(new Set())
    } else {
      setSelectedCampaigns(new Set(sorted.map((c) => c.campaign_name)))
    }
  }

  // Solo las campañas seleccionadas van al modal (con budgets editados en BRL)
  const campaignsForModal = result
    ? result.campaigns
        .filter((c) => !c.campaign_name.toLowerCase().includes('autoequity'))
        .filter((c) => selectedCampaigns.has(c.campaign_name))
        .map((c) => {
          const fx = c.fx_rate || 5.8
          // editedBudgets almacena USD; spend_atual también es USD
          const editedUSD =
            editedBudgets[c.campaign_name] !== undefined
              ? editedBudgets[c.campaign_name]
              : c.spend_otimizado
          const newBRL = Math.round(editedUSD * fx * 100) / 100
          const actualBRL = c.spend_atual * fx
          const cambio = newBRL - actualBRL
          const cambio_pct = actualBRL > 0 ? (cambio / actualBRL) * 100 : 0
          return { ...c, spend_otimizado: newBRL, cambio, cambio_pct }
        })
    : []

  const ThBtn = ({ col, children }) => (
    <button
      onClick={() => handleSort(col)}
      className={`flex items-center gap-1 whitespace-nowrap transition-colors ${
        sortCol === col ? 'text-[#A855F7]' : 'text-[#64748B] hover:text-[#94A3B8]'
      }`}
    >
      {children}
      <svg
        className="w-3 h-3 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {sortCol === col && sortDir === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        )}
      </svg>
    </button>
  )

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F172A]/90 backdrop-blur border-b border-[#334155] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#A855F7]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#A855F7]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">QUANT</h1>
                <p className="text-[#64748B] text-xs mt-0.5">Optimizador de Budget — Brasil 🇧🇷</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Recargar datos del Google Sheets"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white text-xs transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Actualizando...' : 'Actualizar datos'}
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* Panel de configuración */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Configuración</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* Tipo de campaña */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">Tipo de Campaña</label>
                <div className="flex gap-2">
                  {['Sale', 'Purchase'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCampaignType(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        campaignType === t
                          ? 'bg-[#A855F7] text-white'
                          : 'bg-[#0F172A] text-[#64748B] hover:text-white border border-[#334155]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Métrica */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">Métrica Objetivo</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} — {m.sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">Budget Diario Total (R$)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Automático (suma actual)"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm placeholder-[#475569]"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">Modelo</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="power_weighted">Power (con decaimiento temporal)</option>
                  <option value="power">Power (sin decaimiento)</option>
                </select>
              </div>

              {/* Bloque de asignación */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">
                  Bloque de Asignación — R$ {blockSize}
                </label>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={blockSize}
                  onChange={(e) => setBlockSize(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Aumento máximo */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">
                  Aumento Máximo — {maxIncrease}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={maxIncrease}
                  onChange={(e) => setMaxIncrease(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Reducción máxima */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">
                  Reducción Máxima — {maxDecrease}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={maxDecrease}
                  onChange={(e) => setMaxDecrease(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              {/* Histórico */}
              <div>
                <label className="block text-[#64748B] text-xs mb-2">
                  Histórico para Curvas — {daysLookback} días
                </label>
                <input
                  type="range"
                  min={14}
                  max={180}
                  step={7}
                  value={daysLookback}
                  onChange={(e) => setDaysLookback(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleOptimize}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Optimizando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Optimizar Budget
                  </>
                )}
              </button>
              {result && (
                <p className="text-[#64748B] text-xs">
                  Referencia: {result.summary.data_referencia}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Resultados */}
          {result && (
            <>
              {/* Cards de resumen */}
              {/* budget_atual_brl viene en USD desde el backend (la col spend del sheet es USD) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Budget Actual"
                  value={BRL(result.summary.budget_atual_brl * (result.summary.fx_rate_global || 5.8))}
                  sub={`${result.summary.total_campanhas} campañas`}
                  sub2={USD(result.summary.budget_atual_brl)}
                />
                <SummaryCard
                  label="Budget Optimizado"
                  value={BRL(result.summary.budget_otimizado_brl * (result.summary.fx_rate_global || 5.8))}
                  sub="mismo total redistribuido"
                  sub2={USD(result.summary.budget_otimizado_brl)}
                  highlight
                />
                <SummaryCard
                  label={`${result.summary.metric} Actual`}
                  value={BRL(result.summary.custo_atual)}
                  sub={`${NUM(result.summary.conversoes_atuais)} conversiones`}
                />
                <SummaryCard
                  label={`${result.summary.metric} Proyectado`}
                  value={BRL(result.summary.custo_projetado)}
                  sub={`${NUM(result.summary.conversoes_projetadas)} conv. proyectadas`}
                  highlight
                />
              </div>

              {/* Badges de delta + botón Meta */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge color="green">↑ {result.summary.subidas} suben</Badge>
                <Badge color="red">↓ {result.summary.descidas} bajan</Badge>
                {result.summary.iguais > 0 && (
                  <Badge color="gray">= {result.summary.iguais} iguales</Badge>
                )}
                {result.summary.custo_projetado != null &&
                  result.summary.custo_atual != null && (
                    <Badge color="purple">
                      {result.summary.custo_projetado < result.summary.custo_atual ? '▼' : '▲'}{' '}
                      {PCT(
                        ((result.summary.custo_projetado - result.summary.custo_atual) /
                          result.summary.custo_atual) *
                          100
                      )}{' '}
                      en {result.summary.metric}
                    </Badge>
                  )}

                <div className="ml-auto flex items-center gap-2">
                  {selectedCampaigns.size === 0 && (
                    <span className="text-[#475569] text-xs">
                      Seleccioná campañas en la tabla para aplicar
                    </span>
                  )}
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={selectedCampaigns.size === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 text-[#4CA3FF] font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Aplicar en Meta Ads
                    {selectedCampaigns.size > 0 && (
                      <span className="bg-[#1877F2]/40 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {selectedCampaigns.size}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tabla de campañas */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#334155] flex items-center justify-between">
                  <h2 className="text-white font-semibold text-sm">
                    Redistribución por Campaña
                  </h2>
                  <span className="text-[#64748B] text-xs">
                    $ = USD · R$ = Reales Brasileños
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#334155] bg-[#0F172A]/60">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={sorted.length > 0 && selectedCampaigns.size === sorted.length}
                            onChange={toggleAllCampaigns}
                            className="w-3.5 h-3.5 rounded accent-purple-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="text-[#64748B] font-medium">Campaña</span>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <ThBtn col="spend_atual">$ Actual</ThBtn>
                        </th>
                        <th className="px-4 py-3 text-right text-[#64748B] font-medium">
                          R$ Actual
                        </th>
                        <th className="px-4 py-3 text-right text-[#64748B] font-medium">
                          $ Nuevo
                        </th>
                        <th className="px-4 py-3 text-right text-[#64748B] font-medium">
                          R$ Nuevo
                        </th>
                        <th className="px-4 py-3 text-right">
                          <ThBtn col="cambio_pct">Δ%</ThBtn>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <ThBtn col="conversoes_projetadas">Conv. Proy.</ThBtn>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <ThBtn col="custo_projetado">{result.summary.metric} Proy.</ThBtn>
                        </th>
                        <th className="px-4 py-3 text-left text-[#64748B] font-medium">Modelo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((c, i) => {
                        const fx = c.fx_rate || 5.8
                        // spend_atual es USD (la columna spend del sheet está en USD)
                        const actualUsd = c.spend_atual
                        const actualBRL = c.spend_atual * fx
                        const editedUSD =
                          editedBudgets[c.campaign_name] !== undefined
                            ? editedBudgets[c.campaign_name]
                            : c.spend_otimizado
                        const newBRL = editedUSD * fx
                        const editedCambio = newBRL - actualBRL
                        const editedCambioPct =
                          actualBRL > 0 ? (editedCambio / actualBRL) * 100 : 0
                        const up = editedCambio > 1
                        const dn = editedCambio < -1

                        return (
                          <tr
                            key={i}
                            onClick={() => toggleCampaign(c.campaign_name)}
                            className={`border-b border-[#1E293B] hover:bg-[#0F172A]/40 transition-colors cursor-pointer ${
                              selectedCampaigns.has(c.campaign_name)
                                ? 'bg-[#A855F7]/5'
                                : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedCampaigns.has(c.campaign_name)}
                                onChange={() => toggleCampaign(c.campaign_name)}
                                className="w-3.5 h-3.5 rounded accent-purple-500 cursor-pointer"
                              />
                            </td>
                            {/* Campaña */}
                            <td className="px-4 py-2.5 min-w-[240px]">
                              <p className="text-white font-medium text-xs leading-snug break-all">
                                {c.campaign_name}
                              </p>
                              {c.channel_name && (
                                <ChannelBadge
                                  name={c.channel_name}
                                  campaignName={c.campaign_name}
                                />
                              )}
                            </td>

                            {/* $ Actual (USD, read-only) */}
                            <td className="px-4 py-2.5 text-right text-[#94A3B8] font-mono">
                              {USD(actualUsd)}
                            </td>

                            {/* R$ Actual (BRL, read-only) */}
                            <td className="px-4 py-2.5 text-right text-[#94A3B8] font-mono">
                              {BRL(actualBRL)}
                            </td>

                            {/* $ Nuevo (USD, editable) */}
                            <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                step="0.01"
                                value={editedUSD}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value)
                                  setEditedBudgets((prev) => ({
                                    ...prev,
                                    [c.campaign_name]: isNaN(v) ? 0 : v,
                                  }))
                                }}
                                className={`w-24 bg-[#0F172A] border rounded-lg px-2 py-1 text-right font-mono text-xs font-bold focus:outline-none transition-colors ${
                                  up
                                    ? 'border-emerald-500/40 text-emerald-400 focus:border-emerald-500'
                                    : dn
                                    ? 'border-red-500/40 text-red-400 focus:border-red-500'
                                    : 'border-[#334155] text-white focus:border-[#A855F7]'
                                }`}
                              />
                            </td>

                            {/* R$ Nuevo (BRL auto, va a Meta) */}
                            <td className="px-4 py-2.5 text-right font-mono font-bold">
                              <span className={up ? 'text-emerald-400' : dn ? 'text-red-400' : 'text-white'}>
                                {BRL(newBRL)}
                              </span>
                            </td>

                            {/* Δ% */}
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                                  up
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : dn
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-[#334155] text-[#64748B]'
                                }`}
                              >
                                {up ? '↑' : dn ? '↓' : '='} {PCT(editedCambioPct)}
                              </span>
                            </td>

                            {/* Conv. Proyectadas */}
                            <td className="px-4 py-2.5 text-right text-[#94A3B8]">
                              {NUM(c.conversoes_projetadas)}
                              {c.conversoes_atuais > 0 && (
                                <span className="text-[#475569] ml-1">
                                  (era {NUM(c.conversoes_atuais)})
                                </span>
                              )}
                            </td>

                            {/* Costo proyectado */}
                            <td className="px-4 py-2.5 text-right text-[#A855F7] font-mono font-semibold">
                              {BRL(c.custo_projetado)}
                              {c.custo_atual && (
                                <span className="text-[#475569] ml-1 font-normal">
                                  (era {BRL(c.custo_atual)})
                                </span>
                              )}
                            </td>

                            {/* Modelo */}
                            <td className="px-4 py-2.5 text-[#475569] font-mono text-[10px] max-w-[140px]">
                              <span className="truncate block" title={c.modelo_eq}>
                                {c.modelo_eq || '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>

                    {/* Fila de totales */}
                    <tfoot>
                      <tr className="border-t border-[#334155] bg-[#0F172A]/60">
                        <td className="px-4 py-3 w-10" />
                        <td className="px-4 py-3 text-[#64748B] font-semibold text-xs">TOTAL</td>
                        <td className="px-4 py-3 text-right text-[#94A3B8] font-mono font-semibold">
                          {/* budget_atual_brl es USD en realidad */}
                          {USD(result.summary.budget_atual_brl)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#94A3B8] font-mono font-semibold">
                          {BRL(result.summary.budget_atual_brl * (result.summary.fx_rate_global || 5.8))}
                        </td>
                        <td className="px-4 py-3 text-right text-[#A855F7] font-mono font-bold">
                          {USD(
                            sorted.reduce((s, c) => {
                              return s + (editedBudgets[c.campaign_name] !== undefined
                                ? editedBudgets[c.campaign_name]
                                : c.spend_otimizado)
                            }, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#A855F7] font-mono font-bold">
                          {BRL(
                            sorted.reduce((s, c) => {
                              const fx = c.fx_rate || 5.8
                              const editedUSD = editedBudgets[c.campaign_name] !== undefined
                                ? editedBudgets[c.campaign_name]
                                : c.spend_otimizado
                              return s + editedUSD * fx
                            }, 0)
                          )}
                        </td>
                        <td />
                        <td className="px-4 py-3 text-right text-[#94A3B8] font-mono font-semibold">
                          {NUM(result.summary.conversoes_projetadas)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#A855F7] font-mono font-bold">
                          {BRL(result.summary.custo_projetado)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Nota metodológica */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl px-5 py-4 text-xs text-[#64748B] space-y-1">
                <p className="text-[#94A3B8] font-semibold mb-2">Metodología QUANT</p>
                <p>
                  Curvas de elasticidad{' '}
                  <strong className="text-white">Power Law</strong> (y = w₀ · x^w₁) ajustadas por
                  campaña usando los últimos{' '}
                  <strong className="text-white">{daysLookback} días</strong> de datos.
                </p>
                {model === 'power_weighted' && (
                  <p>
                    Decaimiento temporal de{' '}
                    <strong className="text-white">50% por semana</strong> — datos recientes tienen
                    mayor peso en el ajuste.
                  </p>
                )}
                <p>
                  Algoritmo <strong className="text-white">greedy marginal</strong>: asigna bloques
                  de <strong className="text-white">R$ {blockSize}</strong> a la campaña con mayor
                  retorno marginal en cada iteración.
                </p>
                <p>
                  Restricciones: máx.{' '}
                  <strong className="text-white">+{maxIncrease}%</strong> / mín.{' '}
                  <strong className="text-white">-{maxDecrease}%</strong> por campaña.
                </p>
              </div>
            </>
          )}

          {/* Estado vacío */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#A855F7]/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#A855F7]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-white font-semibold mb-1">Listo para optimizar</p>
              <p className="text-[#64748B] text-sm max-w-sm">
                Configura los parámetros arriba y haz clic en{' '}
                <strong className="text-[#A855F7]">Optimizar Budget</strong> para ver la
                redistribución ideal entre las campañas de Brasil.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Meta Ads */}
      {showModal && (
        <MetaApplyModal
          optimizedCampaigns={campaignsForModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
