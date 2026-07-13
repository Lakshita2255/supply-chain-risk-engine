import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Download, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  AlertOctagon,
  FileText
} from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('daily_summary');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-10');
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          date_range: { start: startDate, end: endDate },
          summary: {},
          details: []
        })
      });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to build report. Verify backend is active.');
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyReportType = (type) => {
    const maps = {
      daily_summary: "Daily Operational Summary",
      risk_analysis: "Comprehensive Risk Assessment Profile",
      route_performance: "Transit Route Performance Analysis"
    };
    return maps[type] || type;
  };

  // Mock export action
  const triggerDownload = () => {
    if (!reportData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${reportType}_report_${startDate}_to_${endDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">Executive Reports & Audits</h2>
          <div className="dashboard-meta">Compile historical cargo transit profiles and export structured datasets</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-6)' }}>
        
        {/* Configurations Form */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <FileText style={{ color: 'var(--accent-blue)' }} size={20} />
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 800 }}>Compile Parameters</h3>
          </div>
          
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>REPORT TEMPLATE</label>
              <select 
                className="form-select" 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              >
                <option value="daily_summary">Daily Operational Summary</option>
                <option value="risk_analysis">Comprehensive Risk Profile</option>
                <option value="route_performance">Route Performance Scorecard</option>
              </select>
            </div>

            <div className="grid-2" style={{ gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>START DATE</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>END DATE</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary" 
              style={{ width: '100%', height: '44px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
            >
              {loading ? (
                <RefreshCw className="rotating" size={16} />
              ) : (
                <span>Compile Dataset</span>
              )}
            </button>
          </form>
        </div>

        {/* Display Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {error && (
            <div className="alert-card critical" style={{ margin: 0 }}>
              <span className="alert-card-title">{error}</span>
            </div>
          )}

          {!reportData && !loading && !error && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', borderStyle: 'dashed', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <FileSpreadsheet size={48} opacity={0.3} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Report Viewer Idle</h4>
              <p style={{ fontSize: 'var(--font-sm)', textAlign: 'center', maxWidth: '380px' }}>
                Select a template and choose compile dates on the left to extract matching rows.
              </p>
            </div>
          )}

          {loading && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <RefreshCw className="rotating" size={32} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Compiling records...</h4>
              <p style={{ fontSize: 'var(--font-sm)' }}>Aggregating telemetry tables...</p>
            </div>
          )}

          {reportData && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              
              {/* Export Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800 }}>{getFriendlyReportType(reportData.report_type)}</h3>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Range: {reportData.date_range.start} to {reportData.date_range.end}</div>
                </div>
                
                <button 
                  onClick={triggerDownload} 
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '6px' }}
                >
                  <Download size={14} />
                  <span>Download JSON</span>
                </button>
              </div>

              {/* Summary stats */}
              <div className="grid-3">
                <div className="chart-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>TOTAL ENTRIES</div>
                  <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginTop: '4px' }}>{reportData.summary.total_items}</div>
                </div>
                <div className="chart-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>HIGH RISK FLAGS</div>
                  <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>{reportData.summary.high_risk_items}</div>
                </div>
                <div className="chart-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>DELAYED ITEMS</div>
                  <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '4px' }}>{reportData.summary.delayed_items}</div>
                </div>
              </div>

              {/* Data Table */}
              <div className="recent-shipments" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '600px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 20px' }}>ID</th>
                        <th style={{ padding: '12px 20px' }}>Route Details</th>
                        <th style={{ padding: '12px 20px' }}>Cargo Type</th>
                        <th style={{ padding: '12px 20px' }}>Risk Index</th>
                        <th style={{ padding: '12px 20px' }}>Transit Status</th>
                        <th style={{ padding: '12px 20px' }}>Lag (Hours)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.details.map((row) => (
                        <tr key={row.shipment_id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                          <td style={{ padding: '12px 20px', fontWeight: 700 }}>{row.shipment_id}</td>
                          <td style={{ padding: '12px 20px', fontSize: 'var(--font-sm)' }}>{row.route}</td>
                          <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{row.cargo_type}</td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: row.risk_score > 75 ? 'var(--accent-rose)' : row.risk_score > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' 
                            }}>
                              {row.risk_score}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 'var(--font-xs)', fontWeight: 500 }}>{row.status}</td>
                          <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{row.delay_hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
