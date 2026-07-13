import React, { useState } from 'react';
import { 
  BrainCircuit, 
  RefreshCw, 
  MapPin, 
  Anchor, 
  Weight, 
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Scale
} from 'lucide-react';

export default function Predictor() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoType, setCargoType] = useState('General');
  const [weight, setWeight] = useState(5000);
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState(1);
  const [traffic, setTraffic] = useState(0.1);
  
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          cargo_type: cargoType,
          weight_kg: parseFloat(weight),
          departure_date: depDate,
          weather_severity: parseInt(weather),
          traffic_congestion: parseFloat(traffic)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction failed');
      }
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not calculate delay risk. Ensure uvicorn backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyFactorName = (name) => {
    const maps = {
      "weight_kg": "Shipment Weight",
      "distance_km": "Route Distance",
      "weather_severity": "Weather Severity",
      "traffic_congestion": "Traffic Congestion",
      "supplier_reliability": "Supplier Reliability",
      "port_congestion": "Port Congestion",
      "customs_complexity": "Customs Complexity",
      "route_risk_score": "Route Risk Score",
      "month": "Seasonal Month",
      "day_of_week": "Departure Weekday",
      "is_peak_season": "Peak Cargo Season",
      "cargo_type_encoded": "Cargo Category"
    };
    return maps[name] || name;
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">Random Forest Predictor</h2>
          <div className="dashboard-meta">Train scikit-learn models on historical lags and evaluate route vulnerability</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-6)' }}>
        
        {/* Form Inputs Panel */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <BrainCircuit style={{ color: 'var(--accent-blue)' }} size={20} />
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 800 }}>Risk Variables</h3>
          </div>
          
          <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>ORIGIN CITY</label>
              <input 
                type="text" 
                placeholder="e.g. Shanghai" 
                className="form-input" 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>DESTINATION CITY</label>
              <input 
                type="text" 
                placeholder="e.g. Los Angeles" 
                className="form-input" 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              />
            </div>

            <div className="grid-2" style={{ gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>CARGO TYPE</label>
                <select 
                  className="form-select" 
                  value={cargoType} 
                  onChange={(e) => setCargoType(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
                >
                  <option value="General">General</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Perishable">Perishable</option>
                  <option value="Hazardous">Hazardous</option>
                  <option value="Pharmaceutical">Pharmaceutical</option>
                  <option value="Automotive">Automotive</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>WEIGHT (KG)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>DEPARTURE DATE</label>
              <input 
                type="date" 
                className="form-input" 
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
                required
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>WEATHER SEVERITY</label>
              <select 
                className="form-select" 
                value={weather} 
                onChange={(e) => setWeather(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', padding: '0 12px', borderRadius: '6px', marginBottom: '12px' }}
              >
                <option value="1">Clear (Level 1)</option>
                <option value="2">Cloudy (Level 2)</option>
                <option value="3">Rain (Level 3)</option>
                <option value="4">Storm (Level 4)</option>
                <option value="5">Extreme Storm (Level 5)</option>
              </select>

              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TRAFFIC CONGESTION</label>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(traffic * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={traffic} 
                onChange={(e) => setTraffic(parseFloat(e.target.value))} 
                className="form-range"
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
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
                <span>Compute Risk Predictions</span>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel (Right Panel) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {error && (
            <div className="alert-card critical" style={{ margin: 0 }}>
              <div className="alert-card-header">
                <AlertTriangle className="alert-card-icon" />
                <span className="alert-card-title">Prediction Calculation Halted</span>
              </div>
              <p className="alert-card-desc">{error}</p>
            </div>
          )}

          {!prediction && !loading && !error && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', borderStyle: 'dashed', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <BrainCircuit size={48} opacity={0.3} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Risk Engine Idle</h4>
              <p style={{ fontSize: 'var(--font-sm)', textAlign: 'center', maxWidth: '380px' }}>
                Fill out the shipping details on the left and submit the calculation query to execute Random Forest forecasts.
              </p>
            </div>
          )}

          {loading && (
            <div className="chart-card flex-center" style={{ minHeight: '350px', background: 'var(--bg-card)', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <RefreshCw className="rotating" size={32} style={{ marginBottom: '16px', color: 'var(--accent-blue)' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Evaluating Decisions...</h4>
              <p style={{ fontSize: 'var(--font-sm)' }}>Traversing classifier decision path branches...</p>
            </div>
          )}

          {prediction && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Summary KPIs: Score & Probability */}
              <div className="grid-3">
                {/* Composite Risk Score */}
                <div className="chart-card flex-center" style={{ flexDirection: 'column', padding: '24px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>COMPOSITE RISK INDEX</span>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: prediction.risk_score > 75 ? 'var(--accent-rose)' : prediction.risk_score > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)', margin: '8px 0', lineHeight: 1 }}>
                    {prediction.risk_score.toFixed(0)}
                  </div>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: prediction.risk_score > 75 ? 'var(--accent-rose-glow)' : prediction.risk_score > 50 ? 'var(--accent-amber-glow)' : 'var(--accent-emerald-glow)', color: prediction.risk_score > 75 ? 'var(--accent-rose)' : prediction.risk_score > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                    {prediction.risk_level}
                  </span>
                </div>

                {/* Delay Probability */}
                <div className="chart-card flex-center" style={{ flexDirection: 'column', padding: '24px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>DELAY PROBABILITY</span>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent-blue)', margin: '8px 0', lineHeight: 1 }}>
                    {(prediction.delay_probability * 100).toFixed(1)}%
                  </div>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Standard normal density</span>
                </div>

                {/* Delay Hours */}
                <div className="chart-card flex-center" style={{ flexDirection: 'column', padding: '24px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ESTIMATED LAG</span>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent-cyan)', margin: '8px 0', lineHeight: 1 }}>
                    {prediction.estimated_delay_hours.toFixed(1)}h
                  </div>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Regressor prediction</span>
                </div>
              </div>

              {/* Confidence Banner */}
              <div style={{ padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <ShieldCheck style={{ color: 'var(--accent-emerald)' }} size={16} />
                  <span>Classifier Prediction Confidence Index:</span>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{(prediction.confidence * 100).toFixed(0)}%</span>
              </div>

              {/* Factors & Explanations */}
              <div className="chart-card">
                <h3 className="chart-title" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  Feature Gini Importance Factors (Top Contributing)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {prediction.contributing_factors.map((factor) => (
                    <div key={factor.name} className="factor-explanation" style={{ margin: 0, padding: '12px 16px' }}>
                      <div className="factor-explanation-header">
                        <span className="factor-explanation-name">{getFriendlyFactorName(factor.name)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Importance:</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)' }}>{(factor.impact * 100).toFixed(1)}%</span>
                          <div className="factor-importance-bar">
                            <div className="factor-importance-fill" style={{ width: `${factor.impact * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <p className="factor-explanation-desc">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation playbooks */}
              <div className="chart-card" style={{ background: 'var(--bg-card)' }}>
                <h3 className="chart-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lightbulb style={{ color: 'var(--accent-amber)' }} size={18} />
                  <span>AI Delay Mitigation Playbook</span>
                </h3>
                
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} style={{ display: 'flex', gap: '10px', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{i + 1}.</span>
                      <span>{rec}</span>
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
