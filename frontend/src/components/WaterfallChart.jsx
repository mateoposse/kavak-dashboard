import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { fetchWaterfall } from '../utils/api.js'

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtAbs(n) {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}

function fmtDelta(n) {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return sign + fmtAbs(n)
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function fmtTableVal(key, val) {
  if (val == null || isNaN(val)) return '—'
  if (key === 'spend') return '$' + Math.round(val).toLocaleString()
  if (key === 'cpm')   return '$' + val.toFixed(2)
  if (['impr', 'clicks', 'cots', 'regs', 'leads', 'inps', 'qual_leads'].includes(key))
    return Math.round(val).toLocaleString()
  // rates stored as plain decimal → display as %
  if (['ctr', 'clic_cot', 'cot_reg', 'cot_lead', 'reg_insp', 'lead_ql'].includes(key))
    return (val * 100).toFixed(2) + '%'
  return val.toFixed(2)
}

// ── Y axis helpers ───────────────────────────────────────────────────────────
function niceTickStep(maxVal, count = 5) {
  if (!maxVal || maxVal === 0) return 1
  const rough = maxVal / count
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)))
  const cands = [1, 2, 5, 10].map(c => c * mag)
  return cands.find(c => c >= rough) || cands[cands.length - 1]
}

function fmtAxis(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return n.toString()
}

