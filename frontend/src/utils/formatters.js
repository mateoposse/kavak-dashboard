/**
 * Format a value as USD currency (0 decimals for large values).
 * e.g. 1234567 → "$1,234,567"
 */
export function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

/**
 * Format a cost metric as USD with 2 decimals.
 * e.g. 123.45 → "$123.45"
 */
export function formatCost(val) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/**
 * Format a percentage with 1 decimal.
 * e.g. 12.3456 → "12.3%"
 */
export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return val.toFixed(1) + '%'
}

/**
 * Format a large integer with thousand separators.
 * e.g. 1234567 → "1,234,567"
 */
export function formatNum(val) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

/**
 * Format a WoW delta percentage.
 * Returns { text: "+12.3%", positive: true }
 */
export function formatDelta(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return { text: '—', positive: null }
  const positive = pct >= 0
  return {
    text: (positive ? '+' : '−') + Math.abs(pct).toFixed(1) + '%',
    positive,
  }
}

/**
 * Map a metric key to a human-readable label.
 */
export function metricLabel(key) {
  const labels = {
    spend: 'Spend (USD)',
    impr: 'Impressions',
    clicks: 'Clicks',
    ctr: 'CTR',
    cpm: 'CPM',
    cpc: 'CPC',
    regs: 'Registers',
    cpr: 'CPR',
    inps: 'Inspections',
    cpi: 'CPI',
    inps_made: 'Insp. Made',
    cpim: 'CPIM',
    leads: 'Leads',
    cpl: 'CPL',
    qual_leads: 'Qual. Leads',
    cpql: 'CPQL',
    bookings: 'Bookings',
    cpb: 'CPB',
    buyers: 'Buyers',
    cpbu: 'CPBu',
    purchases: 'Purchases',
    cpp: 'CPP',
    new_acc: 'New Accounts',
    cots: 'COTs',
    vips: 'VIPs',
    total_users: 'Total Users',
    cpu: 'CPU',
  }
  return labels[key] || key
}

/**
 * Format any metric value based on metric type.
 */
export function formatMetric(key, val) {
  if (val === null || val === undefined) return '—'
  const costMetrics = ['cpr', 'cpi', 'cpim', 'cpl', 'cpql', 'cpb', 'cpbu', 'cpp', 'cpc', 'cpm', 'cpu']
  const pctMetrics = ['ctr']
  const currencyMetrics = ['spend']
  if (currencyMetrics.includes(key)) return formatCurrency(val)
  if (costMetrics.includes(key)) return formatCost(val)
  if (pctMetrics.includes(key)) return formatPct(val)
  return formatNum(val)
}

/**
 * Format a value for pivot table cells (USD).
 * fmt: 'cost' | 'pct' | 'int'
 * Zero and null/undefined → '—'
 * cost: $X,XXX (no decimals ≥100), $X.X (1 decimal $1–$99), $X.XX (2 decimals <$1)
 * pct:  XX.X%
 * int:  1,234,567
 */
export function formatPivotValue(fmt, val) {
  if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return null
  if (val === 0) return null

  if (fmt === 'cost') {
    const abs = Math.abs(val)
    if (abs >= 100) {
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val))
    } else if (abs >= 1) {
      return '$' + val.toFixed(1)
    } else {
      return '$' + val.toFixed(2)
    }
  }

  if (fmt === 'pct') {
    return val.toFixed(1) + '%'
  }

  if (fmt === 'int') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val))
  }

  return String(val)
}

/**
 * Format the "vs yday" delta column.
 * Returns { text: "+12.3%", color: "#10B981" | "#EF4444" | "#94A3B8" }
 */
export function formatVsYday(pct, metricKey) {
  if (pct === null || pct === undefined || isNaN(pct)) return { text: '—', color: '#475569' }

  const HIGHER_IS_BETTER = new Set([
    'spend', 'impr', 'clicks', 'traffic', 'regs', 'inps_made',
    'new_acc', 'vips', 'leads', 'qual_leads',
  ])
  const LOWER_IS_BETTER = new Set([
    'cpm', 'cpu', 'cpr', 'cpi', 'cpna', 'cpv', 'cpl', 'cpql', 'cpb', 'cpbu',
  ])

  const sign = pct >= 0 ? '+' : ''
  const text = sign + pct.toFixed(1) + '%'

  let color = '#94A3B8' // neutral default
  if (HIGHER_IS_BETTER.has(metricKey)) {
    color = pct > 0 ? '#10B981' : (pct < 0 ? '#EF4444' : '#94A3B8')
  } else if (LOWER_IS_BETTER.has(metricKey)) {
    color = pct > 0 ? '#EF4444' : (pct < 0 ? '#10B981' : '#94A3B8')
  }

  return { text, color }
}
