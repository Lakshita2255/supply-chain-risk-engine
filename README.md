# 🌍 Supply Chain Risk Prediction & Tracking Engine

An advanced, full-stack decision-support system designed to predict, simulate, track, and mitigate risks across global supply chain routes. The application combines a responsive **React frontend** with a robust **FastAPI backend** powered by **Scikit-Learn Machine Learning Models**.

---

## 🚀 Key Features

### 1. 📊 Interactive Executive Dashboard
* **Real-time Metrics:** High-level KPIs representing on-time performance rate, average delay risk score, total active shipments, and flagged delayed cargo.
* **Aggregated Summaries:** Visual lists of high-risk routes, pending anomalies, and active delay status logs.
* **Dual Theme Support:** Seamless Dark/Light mode layout toggles.

### 2. 🗺️ Live Shipment Tracker
* **Real-time Monitoring:** Track progress, current route locations, delay hours, and specific weather conditions.
* **In-transit Customization:** Update shipment variables (e.g., traffic congestion, weather severity) on the fly and re-trigger predictions.

### 3. 🧠 Machine Learning Risk Predictor
* **Random Forest Predictor:** Evaluates route distance, cargo weight, cargo type, weather severity, regional traffic, customs complexity, and supplier reliability.
* **Detailed Breakdown:** Predicts risk levels (Low, Medium, High, Critical), delay probability, and estimated delay hours.
* **Explainable AI:** Computes contributing factors and outputs concrete logistics recommendations (e.g., rerouting, buffering stock, activating backup suppliers).

### 4. 🎛️ Scenario Simulator ("What-If" Analysis)
* **Interactive Sliders:** Tweak variables like weather severity, traffic congestion, supplier reliability, and port congestion to see how risk dynamics adjust in real time.
* **Side-by-Side Comparisons:** Evaluate the impact of altering shipment weights or cargo types.

### 5. 🤖 AI Chatbot Assistant
* **Natural Language Queries:** Look up shipment statuses directly by their ID (e.g., `SHP-001`).
* **Route Diagnostics:** Query stats like *"show high risk routes"* or *"show shipment logs"*.
* **Mitigation Advice:** Dynamically recommends recovery actions based on predicted delay factors.

### 6. ⚠️ Anomaly Detector (Isolation Forest)
* **Outlier Scanning:** Leverages an unsupervised `Isolation Forest` model to flag anomalous logs and irregular port/customs delays.
* **Alert System:** Raises detailed alerts with severity metrics (Medium, High, Critical) and recommended logistics interventions.

### 7. 📄 Export & Reports Hub
* **Statistical Audits:** Summarized logs of active systems and delivery breakdowns.
* **CSV Export:** Download full tracking logs for external auditing.

---

## 🛠️ Architecture & Technologies

### Backend
* **FastAPI:** Python-based, modern, high-performance web framework for APIs.
* **Scikit-Learn:** Drives the predictive models:
  * **`RandomForestRegressor` & `RandomForestClassifier`**: Combined risk score and delay prediction models.
  * **`IsolationForest`**: Unsupervised anomaly detection.
* **Pandas & NumPy:** Data preprocessing, feature engineering, and analytics calculation.
* **Uvicorn:** ASGI web server.

### Frontend
* **React (Vite):** Fast, modern frontend framework.
* **Lucide React:** Iconography.
* **Vanilla CSS (Custom CSS Variables):** Clean, custom styling with responsive grid layouts, animations, and transitions.

---

## 📂 Project Structure

```text
supply-chain-risk-engine/
├── backend/
│   ├── data/                           # Local Data Store
│   │   ├── historical_delays.csv       # Training dataset
│   │   ├── routes.json                 # Available shipping routes
│   │   └── sample_shipments.json       # Active tracking data
│   ├── models/
│   │   ├── trained/                    # Trained scikit-learn models (generated on startup)
│   │   ├── anomaly_detector.py         # Isolation Forest anomaly detection pipeline
│   │   ├── ml_model.py                 # Random Forest predictor pipeline
│   │   └── schemas.py                  # Pydantic data schemas
│   ├── pipelines/
│   │   ├── data_pipeline.py            # Centralised data loader/caching layer
│   │   └── feature_engineering.py      # Feature preprocessor and extractor
│   ├── utils/
│   │   └── helpers.py                  # ID generators, distance calculation formulas
│   ├── config.py                       # App settings and directory configs
│   ├── main.py                         # FastAPI routes and server entrypoint
│   └── requirements.txt                # Backend dependencies
│
├── frontend/
│   ├── css/                            # Custom stylesheets
│   ├── src/
│   │   ├── pages/                      # Dashboard, Predictor, Tracker, Simulator, Alerts, Chat, Reports
│   │   ├── App.jsx                     # Layout components & router settings
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json                    # Frontend dependencies
│   └── vite.config.js
│
├── generate_csv.py                     # Synthetic historical dataset generator script
└── README.md                           # This file
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Make sure you have the following installed:
* **Python 3.8+**
* **Node.js 16+** (includes `npm`)

### 2. Backend Installation & Model Training
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Create environment
   python -m venv venv
   
   # Activate (Windows)
   venv\Scripts\activate
   
   # Activate (macOS/Linux)
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend:
   ```bash
   uvicorn main:app --reload
   ```
   *Note: On startup, the backend checks for `backend/data/historical_delays.csv` and automatically trains both the machine learning predictor and the anomaly detector. The trained models will be saved in `backend/models/trained/`.*

### 3. Frontend Installation
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the link displayed in the terminal (usually `http://localhost:5173`) in your web browser.

---

## 🤖 Model Details

### Delay & Risk Predictor
The Risk Predictor uses features such as weight, cargo type, route distance, weather conditions, supplier reliability, customs complexity, and traffic density. The features are transformed using encoding pipelines inside `backend/pipelines/feature_engineering.py`.
* **Risk Score / Delay probability:** Predicted using custom-weighted configurations.
* **Delay Hours:** Estimated using a Random Forest Regressor trained on synthetic logistics datasets.

### Anomaly Detector
The Anomaly Detector utilizes an **Isolation Forest** model trained on historical routing metrics. When shipments display out-of-bounds behavior (e.g. extreme traffic congestion, weather/port delays relative to standard metrics), they are isolated as anomalies, prompting alerts on the dashboard.

---

## 📝 License
This project is licensed under the MIT License.
