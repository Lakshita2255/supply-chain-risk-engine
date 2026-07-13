import React, { useState, useEffect } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Truck, 
  Anchor, 
  CheckCircle2, 
  AlertOctagon,
  X,
  Navigation,
  CloudSun,
  Activity,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';

// Projection helper mapping lat/lon to SVG coordinates (800x450 viewbox)
function projectCoords(lat, lon) {
  const x = ((parseFloat(lon) + 180) * 800) / 360;
  const y = ((90 - parseFloat(lat)) * 450) / 180;
  return { x, y };
}

export default function Tracker() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  // Update state fields for the details drawer
  const [updating, setUpdating] = useState(false);
  const [statusVal, setStatusVal] = useState('');
  const [weatherVal, setWeatherVal] = useState('');
  const [trafficVal, setTrafficVal] = useState(0.0);
  
  // New Shipment Creation state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newCargo, setNewCargo] = useState('Electronics');
  const [newWeight, setNewWeight] = useState(5000);
  const [newPriority, setNewPriority] = useState('medium');
  const [newDepDate, setNewDepDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      const shipRes = await fetch('/api/shipments');
      const shipsData = await shipRes.json();
      setShipments(shipsData);

      const routeRes = await fetch('/api/routes');
      const routesData = await routeRes.json();
      setRoutes(routesData);
      
      // If a shipment was selected, update its reference in selectedShipment
      if (selectedShipment) {
        const updated = shipsData.find(s => s.id === selectedShipment.id);
        if (updated) setSelectedShipment(updated);
      }
    } catch (e) {
      console.error('Failed to load tracking data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectShipment = (shipment) => {
    setSelectedShipment(shipment);
    setStatusVal(shipment.status);
    setWeatherVal(shipment.weather_conditions);
    setTrafficVal(shipment.traffic_congestion);
  };

  const handleUpdateShipment = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${selectedShipment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusVal,
          weather_conditions: weatherVal,
          traffic_congestion: parseFloat(trafficVal)
        })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update shipment details:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: newOrigin,
          destination: newDestination,
          cargo_type: newCargo,
          weight_kg: parseFloat(newWeight),
          volume_cbm: parseFloat(newWeight) / 500, // simple scale
          priority: newPriority,
          departure_date: newDepDate
        })
      });
      if (res.ok) {
        setCreateModalOpen(false);
        // Reset form
        setNewOrigin('');
        setNewDestination('');
        await loadData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || 'Failed to generate shipment'}`);
      }
    } catch (err) {
      console.error('Failed to create shipment:', err);
    }
  };

  // Filter logic
  const filteredShipments = shipments.filter(s => {
    const matchesSearch = 
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.origin.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo_type.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'all' || 
      s.status.toLowerCase() === statusFilter.toLowerCase();
      
    return matchesSearch && matchesStatus;
  });

  // Collect map path lines
  const mapRoutes = filteredShipments.map(s => {
    const routeInfo = routes.find(r => r.id === s.route_id);
    if (!routeInfo) return null;
    const originProj = projectCoords(routeInfo.origin.lat, routeInfo.origin.lon);
    const destProj = projectCoords(routeInfo.destination.lat, routeInfo.destination.lon);
    
    // Animate coordinates based on status
    let progress = 0.5; // defaults in-transit is halfway
    if (s.status === 'Pending') progress = 0.05;
    if (s.status === 'Delivered') progress = 1.0;
    
    // Linear interpolation
    const currX = originProj.x + (destProj.x - originProj.x) * progress;
    const currY = originProj.y + (destProj.y - originProj.y) * progress;

    return {
      id: s.id,
      origin: originProj,
      destination: destProj,
      current: { x: currX, y: currY },
      status: s.status,
      risk: s.delay_risk_score
    };
  }).filter(r => r !== null);

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="rotating" size={32} style={{ color: 'var(--accent-blue)' }} />
        <p>Plotting coordinates and fetching global transit logs...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '0' }}>
      
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">Operational Telemetry Map</h2>
          <div className="dashboard-meta">Interact with active shipments, update routes and re-predict logistics delay risk</div>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)} 
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}
        >
          <Plus size={16} />
          <span>New Shipment</span>
        </button>
      </div>

      <div className="tracker-layout">
        
        {/* SVG Interactive Map (Left Panel) */}
        <div className="map-container" style={{ position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 800 450" width="100%" height="100%" style={{ background: '#070c1d' }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              </pattern>
              
              {/* Glowing circles */}
              <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Dark Tech Grid Background */}
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Fake land outlines / abstract grid map */}
            <rect x="50" y="50" width="700" height="350" rx="10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="10,5" />

            {/* Plot paths of filtered shipments */}
            {mapRoutes.map((r) => {
              const color = r.risk > 75 ? 'var(--accent-rose)' : r.risk > 50 ? 'var(--accent-amber)' : 'var(--accent-blue)';
              const isSelected = selectedShipment && selectedShipment.id === r.id;
              
              return (
                <g key={r.id}>
                  {/* Origin to Destination Route Line */}
                  <path 
                    d={`M ${r.origin.x},${r.origin.y} L ${r.destination.x},${r.destination.y}`} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth={isSelected ? 3 : 1.5} 
                    opacity={isSelected ? 0.9 : 0.4} 
                    strokeDasharray={r.status === 'Pending' ? '4,4' : 'none'}
                  />
                  
                  {/* Origin Node */}
                  <circle cx={r.origin.x} cy={r.origin.y} r="4" fill="var(--text-secondary)" opacity="0.6" />
                  {/* Destination Node */}
                  <circle cx={r.destination.x} cy={r.destination.y} r="4" fill="var(--accent-emerald)" opacity="0.8" />
                  
                  {/* Pulsing cargo current position marker */}
                  <g 
                    onClick={() => handleSelectShipment(shipments.find(s => s.id === r.id))}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle 
                      cx={r.current.x} 
                      cy={r.current.y} 
                      r={isSelected ? 10 : 6} 
                      fill={color} 
                      filter="url(#glow-effect)" 
                      className={r.status === 'In Transit' ? 'node-pulse' : ''}
                    />
                    {isSelected && (
                      <circle 
                        cx={r.current.x} 
                        cy={r.current.y} 
                        r="18" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="1.5" 
                        opacity="0.5" 
                      />
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
          
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: '8px', backdropFilter: 'blur(10px)', fontSize: '11px', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }} />Low Risk</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />High Risk</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-rose)' }} />Critical Risk</div>
          </div>
        </div>

        {/* Shipment Listing Panel (Right Panel) */}
        <div className="shipment-list">
          {/* Filters */}
          <div className="search-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, paddingBottom: '12px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type="text" 
                placeholder="Search shipments..." 
                className="form-input" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
            
            <select 
              className="form-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0 12px' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* List items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredShipments.length === 0 ? (
              <div style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                No active shipments match filters.
              </div>
            ) : (
              filteredShipments.map((shp) => {
                const isActive = selectedShipment && selectedShipment.id === shp.id;
                const risk = shp.delay_risk_score;
                const statusClass = risk > 75 ? 'status-at-risk' : risk > 50 ? 'status-delayed' : 'status-on-time';
                
                return (
                  <div 
                    key={shp.id} 
                    className={`shipment-list-item ${statusClass} ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectShipment(shp)}
                  >
                    <div className="shipment-item-header">
                      <span className="shipment-id">{shp.id}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        {shp.priority}
                      </span>
                    </div>
                    <div className="shipment-route">{shp.origin} &rarr; {shp.destination}</div>
                    <div className="shipment-meta">
                      <span>Status: **{shp.status}**</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: risk > 75 ? 'var(--accent-rose)' : risk > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' 
                      }}>
                        {risk}% risk
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Slide-out details drawer panel */}
      <div className={`shipment-detail-panel ${selectedShipment ? 'open' : ''}`}>
        {selectedShipment && (
          <div>
            <div className="detail-panel-header">
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>Shipment Telemetry</h3>
              <button onClick={() => setSelectedShipment(null)} className="theme-toggle">
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Shipment ID</span>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{selectedShipment.id}</div>
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Origin</span>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{selectedShipment.origin}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Destination</span>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{selectedShipment.destination}</div>
                </div>
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Weight</span>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{selectedShipment.weight_kg} kg</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cargo Category</span>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{selectedShipment.cargo_type}</div>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ML DELAY PREDICTION</span>
                <div className="flex-between" style={{ marginTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: selectedShipment.delay_risk_score > 75 ? 'var(--accent-rose)' : selectedShipment.delay_risk_score > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                      {selectedShipment.delay_risk_score}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Delay Risk Score</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {selectedShipment.delay_hours || 0.0}h
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Delay</div>
                  </div>
                </div>
              </div>

              {/* Status update form */}
              <form onSubmit={handleUpdateShipment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>Telemetry Override</h4>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>SHIPMENT STATUS</label>
                  <select 
                    value={statusVal} 
                    onChange={(e) => setStatusVal(e.target.value)} 
                    className="form-select"
                    style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0 12px' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>WEATHER CONDITIONS</label>
                  <select 
                    value={weatherVal} 
                    onChange={(e) => setWeatherVal(e.target.value)} 
                    className="form-select"
                    style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0 12px' }}
                  >
                    <option value="Clear">Clear (Severity 1)</option>
                    <option value="Cloudy">Cloudy (Severity 2)</option>
                    <option value="Rain">Rain (Severity 3)</option>
                    <option value="Storm">Storm (Severity 4)</option>
                    <option value="Extreme">Extreme (Severity 5)</option>
                  </select>
                </div>

                <div>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TRAFFIC CONGESTION</label>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--accent-blue)' }}>{Math.round(trafficVal * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={trafficVal} 
                    onChange={(e) => setTrafficVal(e.target.value)} 
                    className="form-range"
                    style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={updating}
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {updating ? (
                    <RefreshCw className="rotating" size={16} />
                  ) : (
                    <span>Recalculate Risk Engine</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* New Shipment Modal */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 24, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="chart-card" style={{ width: '100%', maxWidth: '500px', padding: 'var(--space-6)', position: 'relative', background: 'var(--bg-surface)' }}>
            <button 
              onClick={() => setCreateModalOpen(false)} 
              className="theme-toggle" 
              style={{ position: 'absolute', right: '16px', top: '16px' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: '20px' }}>Register New Shipment</h3>
            
            <form onSubmit={handleCreateShipment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Origin City</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Shanghai" 
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  required 
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Destination City</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Los Angeles" 
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  required
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                />
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo Type</label>
                  <select 
                    className="form-select" 
                    value={newCargo} 
                    onChange={(e) => setNewCargo(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Automotive Parts">Automotive Parts</option>
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Food & Perishables">Food & Perishables</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Weight (kg)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    required
                    style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Priority</label>
                  <select 
                    className="form-select" 
                    value={newPriority} 
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="express">Express</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Departure Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newDepDate}
                    onChange={(e) => setNewDepDate(e.target.value)}
                    required
                    style={{ width: '100%', height: '40px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: '0 12px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', borderRadius: '6px', fontWeight: 600, marginTop: '10px' }}
              >
                Create Shipment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
