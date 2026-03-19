import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, isAuthenticated } from '../utils/api.js'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/sales', { replace: true })
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/sales', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">kavak</span>
          </div>
          <p className="text-[#94A3B8] text-sm mt-2">Marketing Analytics Dashboard</p>
          <p className="text-[#94A3B8] text-xs mt-1">Brazil</p>
        </div>

        {/* Card */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-white text-xl font-semibold mb-6">Sign in</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#94A3B8] text-sm font-medium mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#475569]"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-[#94A3B8] text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#475569]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 mt-2 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#475569] text-xs mt-6">
          © {new Date().getFullYear()} Kavak Brazil. All rights reserved.
        </p>
      </div>
    </div>
  )
}
