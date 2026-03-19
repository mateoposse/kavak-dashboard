import React from 'react'

export default function Navbar({ title, accentColor, lastUpdated, onRefresh, loading }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
        <div>
          <h1 className="text-white text-xl font-bold leading-none">{title}</h1>
          <p className="text-[#94A3B8] text-xs mt-1">
            {lastUpdated
              ? `Last updated: ${lastUpdated}`
              : 'Not yet loaded'}
          </p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-[#94A3B8] hover:text-white hover:border-[#475569] text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  )
}
