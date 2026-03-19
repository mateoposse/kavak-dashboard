import React, { useState, useEffect } from 'react'
import { apiGet } from '../utils/api.js'

const BORDER = '#334155'
const COST_METRICS = new Set(['cpr', 'cpl', 'cpql'])

// Green → Yellow → Red (lower cost = green)
function interpolateColor(ratio) {
  let r, g, b
  if (ratio <= 0.5) {
    const t = ratio * 2
    r = Math.round(74 + t * (253 - 74))
    g = Math.round(222 + t * (224 - 222))
    b = Math.round(128 + t * (71 - 128))
  } else {
    const t = (ratio - 0.5) * 2
    r = Math.round(253 + t * (248 - 253))
    g = Math.round(224 + t * (113 - 224))
    b = Math.round(71 + t * (113 - 71))
  }
  return `rgb(${r},${g},${b})`
}

// Global coloring using percentiles to exclude outliers (P10–P90)
function computeGlobalMinMax(campaigns) {
  const all = campaigns.flatMap(c => c.values).filter(v => v !== null && v > 0)
  if (all.length === 0) return { min: 0, max: 0 }
  all.sort((a, b) => a - b)
  const p10 = all[Math.floor(all.length * 0.10)] ?? all[0]
  const p90 = all[Math.floor(all.length * 0.90)] ?? all[all.length - 1]
  return { min: p10, max: p90 }
}

function getGlobalRatio(val, globalMin, globalMax) {
  if (val === null) return null
  if (val === 0) return 1
  if (globalMax === globalMin) return 0.5
  const clamped = Math.max(globalMin, Math.min(globalMax, val))
  return (clamped - globalMin) / (globalMax - globalMin)
}

