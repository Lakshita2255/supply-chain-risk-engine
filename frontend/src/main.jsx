import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import CSS custom framework files in correct order
import '../css/global.css';
import '../css/themes.css';
import '../css/components.css';
import '../css/landing.css';
import '../css/dashboard.css';
import '../css/analytics.css';
import '../css/predictions.css';
import '../css/live.css';
import '../css/tracker.css';
import '../css/reports.css';
import '../css/animations.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
