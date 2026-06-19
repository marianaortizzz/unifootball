import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TournamentsPage from './pages/TournamentsPage'
import PrivateRoute from './components/PrivateRoute'
import TournamentDetailPage from './pages/TournamentDetailPage'
import PlayerStatsPage from './pages/PlayerStatsPage'
import MatchLivePage from './pages/MatchLivePage'
import TeamsPage from './pages/TeamsPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="/players/:userId" element={<PlayerStatsPage />} />
            <Route path="/matches/:matchId/live" element={<MatchLivePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
