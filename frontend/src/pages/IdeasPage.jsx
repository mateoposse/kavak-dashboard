import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar.jsx'

// ── Config ────────────────────────────────────────────────────────────────────

const ACCENT = '#A78BFA'

const STATUS_CONFIG = {
  Done:      { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',    border: 'rgba(34,197,94,0.35)' },
  WIP:       { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.35)' },
  TBD:       { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)',  border: 'rgba(148,163,184,0.3)' },
  Blocked:   { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.35)' },
  Cancelled: { color: '#F97316', bg: 'rgba(249,115,22,0.15)',   border: 'rgba(249,115,22,0.35)' },
}

const VERTICAL_CONFIG = {
  Sales:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)' },
  Supply: { color: '#FB923C', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.3)' },
}

const CHANNEL_CONFIG = {
  PMax:   { color: '#EA4335', bg: 'rgba(234,67,53,0.12)',   border: 'rgba(234,67,53,0.3)' },
  Search: { color: '#4285F4', bg: 'rgba(66,133,244,0.12)', border: 'rgba(66,133,244,0.3)' },
  Meta:   { color: '#1877F2', bg: 'rgba(24,119,242,0.12)', border: 'rgba(24,119,242,0.3)' },
  TikTok: { color: '#FF3B5C', bg: 'rgba(255,59,92,0.12)',  border: 'rgba(255,59,92,0.3)' },
  Otro:   { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  Ambos:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

const VERTICALS = ['Sales', 'Supply']
const CHANNELS  = ['PMax', 'Search', 'Meta', 'TikTok', 'Otro', 'Ambos']
const STATUSES  = ['TBD', 'WIP', 'Done', 'Blocked', 'Cancelled']
const STORAGE_KEY = 'kavak_ideas_v1'

// ── Seed data (from screenshot) ───────────────────────────────────────────────

const SEED = [
  { id: 1, vertical: 'Sales',  channel: 'PMax',   name: 'Tabela Fipe',          description: 'Comparative price content', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 2, vertical: 'Sales',  channel: 'PMax',   name: 'Vips L15D',            description: 'Using a campaign optimizing to vips with vips L15D. Retargeting to people interested in our cars.', needed: '', status: 'WIP', date_start: '', date_end: '', ongoing: false },
  { id: 3, vertical: 'Sales',  channel: 'PMax',   name: 'Pmax - Newer cars',    description: "Use new configuration to incentivize newer cars. Use Google's new tool to give higher value to newer cars.", needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 4, vertical: 'Supply', channel: 'Search', name: 'Broad',                description: 'Only use event optimization. Let the algorithm decide who to show the ads.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 5, vertical: 'Supply', channel: 'Meta',   name: 'Offer_viewed',         description: 'Use the event to target people who know us. Remarketing with big audience.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 6, vertical: 'Supply', channel: 'PMax',   name: 'Value mileage+year',   description: 'See how we can use the repasse share of year with CPR of mileage. Combine both metrics for optimal results.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 7, vertical: 'Sales',  channel: 'PMax',   name: 'vs Last price',        description: 'Use cars that have better offers.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 8, vertical: 'Sales',  channel: 'TikTok', name: 'TikTok',               description: 'Create TikTok campaigns. Generate interest in our products.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
  { id: 9, vertical: 'Supply', channel: 'Ambos',  name: 'Campaigns to one sheets', description: 'Duplicate and connect campaigns to one sheets. Creative optimization will bring better results.', needed: '', status: 'TBD', date_start: '', date_end: '', ongoing: false },
]

function newIdea() {
  return {
    id: Date.now(),
    vertical: 'Sales',
    channel: 'PMax',
    name: '',
    description: '',
    needed: '',
    status: 'TBD',
    date_start: '',
    date_end: '',
    ongoing: false,
  }
}

// ── Badge select ──────────────────────────────────────────────────────────────

function BadgeSelect({ value, options, configMap, onChange }) {
  const cfg = configMap[value] || {}
  return (
    <div className="relative inline-flex w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none text-[11px] font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer border transition-colors"
        style={{
          backgroundColor: cfg.bg,
          color: cfg.color,
          borderColor: cfg.border,
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60"
        style={{ color: cfg.color }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function IdeaRow({ idea, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Main row */}
      <div className={`grid items-center border-b border-[#1E293B] transition-colors group
        ${open ? 'bg-[#334155]/20' : 'hover:bg-[#334155]/10'}`}
        style={{ gridTemplateColumns: '120px 100px 1fr 120px 160px 36px' }}
      >
        {/* Vertical */}
        <div className="px-3 py-2.5">
          <BadgeSelect
            value={idea.vertical}
            options={VERTICALS}
            configMap={VERTICAL_CONFIG}
            onChange={v => onUpdate('vertical', v)}
          />
        </div>

        {/* Canal */}
        <div className="px-2 py-2.5">
          <BadgeSelect
            value={idea.channel}
            options={CHANNELS}
            configMap={CHANNEL_CONFIG}
            onChange={v => onUpdate('channel', v)}
          />
        </div>

        {/* Test name */}
        <div className="px-3 py-2.5 flex items-center gap-2 min-w-0">
          <button
            onClick={() => setOpen(o => !o)}
            title={open ? 'Cerrar detalles' : 'Ver detalles'}
            className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors text-[#475569] hover:text-white hover:bg-[#334155]"
          >
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <input
            type="text"
            value={idea.name}
            onChange={e => onUpdate('name', e.target.value)}
            placeholder="Nombre del test..."
            className="bg-transparent text-white text-sm placeholder-[#334155] outline-none flex-1 min-w-0"
          />
        </div>

        {/* Estado */}
        <div className="px-2 py-2.5">
          <BadgeSelect
            value={idea.status}
            options={STATUSES}
            configMap={STATUS_CONFIG}
            onChange={v => onUpdate('status', v)}
          />
        </div>

        {/* Fechas */}
        <div className="px-2 py-2 flex flex-col gap-1">
          <input
            type="date"
            value={idea.date_start}
            onChange={e => onUpdate('date_start', e.target.value)}
            title="Inicio"
            className="bg-[#0F172A] border border-[#334155] text-[#94A3B8] text-[10px] rounded-md px-1.5 py-0.5 outline-none w-full focus:border-[#475569] transition-colors"
          />
          {idea.ongoing ? (
            <span className="text-[10px] font-semibold text-[#10B981] px-1">▶ Ongoing</span>
          ) : (
            <input
              type="date"
              value={idea.date_end}
              onChange={e => onUpdate('date_end', e.target.value)}
              title="Fin"
              className="bg-[#0F172A] border border-[#334155] text-[#94A3B8] text-[10px] rounded-md px-1.5 py-0.5 outline-none w-full focus:border-[#475569] transition-colors"
            />
          )}
          <label className="flex items-center gap-1.5 cursor-pointer select-none pl-0.5">
            <input
              type="checkbox"
              checked={idea.ongoing}
              onChange={e => onUpdate('ongoing', e.target.checked)}
              className="w-2.5 h-2.5 rounded accent-[#10B981]"
            />
            <span className="text-[9px] text-[#475569]">Ongoing</span>
          </label>
        </div>

        {/* Delete */}
        <div className="flex items-center justify-center">
          <button
            onClick={onRemove}
            title="Eliminar"
            className="w-6 h-6 rounded flex items-center justify-center text-[#334155] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded detail row */}
      {open && (
        <div className="border-b border-[#1E293B] bg-[#0F172A]/70 px-10 py-5 grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[#475569] text-[10px] font-semibold uppercase tracking-widest mb-2">
              Descripción e hipótesis
            </label>
            <textarea
              value={idea.description}
              onChange={e => onUpdate('description', e.target.value)}
              placeholder="Describí el test, la hipótesis y el contexto..."
              rows={4}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#334155] outline-none resize-none focus:border-[#475569] transition-colors leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-[#475569] text-[10px] font-semibold uppercase tracking-widest mb-2">
              Qué se necesita para llevarlo a cabo
            </label>
            <textarea
              value={idea.needed}
              onChange={e => onUpdate('needed', e.target.value)}
              placeholder="Recursos, aprobaciones, creatividades, accesos, datos..."
              rows={4}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#334155] outline-none resize-none focus:border-[#475569] transition-colors leading-relaxed"
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const [ideas, setIdeas] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : SEED
    } catch {
      return SEED
    }
  })

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas))
  }, [ideas])

  function updateIdea(id, field, value) {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function addIdea() {
    setIdeas(prev => [...prev, newIdea()])
  }

  function removeIdea(id) {
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  // Stats
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = ideas.filter(i => i.status === s).length
    return acc
  }, {})

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1700px] space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ACCENT }} />
              <div>
                <h1 className="text-white text-xl font-bold leading-none">Ideas & Iniciativas</h1>
                <p className="text-[#94A3B8] text-xs mt-1">
                  {ideas.length} ideas · guardado automático
                </p>
              </div>
            </div>

            <button
              onClick={addIdea}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ backgroundColor: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}44` }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva idea
            </button>
          </div>

          {/* Status summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s]
              const n = counts[s]
              return (
                <div
                  key={s}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
                >
                  <span>{s}</span>
                  <span className="opacity-60 font-medium">{n}</span>
                </div>
              )
            })}
            <div className="ml-auto text-[#475569] text-xs font-medium">
              Total: {ideas.length}
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">

            {/* Header */}
            <div
              className="grid border-b border-[#334155] bg-[#0F172A]/40"
              style={{ gridTemplateColumns: '120px 100px 1fr 120px 160px 36px' }}
            >
              {['Vertical', 'Canal', 'Test', 'Estado', 'Fechas', ''].map((h, i) => (
                <div key={i} className="px-3 py-3 text-[#475569] text-[10px] font-semibold uppercase tracking-widest">
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {ideas.length === 0 ? (
              <div className="py-16 text-center text-[#475569] text-sm">
                <svg className="w-8 h-8 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                No hay ideas todavía — agregá la primera.
              </div>
            ) : (
              ideas.map(idea => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  onUpdate={(field, value) => updateIdea(idea.id, field, value)}
                  onRemove={() => removeIdea(idea.id)}
                />
              ))
            )}

            {/* Add row at bottom */}
            <button
              onClick={addIdea}
              className="w-full py-3 text-[#334155] hover:text-[#94A3B8] hover:bg-[#334155]/10 transition-colors text-sm flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar idea
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