// ── Custom SVG Waterfall ─────────────────────────────────────────────────────
function WaterfallSVG({ steps, accentColor, width }) {
  const PAD    = { top: 36, right: 16, bottom: 56, left: 60 }
  const H      = 280
  const svgH   = H + PAD.top + PAD.bottom
  const chartW = Math.max(width - PAD.left - PAD.right, 80)

  const maxVal = Math.max(...steps.map(s => Math.max(s.start ?? 0, s.end ?? 0)), 1)
  const yMax   = maxVal * 1.2
  const ys = v => H * (1 - Math.max(0, v) / yMax)

  const n     = steps.length
  const slotW = chartW / n
  const barW  = Math.min(Math.max(slotW * 0.60, 16), 72)

  const tickStep = niceTickStep(yMax)
  const yTicks = []
  for (let t = 0; t <= yMax * 1.01; t += tickStep) yTicks.push(t)

  return (
    <svg width={width} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>

        {/* Y grid lines + labels */}
        {yTicks.map((t, ti) => {
          const y = ys(t)
          return (
            <g key={ti}>
              <line x1={0} y1={y} x2={chartW} y2={y}
                stroke="#1E3A5F" strokeWidth={1} strokeDasharray="2 5" />
              <text x={-8} y={y + 4} textAnchor="end" fill="#475569" fontSize={10}>
                {fmtAxis(t)}
              </text>
            </g>
          )
        })}

        {/* Zero line */}
        <line x1={0} y1={ys(0)} x2={chartW} y2={ys(0)} stroke="#334155" strokeWidth={1} />

        {/* Connector dashed lines between bars */}
        {steps.map((step, i) => {
          if (i >= steps.length - 1) return null
          const next = steps[i + 1]
          if (step.type === 'total') return null
          if (next.type === 'total') return null   // no connector into the total bar
          const x1 = i * slotW + slotW / 2 + barW / 2
          const x2 = (i + 1) * slotW + slotW / 2 - barW / 2
          const cy = ys(step.end)
          return (
            <line key={`conn-${i}`}
              x1={x1} y1={cy} x2={x2} y2={cy}
              stroke="#334155" strokeDasharray="3 3" strokeWidth={1} />
          )
        })}

        {/* Bars */}
        {steps.map((step, i) => {
          const cx     = i * slotW + slotW / 2
          const x      = cx - barW / 2
          const isBase  = step.type === 'base'
          const isTotal = step.type === 'total'
          const isSpec  = isBase || isTotal

          const yHigh = isSpec ? ys(step.end)                       : ys(Math.max(step.start, step.end))
          const yLow  = isSpec ? ys(0)                              : ys(Math.min(step.start, step.end))
          const barH  = Math.max(yLow - yHigh, 1)

          const fill   = isTotal ? accentColor
            : isBase  ? '#334155'
            : step.delta >= 0 ? '#10B981' : '#EF4444'
          const fillOp = isBase ? 0.55 : 1

          // Value label placement
          const labelAbove = step.delta >= 0 || isSpec
          const labelY     = labelAbove ? yHigh - 6 : yLow + 14
          const labelTxt   = isSpec ? fmtAbs(step.end) : fmtDelta(step.delta)
          const labelColor = isSpec ? '#CBD5E1'
            : step.delta >= 0 ? '#34D399' : '#F87171'

          const pctTxt = (!isSpec && step.pct != null) ? fmtPct(step.pct) : null

          return (
            <g key={i}>
              {/* Bar */}
              <rect x={x} y={yHigh} width={barW} height={barH}
                fill={fill} fillOpacity={fillOp} rx={3} />

              {/* Stroke on total bar */}
              {isTotal && (
                <rect x={x} y={yHigh} width={barW} height={barH}
                  fill="none" stroke={accentColor} strokeOpacity={0.5} strokeWidth={1.5} rx={3} />
              )}

              {/* Value label */}
              <text x={cx} y={labelY} textAnchor="middle"
                fill={labelColor}
                fontSize={isSpec ? 11 : 10}
                fontWeight={isSpec ? 700 : 600}>
                {labelTxt}
              </text>

              {/* % label (smaller, above/below value label) */}
              {pctTxt && (
                <text x={cx} y={labelAbove ? yHigh - 19 : yLow + 26}
                  textAnchor="middle" fill="#475569" fontSize={9}>
                  {pctTxt}
                </text>
              )}

              {/* X axis label */}
              <text x={cx} y={H + 18} textAnchor="middle"
                fill={isSpec ? '#94A3B8' : '#64748B'}
                fontSize={slotW > 60 ? 10 : 9}
                fontWeight={isSpec ? 600 : 400}>
                {step.label}
              </text>

              {/* WoW % for total bar */}
              {isTotal && step.pct != null && (
                <text x={cx} y={H + 32} textAnchor="middle"
                  fill={step.pct >= 0 ? '#34D399' : '#F87171'}
                  fontSize={9} fontWeight={700}>
                  {fmtPct(step.pct)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ── Metrics comparison table ─────────────────────────────────────────────────
function MetricsTable({ prev, curr, campaignType }) {
  if (!prev || !curr) return null

  const rows = campaignType === 'Purchase' ? [
    { key: 'spend',    label: 'Spend ($)' },
    { key: 'impr',     label: 'Impressions' },
    { key: 'clicks',   label: 'Clicks' },
    { key: 'cots',     label: 'Cots (COT)' },
    { key: 'regs',     label: 'Regs' },
    { key: 'inps',     label: 'Inspections' },
    { key: 'cpm',      label: 'CPM' },
    { key: 'ctr',      label: 'CTR' },
    { key: 'clic_cot', label: 'Clic → Cot' },
    { key: 'cot_reg',  label: 'Cot → Reg' },
    { key: 'reg_insp', label: 'Reg → Insp' },
  ] : [
    { key: 'spend',    label: 'Spend ($)' },
    { key: 'impr',     label: 'Impressions' },
    { key: 'clicks',   label: 'Clicks' },
    { key: 'cots',     label: 'Cots (COT)' },
    { key: 'leads',    label: 'Leads' },
    { key: 'qual_leads', label: 'Qual. Leads' },
    { key: 'cpm',      label: 'CPM' },
    { key: 'ctr',      label: 'CTR' },
    { key: 'clic_cot', label: 'Clic → Cot' },
    { key: 'cot_lead', label: 'Cot → Lead' },
    { key: 'lead_ql',  label: 'Lead → QL' },
  ]

  // Which metrics are "lower = better" (inverts WoW color)
  const lowerBetter = new Set(['cpm'])
  // Which are neutral (no color)
  const neutral = new Set(['spend', 'impr', 'clicks'])

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="border-b border-[#334155]">
            <th className="text-left px-3 py-2 text-[#475569] font-semibold w-32">Metric</th>
            <th className="text-right px-3 py-2 text-[#475569] font-semibold">Prev Week</th>
            <th className="text-right px-3 py-2 text-[#475569] font-semibold">Curr Week</th>
            <th className="text-right px-3 py-2 text-[#475569] font-semibold">WoW</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => {
            const pv  = prev[key]
            const cv  = curr[key]
            const wow = (pv != null && pv !== 0)
              ? ((cv ?? 0) - pv) / Math.abs(pv) * 100
              : null
            const up  = wow != null && wow >= 0
            let wowColor = '#64748B'
            if (wow != null && !neutral.has(key)) {
              wowColor = lowerBetter.has(key)
                ? (up ? '#F87171' : '#34D399')
                : (up ? '#34D399' : '#F87171')
            }
            return (
              <tr key={key} className="border-b border-[#1E3A5F]/60 hover:bg-[#334155]/20 transition-colors">
                <td className="px-3 py-1.5 text-[#94A3B8]">{label}</td>
                <td className="px-3 py-1.5 text-right text-[#64748B]">{fmtTableVal(key, pv)}</td>
                <td className="px-3 py-1.5 text-right text-white font-medium">{fmtTableVal(key, cv)}</td>
                <td className="px-3 py-1.5 text-right font-semibold" style={{ color: wowColor }}>
                  {wow != null ? fmtPct(wow) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function WaterfallChart({ campaignType, accentColor }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [selIdx,  setSelIdx]  = useState(null)

  const containerRef = useRef(null)
  const [cWidth, setCWidth]   = useState(800)

  // Fetch waterfall data
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchWaterfall({ campaign_type: campaignType })
      .then(res => {
        if (cancelled) return
        setData(res)
        if (res?.waterfalls?.length) {
          setSelIdx(res.waterfalls.length - 1)  // default: latest transition
        }
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Error loading waterfall')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [campaignType])

  // Track container width for responsive SVG
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      if (entries[0]) setCWidth(entries[0].contentRect.width)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const selected   = selIdx != null ? data?.waterfalls?.[selIdx] : null
  const mainLabel  = campaignType === 'Purchase' ? 'Regs' : 'Leads'

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
      {/* Card header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: accentColor }} />
          <h3 className="text-white font-semibold text-sm">
            WoW Waterfall — {mainLabel}
          </h3>
        </div>
        <span className="text-[#475569] text-xs hidden sm:block">
          Spend · CPM · CTR · Clic→Cot · Cot→{campaignType === 'Purchase' ? 'Reg' : 'Lead'}
        </span>
      </div>
      <p className="text-[#475569] text-[11px] mb-4 ml-5">
        Descomposición semana vs semana · últimas {data?.waterfalls?.length ?? '—'} transiciones
      </p>

      {/* Week selector tabs */}
      {!loading && data?.waterfalls?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {data.waterfalls.map((wf, i) => (
            <button key={i} onClick={() => setSelIdx(i)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
              style={selIdx === i
                ? { backgroundColor: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}55` }
                : { color: '#64748B', border: '1px solid transparent', backgroundColor: '#0F172A' }
              }
            >
              {wf.prev_week} → {wf.week}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse">
          <div className="flex gap-1.5 mb-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-6 w-16 bg-[#334155] rounded-lg" />
            ))}
          </div>
          <div className="h-[340px] bg-[#334155]/40 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/20">
          Error: {error}
        </div>
      )}

      {/* Chart + table */}
      {!loading && !error && selected && selected.steps.length > 0 && (
        <>
          <div ref={containerRef} style={{ width: '100%' }}>
            {cWidth > 0 && (
              <WaterfallSVG
                steps={selected.steps}
                accentColor={accentColor}
                width={cWidth}
              />
            )}
          </div>

          <p className="text-[#475569] text-[10px] mt-2">
            Colores: 🟢 efecto positivo · 🔴 efecto negativo · Mix/Other = efectos de interacción no capturados por el modelo multiplicativo.
          </p>

          <MetricsTable
            prev={selected.metrics.prev}
            curr={selected.metrics.curr}
            campaignType={campaignType}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && !error && (!selected || selected.steps.length === 0) && (
        <div className="text-center text-[#475569] text-sm py-12">
          No hay datos suficientes para calcular el waterfall.
        </div>
      )}
    </div>
  )
}
