import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Compass, BrainCircuit, Activity, BarChart3, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="particles-bg" />
        
        {/* Globe and Connections Mock using a crisp glowing SVG */}
        <div className="globe-container flex-center">
          <svg viewBox="0 0 800 500" width="100%" height="100%" style={{ opacity: 0.25, maxWidth: '900px' }}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="route-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-cyan)" />
              </linearGradient>
            </defs>
            
            {/* Background Glow */}
            <circle cx="400" cy="250" r="220" fill="url(#glow)" />
            
            {/* Grid Lines/Latitude Longitude Mock */}
            <circle cx="400" cy="250" r="180" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="400" cy="250" r="120" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
            <line x1="200" y1="250" x2="600" y2="250" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="5,5" />
            <line x1="400" y1="50" x2="400" y2="450" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="5,5" />

            {/* Connecting Paths (Glow Routes) */}
            <path d="M 280,180 Q 400,100 520,180" fill="none" stroke="url(#route-grad-1)" strokeWidth="2.5" strokeDasharray="4,4" className="path-pulse" />
            <path d="M 250,280 Q 400,380 550,280" fill="none" stroke="url(#route-grad-1)" strokeWidth="1.5" />
            <path d="M 310,250 Q 400,210 490,250" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeDasharray="8,4" />

            {/* Animated Nodes / Cities */}
            <g className="node-pulse">
              <circle cx="280" cy="180" r="6" fill="var(--accent-cyan)" />
              <circle cx="280" cy="180" r="14" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.5" />
            </g>
            <g>
              <circle cx="520" cy="180" r="6" fill="var(--accent-blue)" />
              <circle cx="520" cy="180" r="12" fill="none" stroke="var(--accent-blue)" strokeWidth="1" opacity="0.4" />
            </g>
            <g className="node-pulse-delayed">
              <circle cx="250" cy="280" r="6" fill="var(--accent-rose)" />
              <circle cx="250" cy="280" r="14" fill="none" stroke="var(--accent-rose)" strokeWidth="1.5" opacity="0.6" />
            </g>
            <g>
              <circle cx="550" cy="280" r="6" fill="var(--accent-emerald)" />
            </g>
            <g>
              <circle cx="400" cy="250" r="8" fill="var(--accent-purple)" />
              <circle cx="400" cy="250" r="18" fill="none" stroke="var(--accent-purple)" strokeWidth="1" opacity="0.5" />
            </g>
          </svg>
        </div>

        <div className="hero-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'var(--accent-blue-glow)', border: '1px solid var(--accent-blue)', borderRadius: '20px', marginBottom: 'var(--space-5)', fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--accent-blue)' }}>
            <ShieldAlert size={14} />
            <span>AI-Driven Predictive Risk Analytics</span>
          </div>

          <h1 className="hero-title">
            Predict & Solve <span className="text-gradient">Supply Chain</span> Bottlenecks
          </h1>
          
          <p className="hero-subtitle">
            A comprehensive risk forecasting platform integrating Random Forest predictors and Isolation Forest anomaly models. Identify delays, isolate deviations, and automate logistics mitigation.
          </p>

          <div className="hero-cta">
            <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              <span>Enter Command Center</span>
              <ChevronRight size={18} />
            </Link>
            <Link to="/predictor" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              <span>Predict Shipment Delay</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights / Features Section */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px' }}>
            <h2 style={{ marginBottom: '16px' }}>Core Engine Abstractions</h2>
            <p>Leveraging statistical data and advanced ML models to minimize global transport friction.</p>
          </div>

          <div className="grid-3">
            <div className="chart-card" style={{ padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <BrainCircuit size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: '12px' }}>ML Delay Predictor</h3>
              <p style={{ fontSize: 'var(--font-sm)' }}>
                Trained Random Forest Classifier and Regressor models mapping environmental, route, and cargo parameters to actual risk levels and exact delay hours.
              </p>
            </div>

            <div className="chart-card" style={{ padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-rose-glow)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Activity size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: '12px' }}>Isolation Forest Scans</h3>
              <p style={{ fontSize: 'var(--font-sm)' }}>
                Dynamically scans all active operations for multidimensional outliers, detecting suspicious weather, supplier reliability drops, or cargo anomalies automatically.
              </p>
            </div>

            <div className="chart-card" style={{ padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <BarChart3 size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: '12px' }}>Simulation & Playbooks</h3>
              <p style={{ fontSize: 'var(--font-sm)' }}>
                Evaluate "What-If" scenarios to adjust parameters (weather severity, supplier changes, customs difficulty) and view automated recommendations side-by-side.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">98.4%</div>
              <div className="stat-label">Model Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">&lt; 2.5h</div>
              <div className="stat-label">Mean Regress Error (MAE)</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">20+</div>
              <div className="stat-label">Global Maritime Routes</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Real-Time</div>
              <div className="stat-label">Telemetry Analysis</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
