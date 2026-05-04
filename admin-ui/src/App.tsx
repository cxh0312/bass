import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from '@/pages/Login'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Users } from '@/pages/Users'
import { Projects } from '@/pages/Projects'
import { Collections } from '@/pages/Collections'
import { CollectionDetail } from '@/pages/CollectionDetail'
import { Webhooks } from '@/pages/Webhooks'
import { ApiKeys } from '@/pages/ApiKeys'
import { AuditLogs } from '@/pages/AuditLogs'
import { RateLimits } from '@/pages/RateLimits'
import { Leaderboards } from '@/pages/Leaderboards'
import { LeaderboardDetail } from '@/pages/LeaderboardDetail'
import { ProjectUsage } from '@/pages/ProjectUsage'
import { SlowQueries } from '@/pages/SlowQueries'
import { AlertRules } from '@/pages/AlertRules'
import { WebhookDeliveries } from '@/pages/WebhookDeliveries'
import { ProjectMembers } from '@/pages/ProjectMembers'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:collectionId" element={<CollectionDetail />} />
          <Route path="/projects/:projectId/collections" element={<Collections />} />
          <Route path="/projects/:projectId/webhooks" element={<Webhooks />} />
          <Route path="/projects/:projectId/api-keys" element={<ApiKeys />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/rate-limits" element={<RateLimits />} />
          <Route path="/projects/:projectId/leaderboards" element={<Leaderboards />} />
          <Route path="/projects/:projectId/leaderboards/:id" element={<LeaderboardDetail />} />
          <Route path="/projects/:projectId/usage" element={<ProjectUsage />} />
          <Route path="/slow-queries" element={<SlowQueries />} />
          <Route path="/alerts" element={<AlertRules />} />
          <Route path="/projects/:projectId/webhooks/:webhookId/deliveries" element={<WebhookDeliveries />} />
          <Route path="/projects/:projectId/members" element={<ProjectMembers />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App