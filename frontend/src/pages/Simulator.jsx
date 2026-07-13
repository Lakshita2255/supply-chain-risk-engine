import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Info,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Simulator() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  // Simulation overrides
  const [scenarioName, setScenarioName] = useState('Severe Storm Bypass');
  const [weather, setWeather] = useState(3);
  const [traffic, setTraffic] = useState(0.4);
  const [supplier, setSupplier] = useState(0.85);
  const [port, setPort] = useState(0.3);
  const [customs, setCustoms] = useState(0.3);
  
  // Results
  const [basePrediction, setBasePrediction] = useState(null);
  const [simPrediction, setSimPrediction] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);

  const loadShipments = async () => {
    try {
      const res = await fetch('/api/shipments');
      const data = await res.json();
      setShipments(data);
      if (data.length > 0) {
        handleSelectBase(data[0]);
      }
    } catch (e) {
      console.error('Failed to load base shipments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const handleSelectBase = async (ship) => {
    setSelectedShipment(ship);
    setError(null);
    setSimPrediction(null);
    
    // Set slider defaults to current values of the shipment
    // Map weather conditions string to severity
    const weatherMap = { "Clear": 1, "Cloudy": 2, "Rain": 3, "Storm": 4, "Extreme": 5 };
    setWeather(weatherMap[ship.weather_conditions] || 1);
    setTraffic(ship.traffic_congestion || 0.1);
    setSupplier(ship.supplier_reliability || 0.8);
    setPort(ship.port_congestion || 0.2);
    // Guess customs complexity or default 0.3
    setCustoms(0.3);

    // Call prediction for base shipment profile to get complete model details
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: ship.origin,
          destination: ship.destination,
          cargo_type: ship.cargo_type,
          weight_kg: ship.weight_kg,
          departure_date: ship.departure_date.split('T')[0],
          weather_severity: weatherMap[ship.weather_conditions] || 1,
          traffic_congestion: ship.traffic_congestion || 0.1
        })
      });
      const data = await res.json();
      setBasePrediction(data);
    } catch (err) {
      console.error('Base prediction query failed:', err);
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: scenarioName,
          origin: selectedShipment.origin,
          destination: selectedShipment.destination,
          cargo_type: selectedShipment.cargo_type,
          weight_kg: selectedShipment.weight_kg,
          departure_date: selectedShipment.departure_date.split('T')[0],
          weather_severity: parseInt(weather),
          traffic_congestion: parseFloat(traffic),
          supplier_reliability: parseFloat(supplier),
          port_congestion: parseFloat(port),
          customs_complexity: parseFloat(customs)
        })
      });
      if (!res.ok) throw new Error('Simulation calculation rejected');
      const data = await res.json();
      setSimPrediction(data);
    } catch (err) {
      console.error(err);
      setError('Simulation model execution aborted. Verify backend status.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="rotating" size={32} style={{ color: 'var(--accent-blue)' }} />
        <p>Pre-loading active shipment datasets for override templates...</p>
      </div>
    );
  }

  // Calculate variances
  const getRiskDelta = () => {
    if (!basePrediction || !simPrediction) return 0;
    return simPrediction.prediction.risk_score - basePrediction.risk_score;
  };

  const getDelayDelta = () => {
    if (!basePrediction || !simPrediction) return 0;
    return simPrediction.prediction.estimated_delay_hours - basePrediction.estimated_delay_hours;
  };

  const riskDelta = getRiskDelta();
  const delayDelta = getDelayDelta();

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">What-If Scenario Simulator</h2>
          <div className="dashboard-meta">Simulate extreme weather shifts, supplier relapses, or port lockouts without affecting active logs</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-6)' }}>
        
        {/* Scenario Variables Form */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Sliders style={{ color: 'var(--accent-blue)' }} size={20} />
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 800 }}>Scenario Configuration</h3>
          </div>
          
          <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>SELECT BASE SHIPMENT</label>
              <select 
                onChange={(e) => handleSelectBase(shipments.find(s => s.id === e.target.value))}
                value={selectedShipment ? selectedShipment.id : ''}
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              >
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>{s.id} ({s.origin} &rarr; {s.destination})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>SCENARIO NAME</label>
              <input 
                type="text" 
                className="form-input" 
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                required
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Risk Overrides</h4>
              
              {/* Weather */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>WEATHER SEVERITY</label>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>Level {weather}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1" 
                  value={weather} onChange={(e) => setWeather(parseInt(e.target.value))} 
                  className="form-range" style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>

              {/* Traffic */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TRAFFIC CONGESTION</label>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(traffic * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={traffic} onChange={(e) => setTraffic(parseFloat(e.target.value))} 
                  className="form-range" style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>

              {/* Supplier */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SUPPLIER RELIABILITY</label>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(supplier * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={supplier} onChange={(e) => setSupplier(parseFloat(e.target.value))} 
                  className="form-range" style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>

              {/* Port Congestion */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PORT CONGESTION</label>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(port * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={port} onChange={(e) => setPort(parseFloat(e.target.value))} 
                  className="form-range" style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>

              {/* Customs Complexity */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CUSTOMS COMPLEXITY</label>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(customs * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={customs} onChange={(e) => setCustoms(parseFloat(e.target.value))} 
                  className="form-range" style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={simulating}
              className="btn btn-primary" 
              style={{ width: '100%', height: '44px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
            >
              {simulating ? (
                <RefreshCw className="rotating" size={16} />
              ) : (
                <span>Run Scenario Simulation</span>
              )}
            </button>
          </form>
        </div>

        {/* Results Comparison Panel (Right Panel) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {error && (
            <div className="alert-card critical" style={{ margin: 0 }}>
              <div className="alert-card-header">
                <Info size={16} />
                <span className="alert-card-title">Simulation Error</span>
              </div>
              <p className="alert-card-desc">{error}</p>
            </div>
          )}

          {!simPrediction && !simulating && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', borderStyle: 'dashed', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <Layers size={48} opacity={0.3} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Simulation Model Idle</h4>
              <p style={{ fontSize: 'var(--font-sm)', textAlign: 'center', maxWidth: '380px' }}>
                Select a base shipment, configure the slides to override real conditions, and execute "What-If" prediction models.
              </p>
            </div>
          )}

          {simulating && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <RefreshCw className="rotating" size={32} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Simulating Environment...</h4>
              <p style={{ fontSize: 'var(--font-sm)' }}>Evaluating alternate decision boundaries...</p>
            </div>
          )}

          {simPrediction && !simulating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              
              {/* Variance Callouts */}
              <div className="grid-2">
                {/* Risk Variance */}
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Variance</div>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: riskDelta > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {riskDelta > 0 ? `+${riskDelta.toFixed(0)}` : riskDelta.toFixed(0)} points
                    </span>
                  </div>
                  {riskDelta > 0 ? (
                    <TrendingUp size={24} style={{ color: 'var(--accent-rose)' }} />
                  ) : (
                    <TrendingDown size={24} style={{ color: 'var(--accent-emerald)' }} />
                  )}
                </div>

                {/* Delay Variance */}
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Delay Variance</div>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: delayDelta > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {delayDelta > 0 ? `+${delayDelta.toFixed(1)}` : delayDelta.toFixed(1)} hours
                    </span>
                  </div>
                  {delayDelta > 0 ? (
                    <TrendingUp size={24} style={{ color: 'var(--accent-rose)' }} />
                  ) : (
                    <TrendingDown size={24} style={{ color: 'var(--accent-emerald)' }} />
                  )}
                </div>
              </div>

              {/* Side-by-Side Cards */}
              <div className="grid-2">
                {/* Base Profile Card */}
                <div className="chart-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <span>BASE Telemetry Profile</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Weather Severity</span>
                      <span style={{ fontWeight: 600 }}>Level {weather}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Traffic Congestion</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(selectedShipment.traffic_congestion * 100)}%</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Supplier Reliability</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(selectedShipment.supplier_reliability * 100)}%</span>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px' }}>
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Risk Score:</span>
                        <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {basePrediction ? basePrediction.risk_score.toFixed(0) : selectedShipment.delay_risk_score}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Delay Hours:</span>
                        <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {basePrediction ? basePrediction.estimated_delay_hours.toFixed(1) : selectedShipment.delay_hours}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Profile Card */}
                <div className="chart-card" style={{ border: '1px solid var(--accent-blue)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '16px', borderBottom: '1px solid var(--accent-blue-glow)', paddingBottom: '8px' }}>
                    <Sparkles size={14} />
                    <span>SIMULATED: {scenarioName}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Weather Severity</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>Level {weather}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Traffic Congestion</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{Math.round(traffic * 100)}%</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Supplier Reliability</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{Math.round(supplier * 100)}%</span>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--accent-blue-glow)', paddingTop: '12px', marginTop: '4px' }}>
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Risk Score:</span>
                        <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: simPrediction.prediction.risk_score > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                          {simPrediction.prediction.risk_score.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Delay Hours:</span>
                        <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                          {simPrediction.prediction.estimated_delay_hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Insights / Playbooks */}
              <div className="chart-card" style={{ background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  Simulated Contingency Strategy
                </h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {simPrediction.prediction.recommendations.map((rec, i) => (
                    <li key={i} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      * {rec}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
