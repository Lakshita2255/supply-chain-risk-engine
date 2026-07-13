# Supply Chain Risk Engine

A full-stack application to predict, track, and manage supply chain risks using machine learning.

## Project Structure

This repository is divided into two main components:

- **`frontend/`**: A React-based web application providing the user interface.
- **`backend/`**: A Python-based backend that handles data processing, API endpoints, and machine learning models for risk prediction.

## Features

- **Risk Predictor:** Utilize machine learning models to forecast potential supply chain disruptions.
- **Shipment Tracker:** Real-time visibility into active shipments and their current risk profiles.
- **Interactive Dashboards:** Visualizations and metrics to help manage and mitigate supply chain issues proactively.

## Prerequisites

- **Node.js** (v16+ recommended for the frontend)
- **Python** 3.8+ (for the backend)
- **npm** and **pip**

## Setup & Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Start both the backend and frontend servers as described above.
2. Open your browser and navigate to the address provided by the frontend development server (usually `http://localhost:5173` or `http://localhost:3000`).

## License

This project is licensed under the MIT License.