function fmtDate(dt) {
  const d = new Date(dt + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function formatCellValue(key, val) {
  if (val === null) return ''
  if (COST_METRICS.has(key)) {
    return val === 0 ? '$0.0' : `$${val.toFixed(1)}`
  }
  if (key === 'spend') {
    return `$${Math.round(val).toLocaleString()}`
  }
  return Math.round(val).toLocaleString()
}

function avgValues(values) {
  const valid = values.filter(v => v !== null && v > 0)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function computeColAvgs(campaigns, numDates) {
  return Array.from({ length: numDates }, (_, i) => {
    const vals = campaigns.map(c => c.values[i]).filter(v => v !== null && v > 0)
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })
}

export default function CostHeatmapTable({ dateFrom, dateTo, campaignType, accentColor }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [hoveredCol, setHoveredCol] = useState(null)

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    let cancelled = false
    setLoading(true)
    setError('')
    apiGet('/data/cost-heatmap', { date_from: dateFrom, date_to: dateTo, campaign_type: campaignType })
      .then(res => { if (!cancelled) { setData(res); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [dateFrom, dateTo, campaignType])

  if (loading) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
        <div className="h-5 w-56 bg-[#334155] rounded animate-pulse mb-4" />
        <div className="h-64 bg-[#334155] rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 text-red-400 text-sm">
        Error loading heatmap: {error}
      </div>
    )
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 text-center text-[#475569] text-sm py-12">
        No campaign data for the selected period.
      </div>
    )
  }

  const { dates, metrics } = data
  const q = search.trim().toLowerCase()

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
          Performance por Campaña — Vista Diaria
        </h3>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrar campañas…"
          className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-white text-xs w-48 focus:outline-none focus:border-[#475569] placeholder-[#475569]"
        />
      </div>

      <div className="overflow-x-auto">
        <table
          className="text-xs border-collapse"
          style={{ minWidth: Math.max(500, (dates.length + 1) * 80) }}
        >
          <thead>
            <tr>
              <th
                className="text-left px-3 py-2 text-white font-semibold border sticky left-0 z-20"
                style={{ backgroundColor: accentColor + '40', borderColor: BORDER, whiteSpace: 'nowrap' }}
              >
                Campaña
              </th>
              {dates.map((dt, i) => (
                <th
                  key={dt}
                  className="px-2 py-2 text-center font-semibold border text-white"
                  style={{
                    backgroundColor: hoveredCol === i ? accentColor + '70' : accentColor + '40',
                    borderColor: hoveredCol === i ? accentColor : BORDER,
                    minWidth: 78, width: 78,
                    transition: 'background-color 0.1s',
                    cursor: 'default',
                  }}
                  onMouseEnter={() => setHoveredCol(i)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  {fmtDate(dt)}
                </th>
              ))}
              <th
                className="px-2 py-2 text-center font-semibold border text-white"
                style={{
                  backgroundColor: accentColor + '25',
                  borderColor: BORDER,
                  borderLeft: `2px solid ${accentColor}60`,
                  minWidth: 72, width: 72,
                }}
              >
                Prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label, campaigns }) => {
              const isCost = COST_METRICS.has(key)
              const filtered = q ? campaigns.filter(c => c.name.toLowerCase().includes(q)) : campaigns
              if (filtered.length === 0) return null

              const { min: globalMin, max: globalMax } = isCost ? computeGlobalMinMax(filtered) : { min: 0, max: 0 }
              const colAvgs = computeColAvgs(filtered, dates.length)

              return (
                <React.Fragment key={key}>
                  {/* Section header */}
                  <tr>
                    <td
                      colSpan={dates.length + 2}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wider border"
                      style={{ backgroundColor: accentColor + '20', borderColor: BORDER, color: accentColor }}
                    >
                      {label}
                    </td>
                  </tr>

                  {/* Campaign rows */}
                  {filtered.map(camp => {
                    const rowAvg = avgValues(camp.values)
                    return (
                      <tr key={`${key}-${camp.name}`}>
                        <td
                          title={camp.name}
                          className="px-3 py-1.5 font-medium border sticky left-0 z-10"
                          style={{
                            backgroundColor: '#1E293B',
                            borderLeft: `3px solid ${camp.color}`,
                            borderColor: BORDER,
                            borderLeftColor: camp.color,
                            color: '#CBD5E1',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {camp.name}
                        </td>
                        {camp.values.map((val, i) => {
                          const ratio = isCost ? getGlobalRatio(val, globalMin, globalMax) : null
                          const isHovered = hoveredCol === i
                          const hasBg = isCost && ratio !== null
                          const bg = hasBg ? interpolateColor(ratio) : (isHovered ? '#1E3A5F' : '#0F172A')
                          const textColor = hasBg ? '#0F172A' : (val !== null ? '#CBD5E1' : '#334155')
                          return (
                            <td
                              key={dates[i]}
                              title={val !== null ? `${camp.name}\n${dates[i]}: ${formatCellValue(key, val)}` : ''}
                              className="px-2 py-1.5 text-center font-semibold border"
                              style={{
                                backgroundColor: bg,
                                borderColor: isHovered ? accentColor + '80' : BORDER,
                                color: textColor,
                                minWidth: 78, width: 78,
                                transition: 'border-color 0.1s, background-color 0.1s',
                              }}
                              onMouseEnter={() => setHoveredCol(i)}
                              onMouseLeave={() => setHoveredCol(null)}
                            >
                              {formatCellValue(key, val)}
                            </td>
                          )
                        })}
                        {/* Row average */}
                        <td
                          className="px-2 py-1.5 text-center font-semibold border"
                          style={{
                            backgroundColor: '#0F172A',
                            borderColor: BORDER,
                            borderLeft: `2px solid ${accentColor}40`,
                            color: rowAvg !== null ? '#F1F5F9' : '#334155',
                            minWidth: 72, width: 72,
                          }}
                        >
                          {formatCellValue(key, rowAvg)}
                        </td>
                      </tr>
                    )
                  })}

                  {/* Average row — only for cost metrics with 2+ campaigns */}
                  {isCost && filtered.length > 1 && (
                    <tr>
                      <td
                        className="px-3 py-1.5 font-bold border sticky left-0 z-10 italic"
                        style={{
                          backgroundColor: '#1E293B',
                          borderColor: BORDER,
                          color: accentColor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⌀ Promedio
                      </td>
                      {colAvgs.map((avg, i) => {
                        const ratio = getGlobalRatio(avg, globalMin, globalMax)
                        const isHovered = hoveredCol === i
                        const bg = ratio !== null ? interpolateColor(ratio) : (isHovered ? '#1E3A5F' : '#0F172A')
                        return (
                          <td
                            key={i}
                            className="px-2 py-1.5 text-center font-bold border"
                            style={{
                              backgroundColor: bg,
                              borderColor: isHovered ? accentColor + '80' : BORDER,
                              color: ratio !== null ? '#0F172A' : '#94A3B8',
                              minWidth: 78, opacity: 0.9,
                              transition: 'border-color 0.1s',
                            }}
                            onMouseEnter={() => setHoveredCol(i)}
                            onMouseLeave={() => setHoveredCol(null)}
                          >
                            {formatCellValue(key, avg)}
                          </td>
                        )
                      })}
                      {/* Overall average of averages */}
                      <td
                        className="px-2 py-1.5 text-center font-bold border"
                        style={{
                          backgroundColor: '#0F172A',
                          borderColor: BORDER,
                          borderLeft: `2px solid ${accentColor}40`,
                          color: accentColor,
                          minWidth: 72,
                        }}
                      >
                        {formatCellValue(key, avgValues(colAvgs))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[#475569] text-xs">
        Colores P10–P90 · Verde = menor costo · Rojo = mayor costo · Prom. = promedio del período
      </p>
    </div>
  )
}
