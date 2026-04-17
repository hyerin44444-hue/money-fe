import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import siIcon from './si.png'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import BudgetPage from './pages/BudgetPage'
import SavingsPage from './pages/SavingsPage'
import FixedExpensePage from './pages/FixedExpensePage'
import EventsPage from './pages/EventsPage'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '▦', end: true },
  { to: '/history', label: '내역', icon: '☰', end: false },
  { to: '/savings', label: '적금', icon: '💰', end: false },
  { to: '/budget', label: '예산', icon: '◎', end: false },
  { to: '/fixed', label: '고정비', icon: '📌', end: false },
  { to: '/events', label: '경조사', icon: '💌', end: false },
  { to: '/settings', label: '설정', icon: '⚙', end: false },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-layout">
      {/* 모바일 오버레이 */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <img src={siIcon} alt="logo" style={{ width: 35, height: 35, borderRadius: 6, objectFit: 'cover' }} />
          <span className="logo-text">가계부</span>
          <button className="sidebar-close-btn" onClick={closeSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">메뉴</p>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">
            <Routes>
              <Route path="/" element={<><span className="page-title">대시보드</span><span className="page-sub">이번 달 수입·지출을 한눈에 확인하세요.</span></>} />
              <Route path="/history" element={<><span className="page-title">내역</span><span className="page-sub">전체 거래 내역을 조회하고 관리하세요.</span></>} />
              <Route path="/savings" element={<><span className="page-title">적금</span><span className="page-sub">적금 현황을 관리하세요.</span></>} />
              <Route path="/budget" element={<><span className="page-title">예산</span><span className="page-sub">카테고리별 월 예산을 설정하세요.</span></>} />
              <Route path="/fixed" element={<><span className="page-title">고정비</span><span className="page-sub">매달 나가는 고정 지출을 관리하세요.</span></>} />
              <Route path="/events" element={<><span className="page-title">경조사</span><span className="page-sub">결혼식·장례식 등 주고 받은 기록을 관리하세요.</span></>} />
              <Route path="/settings" element={<><span className="page-title">설정</span><span className="page-sub">카테고리를 추가하고 관리하세요.</span></>} />
            </Routes>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/fixed" element={<FixedExpensePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
