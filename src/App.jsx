import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import LobbyShell from './components/lobby/LobbyShell.jsx'
import Lobby from './pages/Lobby.jsx'
import Practice from './pages/Practice.jsx'
import Results from './pages/Results.jsx'
import ResultDetail from './pages/ResultDetail.jsx'
import TestDay from './pages/TestDay.jsx'
import Exam from './pages/Exam.jsx'
import SignIn from './pages/SignIn.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/exam/:sessionId" element={<Exam />} />
        <Route path="/signin" element={<SignIn />} />
        <Route element={<LobbyShell />}>
          <Route path="/" element={<Lobby />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:sessionId" element={<ResultDetail />} />
          <Route path="/test-day" element={<TestDay />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
