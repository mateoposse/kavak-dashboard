import React, { useState, useEffect } from 'react'

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kavak_alerts_v1'

function loadRules() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

// ── Default thresholds per vertical ──────────────────────────────────────────

const DEFAULTS = {
  Sale: [
    { id: 's1', metric: 'cpl',  op: '>',  threshold: 500,  label: 'CPL'  },
    { id: 's2', metric: 'cpm',  op: '>',  threshold: 30,   label: 'CPM'  },
    { id: 's3', metric: 'ctr',  op: '<',  threshold: 1,    label: 'CTR'  },
  ],
  Purchase: [
    { id: 'p1', metric: 'cpr',  op: '>',  threshold: 200,  label: 'CPR'  },
    { id: 'p2', metric: 'cpi',  op: '>',  threshold: 800,  label: 'CPI'  },
    { id: 'p3', metric: 'cpm',  op: '>',  threshold: 30,   label: 'CPM'  },
    { id: 'p4', metric: 'ctr',  op: '<',  threshold: 1,    label: 'CTR'  },
  ],
}

// ── Available metrics ─────────────────────────────────────────────────────────

const METRICS = {
  Sale: [
    { key: 'cpl',       label: 'CPL ($)'       },
    { key: 'cpql',      label: 'CPQL ($)'      },
    { key: 'cpr',       label: 'CPR ($)'       },
    { key: 'cpm',       label: 'CPM ($)'       },
    { key: 'ctr',       label: 'CTR (%)'       },
    { key: 'leads',     label: 'Leads'         },
    { key: 'qual_leads',label: 'Qual. Leads'   },
  ],
  Purchase: [
    { key: 'cpr',       label: 'CPR ($)'       },
    { key: 'cpi',       label: 'CPI ($)'       },
    { key: 'cpm',       label: 'CPM ($)'       },
    { key: 'ctr',       label: 'CTR (%)'       },
    { key: 'regs',      label: 'Registers'     },
    { key: 'inps',      label: 'Inspections'   },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(key, val) {
  if (val == null || isNaN(val)) return '—'
  const money = ['cpl','cpql','cpr','cpm','cpi','cpc','cpb','cpbu']
  if (money.includes(key)) return '$' + val.toFixed(2)
  if (key === 'ctr') return val.toFixed(2) + '%'
  return Math.round(val).toLocaleString()
}

function checkAlerts(kpis, rules) {
  if (!kpis) return []
  return rules.filter(r => {
    const val = kpis[r.metric]
    if (val == null || isNaN(val)) return false
    return r.op === '>' ? val > r.threshold : val < r.threshold
  }).map(r => ({ ...r, actual: kpis[r.metric] }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AlertsPanel({ kpis, campaignType, loading }) {
  const [allRules, setAllRules] = useState(() => {
    const saved = loadRules()
    return {
      Sale:     saved.Sale     || DEFAULTS.Sale,
      Purchase: saved.Purchase || DEFAULTS.Purchase,
    }
  })
  const [open, setOpen] = useState(false)
  const [newMetric, setNewMetric] = useState('')
  const [newOp, setNewOp]         = useState('>')
  const [newVal, setNewVal]       = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRules))
  }, [allRules])

  const rules = allRules[campaignType] || []

  function setRules(fn) {
    setAllRules(prev => ({
      ...prev,
      [campaignType]: typeof fn === 'function' ? fn(prev[campaignType] || []) : fn,
    }))
  }

  function removeRule(id) {
    setRules(prev => prev.filter(r => r.id !== id))
  }

  function addRule() {
    const m = newMetric || (METRICS[campaignType]?.[0]?.key)
    const v = parseFloat(newVal)
    if (!m || isNaN(v)) return
    const metricLabel = METRICS[campaignType]?.find(x => x.key === m)?.label || m
    setRules(prev => [
      ...prev,
      { id: Date.now().toString(), metric: m, op: newOp, threshold: v, label: metricLabel.replace(/ \(\$\)| \(%\)/, '') },
    ])
    setNewVal('')
  }

  const active = loading ? [] : checkAlerts(kpis, rules)

  if (!open && active.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1E293B] border border-[#334155] rounded-xl">
        <div className="flex items-center gap-2 text-xs text-[#22C55E] font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Todas las métricas dentro de los umbrales
        </div>
        <button onClick={() => setOpen(true)}
          className="text-[#475569] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#334155]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">

      {/* Active alerts */}
      {active.length > 0 && (
        <div className="p-3 space-y-2">
          {active.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-300 text-xs font-semibold">
                {a.label} {a.op === '>' ? 'superó' : 'cayó por debajo de'} el umbral de {fmtVal(a.metric, a.threshold)}
              </span>
              <span className="ml-auto text-red-200 text-xs font-bold">
                Actual: {fmtVal(a.metric, a.actual)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Config panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#334155]">
        <span className="text-[#475569] text-xs font-semibold uppercase tracking-wide">
          Configurar umbrales · {campaignType}
          {active.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
              {active.length} activa{active.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button onClick={() => setOpen(false)}
          className="text-[#475569] hover:text-white transition-colors text-sm">
          ✕
        </button>
      </div>

      {/* Rules table */}
      <div className="px-4 pb-3 space-y-1.5">
        {rules.map(r => {
          const firing = active.some(a => a.id === r.id)
          return (
            <div key={r.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors
                ${firing ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#0F172A] border border-[#334155]'}`}>
              <span className="font-semibold text-[#94A3B8] w-16 flex-shrink-0">{r.label}</span>
              <span className="text-[#475569]">{r.op === '>' ? '>' : '<'}</span>
              <span className="text-white font-mono">{fmtVal(r.metric, r.threshold)}</span>
              {firing && (
                <span className="text-red-400 font-semibold ml-1">
                  → {fmtVal(r.metric, active.find(a => a.id === r.id)?.actual)}
                </span>
              )}
              <button onClick={() => removeRule(r.id)}
                className="ml-auto text-[#334155] hover:text-red-400 transition-colors">×</button>
            </div>
          )
        })}

        {/* Add rule */}
        <div className="flex items-center gap-1.5 pt-1">
          <select value={newMetric || (METRICS[campaignType]?.[0]?.key || '')}
            onChange={e => setNewMetric(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] text-[#94A3B8] text-xs rounded-lg px-2 py-1.5 outline-none flex-1">
            {(METRICS[campaignType] || []).map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <select value={newOp} onChange={e => setNewOp(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] text-[#94A3B8] text-xs rounded-lg px-2 py-1.5 outline-none w-12">
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
          </select>
          <input type="number" value={newVal} onChange={e => setNewVal(e.target.value)}
            placeholder="valor"
            className="bg-[#0F172A] border border-[#334155] text-white text-xs rounded-lg px-2 py-1.5 outline-none w-20 focus:border-[#475569]"
            onKeyDown={e => e.key === 'Enter' && addRule()}
          />
          <button onClick={addRule}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#334155] hover:bg-[#475569] transition-colors">
            + Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
