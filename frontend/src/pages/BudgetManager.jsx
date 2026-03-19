import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { request } from '../utils/api.js'

const ACCOUNT_ID = 'act_679439579417082'

const TABS = [
  { key: 'purchase',   label: 'Purchase',   color: '#60A5FA', glow: 'rgba(96,165,250,0.25)',  bg: 'rgba(96,165,250,0.1)'  },
  { key: 'sales',      label: 'Sales',      color: '#34D399', glow: 'rgba(52,211,153,0.25)',  bg: 'rgba(52,211,153,0.1)'  },
  { key: 'autoequity', label: 'Autoequity', color: '#FBBF24', glow: 'rgba(251,191,36,0.25)',  bg: 'rgba(251,191,36,0.1)'  },
]

const fmt = v => v == null ? '—' : new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(v)

const pctDiff = (next, curr) =>
  curr && next ? ((next - curr) / curr) * 100 : null

// ── Confirm modal ────────────────────────────────────────────────────────────
function BulkConfirmModal({ changes, onConfirm, onCancel, saving, results }) {
  const done   = Object.keys(results).length > 0
  const okCount  = Object.values(results).filter(v => v === 'ok').length
  const errCount = Object.values(results).filter(v => v === 'err').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.15)' }}>
              {done
                ? okCount > 0
                  ? <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                : <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              }
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                {done
                  ? `${okCount} actualizado${okCount !== 1 ? 's' : ''}${errCount > 0 ? ` · ${errCount} error${errCount !== 1 ? 'es' : ''}` : ''}`
                  : `Confirmar ${changes.length} cambio${changes.length !== 1 ? 's' : ''}`}
              </h3>
              <p className="text-[#475569] text-xs mt-0.5">
                {done ? 'Cambios procesados en Meta Ads' : 'Se aplicarán en Meta Ads al instante'}
              </p>
            </div>
          </div>
        </div>

        {/* Changes list */}
        <div className="mx-6 mb-4 rounded-xl overflow-hidden" style={{ background: '#0A1120', border: '1px solid #1E293B' }}>
          <div className="max-h-64 overflow-y-auto divide-y divide-[#1E293B]">
            {changes.map(c => {
              const diff = pctDiff(c.newBudget, c.currentBudget)
              const up   = diff > 0
              const res  = results[c.id]
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#64748B] truncate mb-1.5">{c.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#475569] line-through font-mono">{fmt(c.currentBudget)}</span>
                      <svg className="w-3.5 h-3.5 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12"/></svg>
                      <span className="text-sm text-white font-semibold font-mono">{fmt(c.newBudget)}</span>
                      {diff != null && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${up ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                          {up ? '+' : ''}{diff.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {res === 'ok'  && <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>}
                    {res === 'err' && <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center"><svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>}
                    {!res && saving && <svg className="w-4 h-4 text-[#334155] animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:text-[#94A3B8] transition-colors disabled:opacity-40"
            style={{ background: '#1E293B' }}
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && (
            <button
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            >
              {saving
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Guardando…</>
                : <>Aplicar {changes.length} cambio{changes.length !== 1 ? 's' : ''}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Campaign row ─────────────────────────────────────────────────────────────
function CampaignRow({ campaign, tabColor, pendingValue, onChange }) {
  const [focused,       setFocused]   = useState(false)
  const [adsets,        setAdsets]    = useState(null)   // null = not loaded
  const [loadingAdsets, setLoadingAdsets] = useState(false)
  const inputRef = useRef(null)

  const isAdset = campaign.daily_budget == null
  // For adset campaigns, pick the first adset's budget as the "current"
  const firstAdset     = adsets?.find(a => a.status === 'ACTIVE') ?? adsets?.[0] ?? null
  const effectiveBudget = isAdset ? firstAdset?.daily_budget : campaign.daily_budget
  const effectiveId     = isAdset ? firstAdset?.id : campaign.id

  const hasPending = pendingValue != null && pendingValue !== ''
  const newBudget  = hasPending ? parseFloat(pendingValue) : null
  const diff       = pctDiff(newBudget, effectiveBudget)
  const up         = diff > 0

  // Lazy-load adsets when user focuses an adset-campaign input
  async function handleFocus() {
    setFocused(true)
    if (!isAdset || adsets !== null || loadingAdsets) return
    setLoadingAdsets(true)
    try {
      const d = await request(`/meta/campaigns/${campaign.id}/adsets`)
      setAdsets(d.adsets || [])
    } catch { setAdsets([]) }
    finally   { setLoadingAdsets(false) }
  }

  function handleInput(e) {
    const v = e.target.value
    if (v === '' || /^\d*$/.test(v)) onChange(v === '' ? null : v, effectiveId, isAdset)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onChange(null, null, false); inputRef.current?.blur() }
  }

  return (
    <tr
      className="border-b transition-all duration-150"
      style={{
        borderColor: '#111827',
        background: hasPending ? 'rgba(59,130,246,0.05)' : 'transparent',
      }}
      onMouseEnter={e => { if (!hasPending) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
      onMouseLeave={e => { if (!hasPending) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Nombre */}
      <td className="pl-5 pr-3 py-3.5" style={{ maxWidth: 340, width: '40%' }}>
        <div className="flex items-center gap-2.5">
          {isAdset && (
            <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(251,191,36,0.4)' }} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }} title={campaign.name}>
              {campaign.name}
            </p>
            {isAdset && (
              <p className="text-[10px] mt-0.5" style={{ color: '#F59E0B' }}>
                {loadingAdsets ? 'Cargando adset…' : firstAdset ? firstAdset.name : 'Budget a nivel adset'}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Presupuesto actual */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap" style={{ width: '20%' }}>
        {isAdset && adsets === null && !loadingAdsets ? (
          <span className="text-xs" style={{ color: '#475569' }}>click para ver</span>
        ) : loadingAdsets ? (
          <span className="text-xs" style={{ color: '#475569' }}>cargando…</span>
        ) : (
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: hasPending ? '#334155' : '#94A3B8', textDecoration: hasPending ? 'line-through' : 'none' }}
          >
            {fmt(effectiveBudget)}
          </span>
        )}
      </td>

      {/* Input nuevo valor */}
      <td className="px-4 py-3.5 whitespace-nowrap" style={{ width: '25%' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: '#475569' }}>R$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder={effectiveBudget != null ? String(Math.round(effectiveBudget)) : '—'}
            value={pendingValue ?? ''}
            onChange={handleInput}
            onFocus={handleFocus}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isAdset && loadingAdsets}
            className="font-mono text-sm focus:outline-none transition-all duration-150 rounded-lg px-2.5 py-1.5 w-28"
            style={{
              background: '#0A1120',
              border: hasPending
                ? `1.5px solid ${tabColor}`
                : focused
                  ? '1.5px solid #334155'
                  : '1.5px solid #1E293B',
              color: hasPending ? '#F1F5F9' : focused ? '#CBD5E1' : '#475569',
              boxShadow: hasPending ? `0 0 0 3px ${tabColor}18` : 'none',
            }}
          />
        </div>
      </td>

      {/* Delta */}
      <td className="px-4 py-3.5 whitespace-nowrap text-right" style={{ width: '10%' }}>
        {diff != null && !isNaN(diff) ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
            style={{
              background: up ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              color:      up ? '#34D399' : '#F87171',
            }}
          >
            {up
              ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M12 3v18"/></svg>
              : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7-7-7M12 3v18"/></svg>
            }
            {Math.abs(diff).toFixed(0)}%
          </span>
        ) : null}
      </td>

      {/* Clear */}
      <td className="pr-5 py-3.5" style={{ width: '5%' }}>
        {hasPending && (
          <button
            onClick={() => onChange(null, null, false)}
            className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#1E293B' }}
          >
            <svg className="w-3 h-3" style={{ color: '#64748B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function BudgetManager() {
  const [activeTab,   setActiveTab]  = useState('purchase')
  const [campaigns,   setCampaigns]  = useState([])
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState(null)
  const [lastFetch,   setLastFetch]  = useState(null)
  // pending[campaignId] = { value: string, targetId: string, isAdset: bool }
  const [pending,     setPending]    = useState({})
  const [showModal,   setShowModal]  = useState(false)
  const [saving,      setSaving]     = useState(false)
  const [results,     setResults]    = useState({})

  const fetchCampaigns = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await request(`/meta/campaigns?account_id=${ACCOUNT_ID}&date_preset=last_7d`)
      setCampaigns((d.campaigns || []).filter(c => c.status === 'ACTIVE'))
      setLastFetch(new Date())
    } catch (e) { setError(e.message || 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const tab      = TABS.find(t => t.key === activeTab)
  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(tab.key))

  // Build valid pending changes for the current tab
  const pendingChanges = filtered.flatMap(c => {
    const p = pending[c.id]
    if (!p?.value) return []
    const n = parseFloat(p.value)
    const cur = c.daily_budget  // null for adset campaigns (we'll use stored targetId)
    if (isNaN(n) || n <= 0) return []
    return [{ id: c.id, name: c.name, currentBudget: cur, newBudget: n, targetId: p.targetId, isAdset: p.isAdset }]
  })

  // Count pending changes across all tabs for badge
  const pendingPerTab = {}
  TABS.forEach(t => {
    pendingPerTab[t.key] = campaigns
      .filter(c => c.name.toLowerCase().includes(t.key) && pending[c.id]?.value)
      .length
  })

  function handleChange(campaignId, value, targetId, isAdset) {
    setPending(prev => {
      if (value == null) { const n = { ...prev }; delete n[campaignId]; return n }
      return { ...prev, [campaignId]: { value, targetId, isAdset } }
    })
  }

  async function applyAll() {
    setSaving(true)
    const res = {}
    await Promise.all(
      pendingChanges.map(async c => {
        try {
          const path = c.isAdset && c.targetId
            ? `/meta/adsets/${c.targetId}/budget`
            : `/meta/campaigns/${c.id}/budget`
          await request(path, {
            method: 'PATCH',
            body: JSON.stringify({ budget_type: 'daily', amount_brl: c.newBudget }),
          })
          res[c.id] = 'ok'
        } catch { res[c.id] = 'err' }
      })
    )
    setResults(res)
    setSaving(false)

    // Update local state for ok ones
    const okIds = Object.entries(res).filter(([, v]) => v === 'ok').map(([k]) => k)
    if (okIds.length) {
      setCampaigns(prev => prev.map(c => {
        const ch = pendingChanges.find(p => p.id === c.id)
        return okIds.includes(c.id) && ch ? { ...c, daily_budget: ch.newBudget } : c
      }))
      setPending(prev => {
        const n = { ...prev }
        okIds.forEach(id => delete n[id])
        return n
      })
    }
  }

  function closeModal() {
    setShowModal(false); setResults({})
  }

  function clearTab() {
    setPending(prev => {
      const n = { ...prev }
      filtered.forEach(c => delete n[c.id])
      return n
    })
  }

  return (
    <div className="flex h-screen bg-[#0A0F1A] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {showModal && (
          <BulkConfirmModal
            changes={pendingChanges}
            onConfirm={applyAll}
            onCancel={closeModal}
            saving={saving}
            results={results}
          />
        )}

        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <svg className="w-5 h-5" style={{ color: '#FBBF24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Budget Manager</h1>
                  <p className="text-sm" style={{ color: '#475569' }}>Meta Ads · Brasil · Editá varios y aplicá todo junto</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {lastFetch && !loading && (
                <span className="text-xs" style={{ color: '#334155' }}>
                  {lastFetch.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={fetchCampaigns}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: '#111827', border: '1px solid #1E293B', color: '#64748B' }}
                onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Recargar
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#111827' }}>
            {TABS.map(t => {
              const isActive = activeTab === t.key
              const pend     = pendingPerTab[t.key]
              const count    = campaigns.filter(c => c.name.toLowerCase().includes(t.key)).length
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={isActive
                    ? { background: t.bg, color: t.color, border: `1px solid ${t.color}30`, boxShadow: `0 0 16px ${t.glow}` }
                    : { background: 'transparent', color: '#4B5563', border: '1px solid transparent' }
                  }
                >
                  {t.label}
                  {!loading && (
                    <span className="ml-1.5 text-xs opacity-60 font-normal">{count}</span>
                  )}
                  {pend > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1"
                      style={{ background: t.color }}
                    >
                      {pend}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 px-8 pb-8 min-h-0">
          <div
            className="h-full flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#0D1424', border: '1px solid #1E293B' }}
          >
            {loading ? (
              <div className="flex-1 flex items-center justify-center gap-2" style={{ color: '#334155' }}>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                <span className="text-sm">Cargando desde Meta Ads…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#334155' }}>
                No hay campañas activas en esta categoría.
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full table-fixed">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E293B' }}>
                      <th className="pl-5 pr-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155', width: '40%' }}>Campaña</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155', width: '18%' }}>Actual / día</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155', width: '22%' }}>Nuevo valor</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155', width: '12%' }}>Δ</th>
                      <th style={{ width: '8%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <CampaignRow
                        key={c.id}
                        campaign={c}
                        tabColor={tab.color}
                        pendingValue={pending[c.id]?.value ?? null}
                        onChange={(v, targetId, isAdset) => handleChange(c.id, v, targetId, isAdset)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky apply bar ── */}
        {pendingChanges.length > 0 && (
          <div className="flex-shrink-0 px-8 pb-6">
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{
                background: 'rgba(10,15,26,0.95)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${tab.color}30`,
                boxShadow: `0 0 30px ${tab.glow}`,
              }}
            >
              {/* Pills */}
              <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                {pendingChanges.map(c => {
                  const diff = pctDiff(c.newBudget, c.currentBudget)
                  const up   = diff > 0
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ background: '#111827', border: '1px solid #1E293B' }}
                    >
                      <span className="max-w-[130px] truncate" style={{ color: '#64748B' }}>
                        {c.name.replace(/^br-\w+-/, '').substring(0, 28)}
                      </span>
                      <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#334155' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12"/></svg>
                      <span className="font-bold font-mono flex-shrink-0" style={{ color: '#E2E8F0' }}>{fmt(c.newBudget)}</span>
                      {diff != null && (
                        <span className="font-bold flex-shrink-0" style={{ color: up ? '#34D399' : '#F87171' }}>
                          {up ? '▲' : '▼'}{Math.abs(diff).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={clearTab}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#64748B'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >
                  Limpiar
                </button>
                <button
                  onClick={() => { setResults({}); setShowModal(true) }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)`,
                    boxShadow: `0 4px 16px ${tab.glow}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  Aplicar {pendingChanges.length} cambio{pendingChanges.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
