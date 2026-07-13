import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Compass, 
  LayoutDashboard, 
  Map, 
  BrainCircuit, 
  Sliders, 
  AlertTriangle, 
  MessageSquare, 
  FileSpreadsheet,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import Predictor from './pages/Predictor';
import Simulator from './pages/Simulator';
import Alerts from './pages/Alerts';
import Chat from './pages/Chat';
import Reports from './pages/Reports';

function Navbar({ currentTheme, toggleTheme }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tracker', label: 'Live Tracker', icon: Map },
    { path: '/predictor', label: 'Risk Predictor', icon: BrainCircuit },
    { path: '/simulator', label: 'Scenario Simulator', icon: Sliders },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    { path: '/reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Compass style={{ color: 'var(--accent-blue)' }} />
        <span>RISK ENGINE</span>
      </Link>

      {/* Desktop Navigation Links */}
      <div className="navbar-nav desktop-nav">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`navbar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{link.label}</span>
              {isActive && <div className="nav-indicator" />}
            </Link>
          );
        })}
      </div>

      <div className="navbar-actions">
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className="theme-toggle" 
          aria-label="Toggle theme"
          title="Toggle Light/Dark Theme"
        >
          {currentTheme === 'light' ? (
            <Moon className="icon-moon" size={20} style={{ opacity: 1, color: 'var(--accent-purple)' }} />
          ) : (
            <Sun className="icon-sun" size={20} style={{ opacity: 1, color: 'var(--accent-amber)' }} />
          )}
        </button>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="mobile-toggle-btn" 
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer (Styled dynamically) */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          zIndex: 1000,
          boxShadow: 'var(--shadow-lg)'
        }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`navbar-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ justifyContent: 'flex-start', padding: '12px' }}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

function MainLayout({ children, currentTheme, toggleTheme }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  
  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentTheme={currentTheme} toggleTheme={toggleTheme} />
      <main style={{ 
        flex: 1, 
        paddingTop: isLanding ? '0' : '88px',
        paddingBottom: '40px',
        minHeight: 'calc(100vh - 64px)'
      }}>
        {children}
      </main>
      <footer style={{
        padding: 'var(--space-4) 0',
        textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        fontSize: 'var(--font-xs)',
        color: 'var(--text-muted)'
      }}>
        <div className="container">
          &copy; {new Date().getFullYear()} Global Supply Chain Risk Engine. Powered by Random Forest Predictors & Isolation Forests.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <MainLayout currentTheme={theme} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/predictor" element={<Predictor />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
