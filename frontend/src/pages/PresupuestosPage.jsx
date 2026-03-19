import React, { useEffect, useState, useCallback } from 'react'
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
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ACTIVE:   { label: 'Activa',  bg: '#052e16', text: '#22c55e', dot: '#22c55e' },
    PAUSED:   { label: 'Pausada', bg: '#1c1917', text: '#a8a29e', dot: '#78716c' },
    ARCHIVED: { label: 'Archivada', bg: '#1c1917', text: '#6b7280', dot: '#4b5563' },
  }
  const s = map[status] || { label: status, bg: '#1E293B', text: '#94A3B8', dot: '#475569' }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  const bg = type === 'success' ? '#052e16' : '#450a0a'
  const border = type === 'success' ? '#166534' : '#7f1d1d'
  const text = type === 'success' ? '#4ade80' : '#f87171'
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border"
      style={{ backgroundColor: bg, borderColor: border, color: text }}
    >
      {message}
    </div>
  )
}

// ── Campaign row ───────────────────────────────────────────────────────────────

function CampaignRow({ campaign, onSave }) {
  const currentBudget =
    campaign.budget_type === 'daily'    ? campaign.daily_budget :
    campaign.budget_type === 'lifetime' ? campaign.lifetime_budget : null

  const [inputVal, setInputVal]   = useState(currentBudget != null ? String(currentBudget) : '')
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)

  const dirty = inputVal !== '' && parseFloat(inputVal) !== currentBudget

  const handleSave = async () => {
    const amount = parseFloat(inputVal)
    if (!amount || isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      await onSave(campaign.id, campaign.budget_type, amount)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const ins = campaign.insights || {}

  return (
    <tr className="border-b border-[#1E293B] hover:bg-[#1E293B]/50 transition-colors group">
      {/* Name */}
      <td className="py-3 px-4 max-w-[220px]">
        <span className="text-white text-sm font-medium leading-snug line-clamp-2">{campaign.name}</span>
      </td>

      {/* Status */}
      <td className="py-3 px-4 whitespace-nowrap">
        <StatusBadge status={campaign.status} />
      </td>

      {/* Budget type */}
      <td className="py-3 px-4 whitespace-nowrap">
        {campaign.budget_type === 'adset' ? (
          <span className="text-[#475569] text-xs">A nivel adset</span>
        ) : (
          <span className="text-[#94A3B8] text-xs capitalize">{campaign.budget_type}</span>
        )}
      </td>

      {/* Current budget */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <span className="text-[#94A3B8] text-sm tabular-nums">
          {currentBudget != null ? fmtBRL(currentBudget) : <span className="text-[#475569] text-xs">—</span>}
        </span>
      </td>

      {/* Editable new budget */}
      <td className="py-3 px-4 whitespace-nowrap">
        {campaign.budget_type === 'adset' ? (
          <span className="text-[#334155] text-xs">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569] text-xs">R$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && dirty && handleSave()}
                className="w-32 pl-8 pr-2 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white text-sm
                           tabular-nums focus:outline-none focus:border-[#F97316] transition-colors"
                placeholder={currentBudget ?? '0'}
              />
            </div>

            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                           bg-[#F97316] text-white hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '…' : 'Guardar'}
              </button>
            )}

            {saved && !dirty && (
              <span className="text-[#22c55e] text-xs font-semibold">✓ Guardado</span>
            )}
          </div>
        )}
      </td>

      {/* Spend */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <span className="text-white text-sm tabular-nums font-medium">{fmtBRL(ins.spend)}</span>
      </td>

      {/* Impressions */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <span className="text-[#94A3B8] text-sm tabular-nums">{fmtNum(ins.impressions)}</span>
      </td>

      {/* CTR */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <span className="text-[#94A3B8] text-sm tabular-nums">
          {ins.ctr != null ? ins.ctr.toFixed(2) + '%' : '—'}
        </span>
      </td>

      {/* CPC */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <span className="text-[#94A3B8] text-sm tabular-nums">{fmtBRL(ins.cpc)}</span>
      </td>
    </tr>
  )
}

// ── Account section ────────────────────────────────────────────────────────────

function AccountSection({ account, datePreset, onSave, toast }) {
  const [campaigns, setCampaigns] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    request(`/meta/campaigns?account_id=${account.id}&date_preset=${datePreset}`)
      .then(d => setCampaigns(d.campaigns || []))
      .catch(e => setError(e.message || 'Error al cargar campañas'))
      .finally(() => setLoading(false))
  }, [account.id, datePreset])

  const totalSpend = campaigns
    ? campaigns.reduce((s, c) => s + (c.insights?.spend || 0), 0)
    : null

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      {/* Account header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#334155]/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{account.name}</p>
            <p className="text-[#475569] text-xs">{account.id} · {account.currency} · {account.timezone}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {totalSpend != null && (
            <div className="text-right">
              <p className="text-[#475569] text-[10px] uppercase tracking-wider">Spend período</p>
              <p className="text-white font-bold text-sm tabular-nums">{fmtBRL(totalSpend)}</p>
            </div>
          )}
          <svg
            className={`w-4 h-4 text-[#475569] transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Campaigns table */}
      {!collapsed && (
        <div className="border-t border-[#334155]">
          {loading && (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <p className="py-8 text-center text-red-400 text-sm">{error}</p>
          )}
          {!loading && !error && campaigns?.length === 0 && (
            <p className="py-8 text-center text-[#475569] text-sm">No hay campañas en esta cuenta.</p>
          )}
          {!loading && !error && campaigns?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#334155]">
                    {['Campaña','Estado','Tipo','Budget actual','Nuevo budget','Spend','Impr.','CTR','CPC'].map(h => (
                      <th key={h} className="py-2.5 px-4 text-[10px] text-[#475569] font-semibold uppercase tracking-wider whitespace-nowrap text-right first:text-left last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <CampaignRow
                      key={c.id}
                      campaign={c}
                      onSave={onSave}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { value: 'last_7d',    label: 'Últimos 7 días'  },
  { value: 'last_14d',   label: 'Últimos 14 días' },
  { value: 'last_30d',   label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes'        },
  { value: 'last_month', label: 'Mes anterior'    },
]

export default function PresupuestosPage() {
  const [accounts,    setAccounts]    = useState([])
  const [loadingAcc,  setLoadingAcc]  = useState(true)
  const [errorAcc,    setErrorAcc]    = useState(null)
  const [datePreset,  setDatePreset]  = useState('last_30d')
  const [toast,       setToast]       = useState(null)

  useEffect(() => {
    request('/meta/accounts')
      .then(d => setAccounts(d.accounts || []))
      .catch(e => setErrorAcc(e.message || 'Error al cargar cuentas'))
      .finally(() => setLoadingAcc(false))
  }, [])

  const handleSaveBudget = useCallback(async (campaignId, budgetType, amountBrl) => {
    await request(`/meta/campaigns/${campaignId}/budget`, {
      method: 'PATCH',
      body: JSON.stringify({ budget_type: budgetType, amount_brl: amountBrl }),
    })
    setToast({ type: 'success', message: `✓ Budget actualizado a ${fmtBRL(amountBrl)}` })
  }, [])

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Presupuestos" subtitle="Meta Ads · Edición de budgets por campaña" />

        <main className="flex-1 p-6 space-y-5">

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h2 className="text-white font-bold text-lg">Gestión de Presupuestos</h2>
            </div>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] text-white text-sm rounded-xl px-3 py-2
                         focus:outline-none focus:border-[#F97316] cursor-pointer"
            >
              {DATE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Loading accounts */}
          {loadingAcc && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {errorAcc && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
              {errorAcc}
            </div>
          )}

          {/* One section per account */}
          {!loadingAcc && !errorAcc && accounts.map(account => (
            <AccountSection
              key={account.id}
              account={account}
              datePreset={datePreset}
              onSave={handleSaveBudget}
            />
          ))}

          {!loadingAcc && !errorAcc && accounts.length === 0 && (
            <p className="text-center text-[#475569] text-sm py-20">
              No se encontraron cuentas publicitarias asociadas a este token.
            </p>
          )}
        </main>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
