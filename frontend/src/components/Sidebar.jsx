import React from 'react'
import { NavLink } from 'react-router-dom'

function KavakLogo() {
  return (
    <div className="flex items-center gap-3 px-4 py-5 border-b border-[#334155]">
      <div className="w-9 h-9 rounded-xl bg-[#10B981] flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-base">K</span>
      </div>
      <div>
        <div className="text-white font-bold text-base leading-none">kavak</div>
        <div className="text-[#94A3B8] text-[10px] mt-0.5 leading-none">Brazil Analytics</div>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, color }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl mx-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-[#334155]/70 text-white'
            : 'text-[#94A3B8] hover:bg-[#334155]/40 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isActive ? color : '#475569' }}
          />
          {icon}
          <span>{label}</span>
          {isActive && (
            <span
              className="ml-auto w-1.5 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#1E293B] border-r border-[#334155] flex flex-col h-screen sticky top-0">
      <KavakLogo />

      <nav className="flex-1 py-4 space-y-1">
        <div className="px-4 pb-1 pt-2">
          <p className="text-[#475569] text-[10px] font-semibold uppercase tracking-wider">Dashboards</p>
        </div>

        <NavItem
          to="/charts"
          color="#8B5CF6"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          label="Charts"
        />

        <NavItem
          to="/overview"
          color="#F59E0B"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          label="Overview"
        />

        <NavItem
          to="/sales"
          color="#10B981"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          label="Sales"
        />

        <NavItem
          to="/purchase"
          color="#3B82F6"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          label="Purchase"
        />

        <NavItem
          to="/rotation"
          color="#22D3EE"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          label="Inventario"
        />

        <NavItem
          to="/credito"
          color="#6366F1"
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          label="Crédito"
        />
      </nav>

      <div className="border-t border-[#334155] p-3">
        <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[#475569] text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span id="static-updated-ts">Loading…</span>
        </div>
      </div>
    </aside>
  )
}
