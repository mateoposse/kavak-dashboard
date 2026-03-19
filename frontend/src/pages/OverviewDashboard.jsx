import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import PivotTable from '../components/PivotTable.jsx'
import { fetchOverview, fetchWeekly } from '../utils/api.js'
import { formatCurrency } from '../utils/formatters.js'

const CHANNEL_ABBREV = {
  'Facebook Ads': 'META',
  'Google Ads':   'GADS',
  'Tiktok Ads':   'TIK',
  'Taboola Ads':  'TAB',
  'Other Paid':   'OTH',
}

const CHANNEL_BADGE_COLORS = {
  'Facebook Ads': '#1877F2',
  'Google Ads':   '#EAB308',
  'Taboola Ads':  '#00C8FF',
  'Tiktok Ads':   '#000000',
  'Other Paid':   '#9CA3AF',
}

function getCampaignBadgeColor(channel, label) {
  if (label && /pmax|performance.?max/i.test(label)) return '#EF4444'
  return CHANNEL_BADGE_COLORS[channel] || '#9CA3AF'
}

// ── helpers ────────────────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span><strong>Error:</strong> {message}</span>
    </div>
  )
}

function SectionSpend({ section }) {
  const totalSpend = (section.rows?.spend || []).reduce((s, v) => s + (v || 0), 0)
  return (
    <span className="text-[#94A3B8] text-xs ml-2">
      {totalSpend > 0 ? formatCurrency(totalSpend) : ''}
    </span>
  )
}

function CollapsibleSection({
  section, dates, campaignType, firstColWidth, showPctMeta, loading,
  defaultOpen = true, weekMode = false, rrValues = null, vsLabel = ['vs', 'yday'],
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#253347]/60 transition-colors text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: section.color || '#9CA3AF' }}
        />
        <span className="text-white font-semibold text-sm">{section.label}</span>
        {!loading && <SectionSpend section={section} />}
        <span className="ml-auto text-[#475569] text-xs">
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#334155]">
          <PivotTable
            dates={dates}
            section={section}
            campaignType={campaignType}
            firstColWidth={firstColWidth}
            showPctMeta={showPctMeta}
            loading={loading}
            weekMode={weekMode}
            rrValues={rrValues}
            vsLabel={vsLabel}
          />
        </div>
      )}
    </div>
  )
}

// ── Skeleton section card ──────────────────────────────────────────────────────

