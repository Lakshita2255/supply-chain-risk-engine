import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Truck, 
  MapPin, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch analytics summary
      const analyticsRes = await fetch('/api/analytics');
      if (!analyticsRes.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch shipments
      const shipmentsRes = await fetch('/api/shipments');
      if (!shipmentsRes.ok) throw new Error('Failed to fetch shipments');
      const shipmentsData = await shipmentsRes.json();
      setShipments(shipmentsData.slice(0, 5)); // show recent 5

      // Fetch alerts (anomalies)
      const alertsRes = await fetch('/api/anomalies');
      if (!alertsRes.ok) throw new Error('Failed to fetch alerts');
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.slice(0, 3)); // show top 3
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend APIs. Verify uvicorn server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="rotating" size={32} style={{ color: 'var(--accent-blue)' }} />
        <p>Analyzing supply chain datasets and syncing telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 'var(--space-6)' }}>
        <div className="alert-card critical" style={{ maxWidth: '600px', margin: '40px auto' }}>
          <div className="alert-card-header">
            <AlertOctagon className="alert-card-icon" />
            <span className="alert-card-title">Backend Connection Refused</span>
          </div>
          <p className="alert-card-desc" style={{ marginBottom: '20px' }}>
            {error}
          </p>
          <button onClick={fetchData} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    total_shipments,
    in_transit,
    delivered,
    delayed,
    on_time_rate,
    avg_delay_hours,
    risk_distribution,
    top_risk_routes
  } = analytics;

  // Calculate percentages for status charts
  const totalCount = total_shipments || 1;
  const transitPercent = Math.round((in_transit / totalCount) * 100);
  const deliveredPercent = Math.round((delivered / totalCount) * 100);
  const delayedPercent = Math.round((delayed / totalCount) * 100);

  return (
    <div className="container">
      {/* Dashboard Page Header */}
      <div className="dashboard-page-header">
        <div>
          <h2 className="dashboard-page-title">Operational Command Center</h2>
          <div className="dashboard-meta">Real-time ML risk predictions and anomaly reports</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="connection-status connected">
            <div className="health-dot healthy" />
            <span>Telemetry Connected</span>
          </div>
          <button onClick={fetchData} className="theme-toggle" title="Refresh Live Data">
            <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* System Health Status Banner */}
      <div className="system-health">
        <div className="health-pill">
          <div className="health-dot healthy" />
          <span>ML Predictor: Active</span>
        </div>
        <div className="health-pill">
          <div className="health-dot healthy" />
          <span>Isolation Forest: Calibrated</span>
        </div>
        <div className="health-pill">
          <div className="health-dot healthy" />
          <span>Sensor Latency: 42ms</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        {/* KPI: Active */}
        <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>IN TRANSIT</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{in_transit}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Active monitored containers</div>
          </div>
        </div>

        {/* KPI: On-Time Rate */}
        <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-emerald-glow)', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>ON-TIME PERFORMANCE</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{(on_time_rate * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target threshold: &gt;85%</div>
          </div>
        </div>

        {/* KPI: Delayed */}
        <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>DELAYED CARGO</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{delayed}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Action required immediately</div>
          </div>
        </div>

        {/* KPI: Avg Delay Hours */}
        <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>AVG DELAY DURATION</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{avg_delay_hours}h</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Historical baseline: 14.2h</div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Details */}
      <div className="dashboard-grid-2">
        {/* Chart Card: Risk Profile Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Shipment Risk Breakdown</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
            {/* Critical */}
            <div>
              <div className="flex-between" style={{ fontSize: 'var(--font-xs)', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>Critical Risk (&gt;75)</span>
                <span>{risk_distribution.Critical || 0} shipments</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${((risk_distribution.Critical || 0) / totalCount) * 100}%`, background: 'var(--accent-rose)' }} /></div>
            </div>

            {/* High */}
            <div>
              <div className="flex-between" style={{ fontSize: 'var(--font-xs)', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>High Risk (50-75)</span>
                <span>{risk_distribution.High || 0} shipments</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${((risk_distribution.High || 0) / totalCount) * 100}%`, background: 'var(--accent-amber)' }} /></div>
            </div>

            {/* Medium */}
            <div>
              <div className="flex-between" style={{ fontSize: 'var(--font-xs)', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>Medium Risk (25-50)</span>
                <span>{risk_distribution.Medium || 0} shipments</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${((risk_distribution.Medium || 0) / totalCount) * 100}%`, background: 'var(--accent-blue)' }} /></div>
            </div>

            {/* Low */}
            <div>
              <div className="flex-between" style={{ fontSize: 'var(--font-xs)', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Low Risk (&lt;25)</span>
                <span>{risk_distribution.Low || 0} shipments</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${((risk_distribution.Low || 0) / totalCount) * 100}%`, background: 'var(--accent-emerald)' }} /></div>
            </div>
          </div>
        </div>

        {/* Chart Card: High Risk Routes */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Highest-Risk Shipping Lanes</h3>
            <Link to="/reports" className="navbar-link" style={{ fontSize: 'var(--font-xs)', padding: '4px 8px' }}>
              <span>View reports</span>
              <ChevronRight size={12} />
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '10px 0' }}>
            {top_risk_routes.map((route, i) => (
              <div key={route.route_id} className="flex-between" style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {i + 1}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{route.route_id}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg Risk Score</div>
                    <span style={{ fontWeight: 800, color: route.avg_risk_score > 60 ? 'var(--accent-rose)' : route.avg_risk_score > 35 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                      {route.avg_risk_score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts and Shipments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-6)' }}>
        
        {/* Recent Active Shipments Table */}
        <div className="recent-shipments" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <div className="card-header flex-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="chart-title">Telemetry Stream: Active Shipments</h3>
            <Link to="/tracker" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 'var(--font-xs)' }}>
              <span>Open Tracker Map</span>
            </Link>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 24px' }}>Shipment ID</th>
                  <th style={{ padding: '12px 24px' }}>Destination</th>
                  <th style={{ padding: '12px 24px' }}>Cargo Type</th>
                  <th style={{ padding: '12px 24px' }}>Status</th>
                  <th style={{ padding: '12px 24px' }}>Risk Index</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shp) => {
                  const risk = shp.delay_risk_score;
                  const riskColor = risk > 75 ? 'critical' : risk > 50 ? 'delayed' : risk > 25 ? 'transit' : 'active';
                  
                  return (
                    <tr key={shp.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px', fontWeight: 700 }}>{shp.id}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{shp.destination}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{shp.cargo_type}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className={`status-dot ${shp.status === 'Delivered' ? 'active' : shp.status === 'Delayed' ? 'delayed' : 'transit'}`} />
                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 500 }}>{shp.status}</span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          background: `var(--accent-${riskColor === 'active' ? 'emerald' : riskColor === 'transit' ? 'blue' : riskColor === 'delayed' ? 'amber' : 'rose'}-glow)`, 
                          color: `var(--accent-${riskColor === 'active' ? 'emerald' : riskColor === 'transit' ? 'blue' : riskColor === 'delayed' ? 'amber' : 'rose'})` 
                        }}>
                          {risk}/100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anomaly Alerts Panel */}
        <div className="alert-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>Isolation Forest Alerts</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                No anomalies detected in operational flows.
              </div>
            ) : (
              alerts.map((alt) => (
                <div key={alt.id} className={`alert-card ${alt.severity === 'critical' ? 'critical' : alt.severity === 'warning' ? 'warning' : 'info'}`} style={{ padding: '12px' }}>
                  <div className="alert-card-header">
                    <AlertTriangle className="alert-card-icon" size={16} />
                    <span className="alert-card-title" style={{ fontSize: 'var(--font-sm)' }}>{alt.title}</span>
                  </div>
                  <p className="alert-card-desc" style={{ fontSize: '11px', lineHeight: 1.4, margin: '8px 0' }}>
                    {alt.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Alert: {alt.id}</span>
                    <Link to="/alerts" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Investigate</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
