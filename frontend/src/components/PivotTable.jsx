import React from 'react'
import { formatPivotValue, formatVsYday } from '../utils/formatters.js'

// ── Metric group definitions ──────────────────────────────────────────────────

const PURCHASE_GROUPS = [
  {
    group: 'Volume',
    rows: [
      { key: 'spend',     label: 'Spend',        fmt: 'cost' },
      { key: 'impr',      label: 'Impressions',  fmt: 'int'  },
      { key: 'clicks',    label: 'Clicks',       fmt: 'int'  },
      { key: 'traffic',   label: 'Traffic',      fmt: 'int'  },
      { key: 'regs',      label: 'Regs',         fmt: 'int'  },
      { key: 'inps_made', label: 'OS',           fmt: 'int'  },
      { key: 'new_acc',   label: 'New Accounts', fmt: 'int'  },
      { key: 'pct_na',    label: '% NA',         fmt: 'pct'  },
      { key: 'pct_meta',  label: '% Meta',       fmt: 'pct'  },
    ],
  },
  {
    group: 'Ratios',
    rows: [
      { key: 'ctr',           label: 'CTR',             fmt: 'pct' },
      { key: 'click_traffic', label: 'Click ↔ Traffic', fmt: 'pct' },
      { key: 'traffic_reg',   label: 'Traffic ↔ Reg',   fmt: 'pct' },
      { key: 'click_reg',     label: 'Click ↔ Reg',     fmt: 'pct' },
      { key: 'reg_insp',      label: 'Reg ↔ Insp',      fmt: 'pct' },
    ],
  },
  {
    group: 'Costs',
    rows: [
      { key: 'cpm',  label: 'CPM',  fmt: 'cost' },
      { key: 'cpu',  label: 'CPU',  fmt: 'cost' },
      { key: 'cpr',  label: 'CPR',  fmt: 'cost', priority: true },
      { key: 'cpi',  label: 'CPI',  fmt: 'cost' },
      { key: 'cpna', label: 'CPNA', fmt: 'cost' },
    ],
  },
]

const SALE_GROUPS = [
  {
    group: 'Volume',
    rows: [
      { key: 'spend',      label: 'Spend',        fmt: 'cost' },
      { key: 'impr',       label: 'Impressions',  fmt: 'int'  },
      { key: 'clicks',     label: 'Clicks',       fmt: 'int'  },
      { key: 'vips',       label: 'VIPs',         fmt: 'int'  },
      { key: 'leads',      label: 'Leads',        fmt: 'int'  },
      { key: 'qual_leads', label: 'QL',           fmt: 'int'  },
      { key: 'new_acc',    label: 'New Accounts', fmt: 'int'  },
      { key: 'pct_na',     label: '% NA',         fmt: 'pct'  },
      { key: 'pct_meta',   label: '% Meta',       fmt: 'pct'  },
    ],
  },
  {
    group: 'Ratios',
    rows: [
      { key: 'ctr',           label: 'CTR',             fmt: 'pct' },
      { key: 'click_traffic', label: 'Click ↔ Traffic', fmt: 'pct' },
      { key: 'traffic_lead',  label: 'Traffic ↔ Lead',  fmt: 'pct' },
      { key: 'click_lead',    label: 'Click ↔ Lead',    fmt: 'pct' },
      { key: 'lead_insp',     label: 'Lead ↔ Insp',     fmt: 'pct' },
    ],
  },
  {
    group: 'Costs',
    rows: [
      { key: 'cpm',  label: 'CPM',  fmt: 'cost' },
      { key: 'cpv',  label: 'CPV',  fmt: 'cost' },
      { key: 'cpl',  label: 'CPL',  fmt: 'cost', priority: true },
      { key: 'cpql', label: 'CPQL', fmt: 'cost' },
      { key: 'cpna', label: 'CPNA', fmt: 'cost' },
    ],
  },
]

// Metrics where a summed total is meaningful
const SUMMABLE_KEYS = new Set([
  'spend', 'impr', 'clicks', 'traffic', 'regs', 'inps_made',
  'new_acc', 'vips', 'leads', 'qual_leads',
])

function getGroups(campaignType, showPctMeta) {
  const base = campaignType === 'Purchase' ? PURCHASE_GROUPS : SALE_GROUPS
  if (showPctMeta) return base
  return base.map(g => ({ ...g, rows: g.rows.filter(r => r.key !== 'pct_meta') }))
}

function parseDateHeader(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dt = new Date(year, month - 1, day)
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
  return { dow, md: `${month}/${day}` }
}

