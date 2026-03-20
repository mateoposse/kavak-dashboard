import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import OverviewDashboard from './pages/OverviewDashboard.jsx'
import ChartsPage from './pages/ChartsPage.jsx'
import SalesDashboard from './pages/SalesDashboard.jsx'
import PurchaseDashboard from './pages/PurchaseDashboard.jsx'
import RotationPage from './pages/RotationPage.jsx'
import KavakCreditoPage from './pages/KavakCreditoPage.jsx'

// Static version — no auth required
function PrivateRoute({ children }) {
  return children
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overview" element={<PrivateRoute><OverviewDashboard /></PrivateRoute>} />
        <Route path="/charts"   element={<PrivateRoute><ChartsPage /></PrivateRoute>} />
        <Route path="/sales"    element={<PrivateRoute><SalesDashboard /></PrivateRoute>} />
        <Route path="/purchase" element={<PrivateRoute><PurchaseDashboard /></PrivateRoute>} />
        <Route path="/rotation" element={<PrivateRoute><RotationPage /></PrivateRoute>} />
        <Route path="/credito"  element={<PrivateRoute><KavakCreditoPage /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </HashRouter>
  )
}
