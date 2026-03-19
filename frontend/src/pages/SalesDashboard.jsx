import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import DateRangePicker, { getDefaultRange } from '../components/DateRangePicker.jsx'
import KPICard from '../components/KPICard.jsx'
import TrendChart from '../components/TrendChart.jsx'
import WoWTable from '../components/WoWTable.jsx'
import ChannelTable from '../components/ChannelTable.jsx'
import CampaignTable from '../components/CampaignTable.jsx'
import CostHeatmapTable from '../components/CostHeatmapTable.jsx'
import WaterfallChart from '../components/WaterfallChart.jsx'
import FunnelChart from '../components/FunnelChart.jsx'
import BudgetPacingCard from '../components/BudgetPacingCard.jsx'
import { fetchDashboard } from '../utils/api.js'

const ACCENT = '#10B981'
const CAMPAIGN_TYPE = 'Sale'

const KPI_KEYS = [
  { key: 'spend', label: 'Spend' },
  { key: 'impr', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'ctr', label: 'CTR' },
  { key: 'cpm', label: 'CPM' },
  { key: 'regs', label: 'Registers' },
  { key: 'cpr', label: 'CPR' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL' },
  { key: 'qual_leads', label: 'Qual. Leads' },
  { key: 'cpql', label: 'CPQL' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'cpb', label: 'CPB' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'cpbu', label: 'CPBu' },
  { key: 'new_acc', label: 'New Accounts' },
]

export default function SalesDashboard() {
  const defaultRange = getDefaultRange()
  const [dateFrom, setDateFrom] = useState(defaultRange.date_from)
  const [dateTo, setDateTo] = useState(defaultRange.date_to)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [showAllKpis, setShowAllKpis] = useState(false)

  const fetchRef = useRef(0)

  const load = useCallback(async (from, to, force = false) => {
    const id = ++fetchRef.current
    setLoading(true)
    setError('')
    try {
      const result = await fetchDashboard({ date_from: from, date_to: to, campaign_type: CAMPAIGN_TYPE })
      if (id !== fetchRef.current) return
      setData(result)
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      if (id !== fetchRef.current) return
      setError(err.message || 'Failed to load data')
    } finally {
      if (id === fetchRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(dateFrom, dateTo)
  }, [])

  function handleDateChange({ date_from, date_to }) {
    setDateFrom(date_from)
    setDateTo(date_to)
    load(date_from, date_to)
  }

  function handleRefresh() {
    load(dateFrom, dateTo, true)
  }

  const visibleKpis = showAllKpis ? KPI_KEYS : KPI_KEYS.slice(0, 8)

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px]">

          {/* Header */}
          <Navbar
            title="Sales Dashboard"
            accentColor={ACCENT}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            loading={loading}
          />

          {/* Date picker */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-5 py-4">
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={handleDateChange}
              accentColor={ACCENT}
            />
          </div>


          {/* Error banner */}
          {error && (
            <div className="px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span><strong>Error:</strong> {error}</span>
            </div>
          )}

          {/* KPI Cards */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
              {visibleKpis.map(({ key, label }) => (
                <KPICard
                  key={key}
                  metricKey={key}
                  label={label}
                  value={data?.kpis?.[key]}
                  wowDelta={data?.wow?.delta_pct?.[key]}
                  loading={loading}
                  accentColor={ACCENT}
                />
              ))}
            </div>
            {KPI_KEYS.length > 8 && (
              <button
                onClick={() => setShowAllKpis(v => !v)}
                className="mt-3 text-[#94A3B8] hover:text-white text-xs font-medium transition-colors"
              >
                {showAllKpis ? '▲ Show less' : `▼ Show all ${KPI_KEYS.length} KPIs`}
              </button>
            )}
          </div>

          {/* Conversion Funnel */}
          <FunnelChart
            campaignType={CAMPAIGN_TYPE}
            accentColor={ACCENT}
          />

          {/* Trend Chart */}
          <TrendChart data={data?.daily} loading={loading} accentColor={ACCENT} />

          {/* WoW + Budget Pacing */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WoWTable wow={data?.wow} loading={loading} dashboardType={CAMPAIGN_TYPE} />
            <BudgetPacingCard
              campaignType={CAMPAIGN_TYPE}
              accentColor={ACCENT}
            />
          </div>

          {/* Channel Table */}
          <ChannelTable
            byChannel={data?.by_channel}
            byNetwork={data?.by_network}
            loading={loading}
            dashboardType={CAMPAIGN_TYPE}
            onChannelClick={setSelectedChannel}
            selectedChannel={selectedChannel}
          />

          {/* Campaign Table */}
          <CampaignTable
            campaigns={data?.by_campaign}
            loading={loading}
            dashboardType={CAMPAIGN_TYPE}
            filterChannel={selectedChannel}
          />

          {/* CPL Heatmap */}
          <CostHeatmapTable
            dateFrom={dateFrom}
            dateTo={dateTo}
            campaignType={CAMPAIGN_TYPE}
            accentColor={ACCENT}
          />

          {/* WoW Waterfall */}
          <WaterfallChart campaignType={CAMPAIGN_TYPE} accentColor={ACCENT} />
        </div>
      </main>
    </div>
  )
}