// vs-yday: ((last - prev) / prev) * 100; returns null if not computable
function computeVsYday(values) {
  if (!values || values.length < 2) return null
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  if (last === null || last === undefined || prev === null || prev === undefined || prev === 0) return null
  return ((last - prev) / prev) * 100
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonPivot({ dates, firstColWidth }) {
  const cols = (dates?.length || 10) + 1 // +1 for vs yday
  return (
    <div className="overflow-x-auto">
      <table style={{ minWidth: firstColWidth + cols * 90 }}>
        <thead>
          <tr>
            <th style={{ width: firstColWidth, minWidth: firstColWidth }} className="bg-[#151E2D] border-b border-r border-[#334155] py-3 px-3" />
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ width: i === cols - 1 ? 80 : 90 }} className="bg-[#151E2D] border-b border-[#334155] py-3 px-2 text-center">
                <div className="h-2.5 bg-[#334155] rounded skeleton mx-auto w-8 mb-1" />
                <div className="h-3.5 bg-[#334155] rounded skeleton mx-auto w-10" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }).map((_, i) => (
            <tr key={i}>
              <td className="bg-[#151E2D] border-r border-[#334155]/40 py-2.5 px-3">
                <div className="h-3 bg-[#334155] rounded skeleton w-24" />
              </td>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="py-2.5 px-2">
                  <div className="h-3 bg-[#334155] rounded skeleton ml-auto w-14" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PivotTable({
  dates,
  section,
  campaignType,
  firstColWidth = 200,
  showPctMeta = true,
  showTotals = false,
  loading = false,
  weekMode = false,
  rrValues = null,
  vsLabel = ['vs', 'yday'],
}) {
  const groups = getGroups(campaignType, showPctMeta)
  const parsedDates = weekMode
    ? (dates || []).map(d => ({ str: d, label: d }))
    : (dates || []).map(d => ({ str: d, ...parseDateHeader(d) }))

  if (loading) return <SkeletonPivot dates={dates} firstColWidth={firstColWidth} />
  if (!section) return null

  const DATE_COL_W = 90
  const RR_COL_W = 80
  const VSYDAY_COL_W = 80

  // All rows flattened (needed for totals)
  const allRows = groups.flatMap(g => g.rows)
  const hasRR = rrValues && Object.keys(rrValues).length > 0

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '560px' }}>
      <table
        className="border-collapse"
        style={{
          tableLayout: 'fixed',
          minWidth: firstColWidth + parsedDates.length * DATE_COL_W + (hasRR ? RR_COL_W : 0) + VSYDAY_COL_W,
        }}
      >
        <colgroup>
          <col style={{ width: firstColWidth, minWidth: firstColWidth }} />
          {parsedDates.map(d => <col key={d.str} style={{ width: DATE_COL_W }} />)}
          {hasRR && <col style={{ width: RR_COL_W }} />}
          <col style={{ width: VSYDAY_COL_W }} />
        </colgroup>

        {/* ── Sticky header ── */}
        <thead>
          <tr>
            <th
              style={{ position: 'sticky', top: 0, left: 0, zIndex: 30, backgroundColor: '#151E2D', minWidth: firstColWidth }}
              className="border-b border-r border-[#334155] py-3 px-3 text-left"
            />
            {parsedDates.map(({ str, dow, md, label }) => (
              <th
                key={str}
                style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#151E2D', width: DATE_COL_W }}
                className="border-b border-[#334155] py-3 px-2 text-center"
              >
                {weekMode
                  ? <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{label}</div>
                  : <>
                      <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500, lineHeight: 1 }}>{dow}</div>
                      <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 700, marginTop: 3, lineHeight: 1 }}>{md}</div>
                    </>
                }
              </th>
            ))}
            {/* RR header */}
            {hasRR && (
              <th
                style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#151E2D', width: RR_COL_W }}
                className="border-b border-l border-[#334155] py-3 px-2 text-center"
              >
                <div style={{ color: '#8B5CF6', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>RR</div>
              </th>
            )}
            {/* vs yday/last wk header */}
            <th
              style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#151E2D', width: VSYDAY_COL_W }}
              className="border-b border-l border-[#334155] py-3 px-2 text-center"
            >
              <div style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{vsLabel[0]}</div>
              <div style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>{vsLabel[1]}</div>
            </th>
          </tr>
        </thead>

        <tbody>
          {groups.map(({ group, rows }) => (
            <React.Fragment key={group}>
              {/* Group separator */}
              <tr>
                <td
                  colSpan={parsedDates.length + 2}
                  className="border-t border-[#334155]/60"
                  style={{
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'rgba(15,23,42,0.75)',
                    paddingTop: 14,
                    paddingBottom: 4,
                    paddingLeft: 12,
                    paddingRight: 12,
                  }}
                >
                  <span style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {group}
                  </span>
                </td>
              </tr>

              {/* Metric rows */}
              {rows.map((row, ri) => {
                const values = section.rows?.[row.key] || []
                const isPriority = !!row.priority
                const vsYdayPct = computeVsYday(values)
                const vsYday = formatVsYday(vsYdayPct, row.key)

                const rowBg = isPriority ? 'rgba(59,130,246,0.18)' : 'transparent'
                const labelBg = isPriority ? 'rgba(30,58,120,0.55)' : '#151E2D'

                return (
                  <tr
                    key={row.key}
                    style={{ backgroundColor: rowBg }}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Label cell */}
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        backgroundColor: labelBg,
                        minWidth: firstColWidth,
                        paddingTop: 10,
                        paddingBottom: 10,
                        paddingLeft: 12,
                        paddingRight: 8,
                        borderRight: isPriority ? '3px solid #3B82F6' : '1px solid rgba(51,65,85,0.5)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isPriority ? 14 : 13,
                          fontWeight: isPriority ? 700 : 500,
                          color: isPriority ? '#93C5FD' : '#94A3B8',
                        }}
                      >
                        {row.label}
                      </span>
                    </td>

                    {/* Value cells */}
                    {values.map((val, di) => {
                      const formatted = formatPivotValue(row.fmt, val)
                      const isNull = formatted === null
                      const altBg = ri % 2 !== 0 && !isPriority ? 'rgba(26,38,64,0.35)' : undefined
                      return (
                        <td
                          key={di}
                          style={{
                            paddingTop: 10,
                            paddingBottom: 10,
                            paddingLeft: 6,
                            paddingRight: 6,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: isPriority ? 14 : 13,
                            fontWeight: isPriority ? 700 : 400,
                            color: isNull
                              ? '#475569'
                              : isPriority
                              ? '#93C5FD'
                              : ri % 2 === 0 ? '#E2E8F0' : '#CBD5E1',
                            backgroundColor: altBg,
                          }}
                        >
                          {isNull ? '—' : formatted}
                        </td>
                      )
                    })}

                    {/* RR cell */}
                    {hasRR && (() => {
                      const rrVal = rrValues?.[row.key]
                      const rrFmt = formatPivotValue(row.fmt, rrVal)
                      return (
                        <td
                          style={{
                            paddingTop: 10,
                            paddingBottom: 10,
                            paddingLeft: 6,
                            paddingRight: 6,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: isPriority ? 14 : 13,
                            fontWeight: isPriority ? 700 : 400,
                            color: rrFmt === null ? '#475569' : '#C4B5FD',
                            borderLeft: '1px solid rgba(139,92,246,0.25)',
                            backgroundColor: 'rgba(139,92,246,0.05)',
                          }}
                        >
                          {rrFmt === null ? '—' : rrFmt}
                        </td>
                      )
                    })()}

                    {/* vs yday cell */}
                    <td
                      style={{
                        paddingTop: 10,
                        paddingBottom: 10,
                        paddingLeft: 6,
                        paddingRight: 8,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 12,
                        fontWeight: 600,
                        color: vsYdayPct === null ? '#475569' : vsYday.color,
                        borderLeft: '1px solid rgba(51,65,85,0.4)',
                      }}
                    >
                      {vsYday.text}
                    </td>
                  </tr>
                )
              })}
            </React.Fragment>
          ))}

          {/* ── Totals row (campaign view only) ── */}
          {showTotals && (
            <tr style={{ borderTop: '2px solid #334155', backgroundColor: '#1E293B' }}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 10,
                  backgroundColor: '#1E293B',
                  minWidth: firstColWidth,
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 12,
                  paddingRight: 8,
                  borderRight: '1px solid rgba(51,65,85,0.5)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#F8FAFC',
                }}
              >
                Total
              </td>
              {parsedDates.map((_, di) => {
                // Sum all summable rows for this date column
                let totalSpend = null
                const spendVals = section.rows?.['spend'] || []
                if (spendVals[di] !== null && spendVals[di] !== undefined) {
                  totalSpend = spendVals[di]
                }
                const formatted = formatPivotValue('cost', totalSpend)
                return (
                  <td
                    key={di}
                    style={{
                      paddingTop: 10,
                      paddingBottom: 10,
                      paddingLeft: 6,
                      paddingRight: 6,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 13,
                      fontWeight: 700,
                      color: formatted === null ? '#475569' : '#F8FAFC',
                    }}
                  >
                    {formatted === null ? '—' : formatted}
                  </td>
                )
              })}
              {hasRR && (() => {
                const rrFmt = formatPivotValue('cost', rrValues?.['spend'])
                return (
                  <td style={{ paddingTop: 10, paddingBottom: 10, paddingLeft: 6, paddingRight: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: rrFmt === null ? '#475569' : '#C4B5FD', borderLeft: '1px solid rgba(139,92,246,0.25)', backgroundColor: 'rgba(139,92,246,0.05)' }}>
                    {rrFmt === null ? '—' : rrFmt}
                  </td>
                )
              })()}
              <td
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 6,
                  paddingRight: 8,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 600,
                  borderLeft: '1px solid rgba(51,65,85,0.4)',
                  color: (() => {
                    const spendVals = section.rows?.['spend'] || []
                    const pct = computeVsYday(spendVals)
                    return pct === null ? '#475569' : formatVsYday(pct, 'spend').color
                  })(),
                }}
              >
                {(() => {
                  const spendVals = section.rows?.['spend'] || []
                  const pct = computeVsYday(spendVals)
                  return formatVsYday(pct, 'spend').text
                })()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