function SkeletonCard({ wide = false }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#334155]" />
        <div className={`h-4 bg-[#334155] rounded skeleton ${wide ? 'w-64' : 'w-28'}`} />
      </div>
      <div className="border-t border-[#334155]">
        <PivotTable dates={[]} section={null} campaignType="Purchase" loading={true} />
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export default function OverviewDashboard() {
  const [mainTab, setMainTab] = useState('general')
  const [campaignType, setCampaignType] = useState('Purchase')

  // general data (eagerly loaded)
  const [genData, setGenData] = useState(null)
  const [genLoading, setGenLoading] = useState(true)
  const [genError, setGenError] = useState('')
  const genRef = useRef(0)

  // channel data (lazy)
  const [chData, setChData] = useState(null)
  const [chLoading, setChLoading] = useState(false)
  const [chError, setChError] = useState('')
  const [chLoaded, setChLoaded] = useState(false)
  const chRef = useRef(0)

  // campaign data (lazy)
  const [campData, setCampData] = useState(null)
  const [campLoading, setCampLoading] = useState(false)
  const [campError, setCampError] = useState('')
  const [campLoaded, setCampLoaded] = useState(false)
  const campRef = useRef(0)

  // weekly data (lazy)
  const [weekData, setWeekData] = useState(null)
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekError, setWeekError] = useState('')
  const [weekLoaded, setWeekLoaded] = useState(false)
  const weekRef = useRef(0)

  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadGeneral = useCallback(async (ct) => {
    const id = ++genRef.current
    setGenLoading(true)
    setGenError('')
    try {
      const res = await fetchOverview({ campaign_type: ct, days: 10, group_by: 'general' })
      if (id !== genRef.current) return
      setGenData(res)
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      if (id !== genRef.current) return
      setGenError(err.message || 'Failed to load data')
    } finally {
      if (id === genRef.current) setGenLoading(false)
    }
  }, [])

  const loadChannel = useCallback(async (ct) => {
    const id = ++chRef.current
    setChLoading(true)
    setChError('')
    try {
      const res = await fetchOverview({ campaign_type: ct, days: 10, group_by: 'channel' })
      if (id !== chRef.current) return
      setChData(res)
      setChLoaded(true)
    } catch (err) {
      if (id !== chRef.current) return
      setChError(err.message || 'Failed to load data')
    } finally {
      if (id === chRef.current) setChLoading(false)
    }
  }, [])

  const loadCampaign = useCallback(async (ct) => {
    const id = ++campRef.current
    setCampLoading(true)
    setCampError('')
    try {
      const res = await fetchOverview({ campaign_type: ct, days: 10, group_by: 'campaign' })
      if (id !== campRef.current) return
      setCampData(res)
      setCampLoaded(true)
    } catch (err) {
      if (id !== campRef.current) return
      setCampError(err.message || 'Failed to load data')
    } finally {
      if (id === campRef.current) setCampLoading(false)
    }
  }, [])

  const loadWeekly = useCallback(async (ct) => {
    const id = ++weekRef.current
    setWeekLoading(true)
    setWeekError('')
    try {
      const res = await fetchWeekly({ campaign_type: ct })
      if (id !== weekRef.current) return
      setWeekData(res)
      setWeekLoaded(true)
    } catch (err) {
      if (id !== weekRef.current) return
      setWeekError(err.message || 'Failed to load data')
    } finally {
      if (id === weekRef.current) setWeekLoading(false)
    }
  }, [])

  // On mount and campaignType change: reset all, reload active tab + general
  useEffect(() => {
    setGenData(null)
    setChData(null)
    setCampData(null)
    setWeekData(null)
    setChLoaded(false)
    setCampLoaded(false)
    setWeekLoaded(false)
    setSearch('')

    loadGeneral(campaignType)
    if (mainTab === 'channel') loadChannel(campaignType)
    if (mainTab === 'campaign') loadCampaign(campaignType)
    if (mainTab === 'weekly') loadWeekly(campaignType)
  }, [campaignType])

  function handleTabChange(tab) {
    setMainTab(tab)
    setSearch('')
    if (tab === 'channel' && !chLoaded) loadChannel(campaignType)
    if (tab === 'campaign' && !campLoaded) loadCampaign(campaignType)
    if (tab === 'weekly' && !weekLoaded) loadWeekly(campaignType)
  }

  function handleRefresh() {
    setGenData(null)
    setChData(null)
    setCampData(null)
    setWeekData(null)
    setChLoaded(false)
    setCampLoaded(false)
    setWeekLoaded(false)

    loadGeneral(campaignType)
    if (mainTab === 'channel') loadChannel(campaignType)
    if (mainTab === 'campaign') loadCampaign(campaignType)
    if (mainTab === 'weekly') loadWeekly(campaignType)
  }

  const ACCENT = campaignType === 'Purchase' ? '#3B82F6' : '#10B981'
  const isAnyLoading = genLoading || chLoading || campLoading || weekLoading

  // Filter campaign sections by search
  const campSections = (campData?.sections || []).filter(s =>
    !search.trim() || s.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-[1800px]">

          {/* ── Header ────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ACCENT }} />
              <div>
                <h1 className="text-white text-xl font-bold leading-none">Overview</h1>
                <p className="text-[#94A3B8] text-xs mt-1">
                  Last 10 days with data
                  {lastUpdated ? ` · Updated ${lastUpdated}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Campaign type toggle */}
              <div className="flex bg-[#0F172A] border border-[#334155] rounded-xl p-1 gap-1">
                {['Purchase', 'Sale'].map(ct => (
                  <button
                    key={ct}
                    onClick={() => setCampaignType(ct)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={
                      campaignType === ct
                        ? { backgroundColor: ACCENT + '22', color: ACCENT, border: `1px solid ${ACCENT}55` }
                        : { color: '#94A3B8' }
                    }
                  >
                    {ct}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isAnyLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-[#94A3B8] hover:text-white hover:border-[#475569] text-sm font-medium transition-all disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 ${isAnyLoading ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* ── Main tabs ─────────────────────────────────────── */}
          <div className="flex gap-1 bg-[#1E293B] border border-[#334155] rounded-xl p-1 w-fit">
            {[
              { id: 'general',  label: 'General' },
              { id: 'channel',  label: 'By Channel' },
              { id: 'campaign', label: 'By Campaign' },
              { id: 'weekly',   label: 'Weekly' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mainTab === tab.id
                    ? 'bg-[#334155] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── GENERAL ───────────────────────────────────────── */}
          {mainTab === 'general' && (
            <div className="space-y-4">
              <ErrorBanner message={genError} />
              {genLoading ? (
                <SkeletonCard />
              ) : (genData?.sections || []).map(section => (
                <CollapsibleSection
                  key={section.label}
                  section={section}
                  dates={genData?.dates || []}
                  campaignType={campaignType}
                  firstColWidth={200}
                  showPctMeta={true}
                  loading={false}
                  defaultOpen={true}
                />
              ))}
            </div>
          )}

          {/* ── BY CHANNEL ────────────────────────────────────── */}
          {mainTab === 'channel' && (
            <div className="space-y-4">
              <ErrorBanner message={chError} />
              {chLoading ? (
                Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (chData?.sections || []).map((section, i) => (
                <CollapsibleSection
                  key={section.label}
                  section={section}
                  dates={chData?.dates || []}
                  campaignType={campaignType}
                  firstColWidth={200}
                  showPctMeta={true}
                  loading={false}
                  defaultOpen={i < 2}
                />
              ))}
            </div>
          )}

          {/* ── BY CAMPAIGN ───────────────────────────────────── */}
          {mainTab === 'campaign' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter campaigns…"
                    className="bg-[#1E293B] border border-[#334155] rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#475569] placeholder-[#475569] w-72"
                  />
                </div>
                {campData && (
                  <span className="text-[#94A3B8] text-xs">
                    {campSections.length} / {campData.sections.length} campaigns
                  </span>
                )}
                {campData && (
                  <span className="text-[#475569] text-xs ml-auto">
                    Click section header to expand
                  </span>
                )}
              </div>

              <ErrorBanner message={campError} />

              {campLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#334155]" />
                      <div className="h-4 bg-[#334155] rounded w-64 skeleton" />
                    </div>
                  </div>
                ))
              ) : campSections.length === 0 ? (
                <div className="text-center py-16 text-[#475569] text-sm">
                  {search ? 'No campaigns match your search.' : 'No campaign data available.'}
                </div>
              ) : (
                campSections.map(section => (
                  <CampaignSection
                    key={section.label}
                    section={section}
                    dates={campData?.dates || []}
                    campaignType={campaignType}
                  />
                ))
              )}
            </div>
          )}

          {/* ── WEEKLY ────────────────────────────────────────── */}
          {mainTab === 'weekly' && (
            <div className="space-y-4">
              <ErrorBanner message={weekError} />
              {weekLoading ? (
                Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
              ) : weekData?.sections?.length === 0 ? (
                <div className="text-center py-16 text-[#475569] text-sm">No weekly data available.</div>
              ) : (weekData?.sections || []).map((section, i) => (
                <CollapsibleSection
                  key={section.label}
                  section={section}
                  dates={weekData?.weeks || []}
                  campaignType={campaignType}
                  firstColWidth={200}
                  showPctMeta={true}
                  loading={false}
                  defaultOpen={i < 2}
                  weekMode={true}
                  rrValues={section.rr && Object.keys(section.rr).length > 0 ? section.rr : null}
                  vsLabel={['vs', 'last wk']}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ── Campaign section (collapsed by default) ─────────────────────────────────

function CampaignSection({ section, dates, campaignType }) {
  const [open, setOpen] = useState(false)

  const totalSpend = (section.rows?.spend || []).reduce((s, v) => s + (v || 0), 0)

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#253347]/60 transition-colors text-left"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: section.color || '#9CA3AF' }}
        />
        {/* Channel abbreviation badge */}
        {(() => {
          const badgeColor = getCampaignBadgeColor(section.channel, section.label)
          return (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
              style={{
                backgroundColor: badgeColor + '22',
                color: badgeColor,
                border: `1px solid ${badgeColor}55`,
                letterSpacing: '0.05em',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: badgeColor }} />
              {CHANNEL_ABBREV[section.channel] || section.channel}
            </span>
          )
        })()}
        {/* Campaign name */}
        <span
          className="text-white font-medium"
          style={{ fontSize: 12, lineHeight: 1.4, whiteSpace: 'nowrap' }}
          title={section.label}
        >
          {section.label}
        </span>
        {/* Spend */}
        {totalSpend > 0 && (
          <span className="text-[#94A3B8] text-xs flex-shrink-0 ml-2">
            {formatCurrency(totalSpend)}
          </span>
        )}
        <span className="text-[#475569] text-xs flex-shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#334155]">
          <PivotTable
            dates={dates}
            section={section}
            campaignType={campaignType}
            firstColWidth={340}
            showPctMeta={false}
            showTotals={true}
          />
        </div>
      )}
    </div>
  )
}
