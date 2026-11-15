# SensorGuard: Multivariate IoT Anomaly Detection & Spatial Reliability System

**SensorGuard** is an end-to-end unsupervised machine learning and telemetry diagnostics pipeline built on the **Intel Berkeley Research Lab** wireless sensor network dataset. It combines statistical outlier detection with a causal, per-sensor **Isolation Forest** model to identify multivariate sensor anomalies, detect battery-driven hardware degradation (`< 2.4V`), and compute a composite **Spatial Reliability Index (0–100%)** across physical lab coordinates.

---

## Key Features

* **Strict Chronological & Causal Pipeline:** Eliminates look-ahead bias by sorting telemetry per mote and fitting scalers and Isolation Forest models strictly on the first **70%** of each sensor's timeline.
* **Temporal Feature Engineering:** Augments raw readings (`temperature`, `humidity`, `light`, `voltage`) with first-order temporal differences (`_diff`) to capture sudden hardware spikes, drops, and drift.
* **Outlier-Resistant Scaling:** Uses `RobustScaler` (median and interquartile range) so early extreme sensor glitches do not distort feature normalization.
* **Cross-Method Evaluation:** Benchmarks multivariate Isolation Forest detections against univariate statistical baselines (Rolling Z-Score and Per-Sensor IQR) using F1-Score, Jaccard Similarity (IoU), and `decision_function` separation margins.
* **SensorGuard Reliability Index:** Combines network epoch completeness and anomaly-free signal quality into a unified reliability score mapped across the lab's $(X, Y)$ floor layout.
* **Interactive Streamlit Dashboard (`app.py`):** Provides real-time user-input telemetry inference, interactive time-series zoom diagnostics, and spatial reliability rankings.

---

## Project Structure

```text
SensorGuard/
├── Data/
│   ├── cleaned_sensor_data.csv              # Preprocessed Intel Lab telemetry dataset
│   └── final_sensor_reliability_report.csv  # Exported per-mote reliability metrics
├── ml_model.ipynb                           # Model training, evaluation & spatial reporting notebook
├── app.py                                   # Interactive Streamlit ML dashboard
└── README.md                                # Project documentation
```

---

## Model Architecture & Methodology

1. **Feature Space (8 Dimensions per Sensor):**
   * Raw telemetry: `temperature` ($^\circ\text{C}$), `humidity` ($\%$), `light` ($\text{Lux}$), `voltage` ($\text{V}$)
   * Temporal rate-of-change: `temperature_diff`, `humidity_diff`, `light_diff`, `voltage_diff`
2. **Per-Sensor Isolation Forest:**
   * Hyperparameters: `n_estimators=150`, `contamination=0.02`, `random_state=42`
   * Outputs both binary flags (`anomaly_iforest`) and continuous anomaly scores (`iforest_score`), where lower/negative scores indicate stronger isolation.
3. **Composite Reliability Formula:**
   $$\text{Reliability (\%)} = \left(0.5 \times \text{Completeness} + 0.5 \times \text{Clean Signal Ratio}\right) \times 100$$
   * **Completeness:** Ratio of unique active epochs recorded by the mote relative to total unique network epochs.
   * **Clean Signal Ratio:** Proportion of readings free of Isolation Forest anomalies and operating at or above the `2.4V` hardware threshold.

---

## Getting Started

### 1. Prerequisites
Ensure you have Python 3.9+ installed, then install the required dependencies:

```bash
pip install streamlit pandas numpy matplotlib seaborn scikit-learn
```

### 2. Running the Jupyter Notebook
Open `ml_model.ipynb` in VS Code or Jupyter Lab and run all 5 cells sequentially to:
* Engineer temporal features and train the per-sensor Isolation Forest models.
* View internal train-vs-test drift metrics and statistical baseline comparisons.
* Inspect Mote 1 chronological anomaly plots.
* Generate `Data/final_sensor_reliability_report.csv` and the spatial reliability map.

### 3. Launching the Streamlit Dashboard
From the `SensorGuard/` root directory, run:

```bash
streamlit run app.py
```

Open your browser to `http://localhost:8501` to:
* Test custom telemetry and rate-of-change ($\Delta$) inputs against any sensor's trained Isolation Forest model in real time.
* Explore chronological anomaly clusters using the interactive window slider.
* Inspect the spatial reliability map and node leaderboard.