import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function Alerts() {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  const fetchAlerts = async (scan = false) => {
    if (scan) setScanning(true);
    try {
      const res = await fetch(`/api/anomalies${scan ? '?scan=true' : ''}`);
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load anomaly alerts:', e);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="rotating" size={32} style={{ color: 'var(--accent-blue)' }} />
        <p>Initializing Isolation Forest scans on telemetry streams...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">Anomaly Alert Command Hub</h2>
          <div className="dashboard-meta">Monitor unsupervised scikit-learn Isolation Forest deviations in cargo workflows</div>
        </div>
        
        <button 
          onClick={() => fetchAlerts(true)} 
          disabled={scanning}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}
        >
          {scanning ? (
            <RefreshCw className="rotating" size={16} />
          ) : (
            <Activity size={16} />
          )}
          <span>Scan Active Telemetry</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        
        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alerts.length === 0 ? (
            <div className="chart-card flex-center" style={{ minHeight: '300px', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--accent-emerald)', marginBottom: '16px' }} />
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>System Flows Normalized</h4>
              <p style={{ fontSize: 'var(--font-sm)' }}>No multi-dimensional deviations detected in active shipment payloads.</p>
            </div>
          ) : (
            alerts.map((alt) => {
              const borderColors = {
                critical: 'var(--accent-rose)',
                warning: 'var(--accent-amber)',
                info: 'var(--accent-blue)'
              };
              
              return (
                <div 
                  key={alt.id} 
                  className={`alert-card ${alt.severity}`}
                  style={{
                    background: 'var(--bg-card)',
                    borderLeft: `4px solid ${borderColors[alt.severity] || 'var(--text-muted)'}`,
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)'
                  }}
                >
                  <div className="alert-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle style={{ color: borderColors[alt.severity] }} size={18} />
                      <span className="alert-card-title" style={{ fontSize: 'var(--font-md)', fontWeight: 800 }}>{alt.title}</span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: alt.severity === 'critical' ? 'var(--accent-rose-glow)' : alt.severity === 'warning' ? 'var(--accent-amber-glow)' : 'var(--accent-blue-glow)',
                      color: borderColors[alt.severity]
                    }}>
                      {alt.severity}
                    </span>
                  </div>

                  <p className="alert-card-desc" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                    {alt.description}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Affected Shipments:</span>
                    {alt.affected_shipments.map(s => (
                      <span key={s} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Actions checklist */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={14} style={{ color: 'var(--accent-amber)' }} />
                      <span>Mitigation Playbook Actions:</span>
                    </div>
                    
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {alt.recommended_actions.map((act, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>&rarr;</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Column Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="chart-card" style={{ background: 'var(--bg-card)' }}>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, marginBottom: '12px' }}>Detector Diagnostic</h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
              The Isolation Forest searches for anomalies by isolating features. If a shipment requires very few partition steps, it is flagged as an outlier.
            </p>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex-between"><span>Calibration factor:</span><span style={{ fontWeight: 600 }}>0.10 (contamination)</span></div>
              <div className="flex-between"><span>Active alerts count:</span><span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>{alerts.length}</span></div>
              <div className="flex-between"><span>Diagnostic status:</span><span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Synchronized</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
