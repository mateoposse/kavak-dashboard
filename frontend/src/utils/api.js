// Static version — all data is pre-loaded in window.__STATIC_DATA__
// No API calls are made; data was fetched from Redshift at build time.

const SD = () => window.__STATIC_DATA__ || {}

// Stub — not used in static version
export function logout() {}
export function isAuthenticated() { return true }
export async function login() { return {} }
export async function request() { return null }

// ── Dashboard (Sales / Purchase) ─────────────────────────────────────────────
export async function fetchDashboard({ campaign_type }) {
  return SD()['dashboard_' + campaign_type] || null
}

// ── Overview ─────────────────────────────────────────────────────────────────
export async function fetchOverview({ campaign_type, group_by }) {
  return SD()[`overview_${campaign_type}_${group_by}`] || null
}

// ── Weekly ───────────────────────────────────────────────────────────────────
export async function fetchWeekly({ campaign_type }) {
  return SD()['weekly_' + campaign_type] || null
}

// ── Charts (FunnelChart) ─────────────────────────────────────────────────────
export async function fetchCharts({ campaign_type }) {
  return SD()['charts_' + campaign_type] || null
}

// ── Waterfall ────────────────────────────────────────────────────────────────
export async function fetchWaterfall({ campaign_type }) {
  return SD()['waterfall_' + campaign_type] || null
}

// ── Inventory ────────────────────────────────────────────────────────────────
export async function fetchInventory() {
  return SD()['inventory'] || null
}

export async function fetchInventoryWeekly() {
  return SD()['inventory_weekly'] || null
}

// ── Rotation ─────────────────────────────────────────────────────────────────
export async function fetchRotation() {
  return SD()['rotation'] || null
}

// ── Misc (kept for import compatibility) ─────────────────────────────────────
export async function fetchCreditoCampaigns() { return SD()['credito_campaigns'] || null }
export async function fetchAlerts() { return null }

// ── Generic apiGet — maps known paths to static data ─────────────────────────
export async function apiGet(path, params = {}) {
  const sd = SD()
  if (path === '/data/cost-heatmap') {
    const type = params.campaign_type || 'Sale'
    return sd[`cost_heatmap_${type}`] || null
  }
  if (path === '/ga4-credito/funnel-daily') {
    return sd['ga4_credito_funnel'] || null
  }
  return null
}
