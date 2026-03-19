import React, { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

const PRESETS = [
  { label: 'Last 7d', days: 7 },
  { label: 'Last 14d', days: 14 },
  { label: 'Last 30d', days: 30 },
  { label: 'Last 60d', days: 60 },
  { label: 'MTD', id: 'mtd' },
  { label: 'Last month', id: 'last_month' },
  { label: 'Custom', id: 'custom' },
]

function toYMD(d) {
  return format(d, 'yyyy-MM-dd')
}

function getPresetRange(preset) {
  const today = new Date()
  const yesterday = subDays(today, 1)

  if (preset.days) {
    return {
      date_from: toYMD(subDays(yesterday, preset.days - 1)),
      date_to: toYMD(yesterday),
    }
  }
  if (preset.id === 'mtd') {
    return {
      date_from: toYMD(startOfMonth(today)),
      date_to: toYMD(yesterday),
    }
  }
  if (preset.id === 'last_month') {
    const lastMonth = subMonths(today, 1)
    return {
      date_from: toYMD(startOfMonth(lastMonth)),
      date_to: toYMD(endOfMonth(lastMonth)),
    }
  }
  return null
}

export function getDefaultRange() {
  const yesterday = subDays(new Date(), 1)
  return {
    date_from: toYMD(subDays(yesterday, 29)),
    date_to: toYMD(yesterday),
  }
}

export default function DateRangePicker({ dateFrom, dateTo, onChange, accentColor }) {
  const [activePreset, setActivePreset] = useState('Last 30d')
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(dateFrom)
  const [customTo, setCustomTo] = useState(dateTo)

  function handlePreset(preset) {
    if (preset.id === 'custom') {
      setShowCustom(true)
      setActivePreset('Custom')
      return
    }
    setShowCustom(false)
    setActivePreset(preset.label)
    const range = getPresetRange(preset)
    if (range) onChange(range)
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ date_from: customFrom, date_to: customTo })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activePreset === preset.label
                ? 'text-white'
                : 'bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#475569]'
            }`}
            style={
              activePreset === preset.label
                ? { backgroundColor: accentColor + '22', borderColor: accentColor, color: accentColor, border: '1px solid' }
                : {}
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={e => setCustomFrom(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#475569]"
          />
          <span className="text-[#94A3B8] text-xs">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
            onChange={e => setCustomTo(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#475569]"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
            style={{ backgroundColor: accentColor }}
          >
            Apply
          </button>
        </div>
      )}

      <div className="text-[#475569] text-[11px]">
        {dateFrom} → {dateTo}
      </div>
    </div>
  )
}
