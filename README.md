cd C:\Users\imman\SensorGaurd

@'
# IDSE Projects — SensorGuard & Zombie Survival

This repository contains two independent projects developed as part of Introduction to Data Science & Engineering (IDSE).

The projects demonstrate the practical application of data science, machine learning, statistical analysis, and interactive game-based learning.

---

## Project 1: SensorGuard — IoT Anomaly Detection

SensorGuard is a machine learning-based IoT sensor monitoring and anomaly detection system developed using the Intel Berkeley Research Lab wireless sensor dataset.

The project uses statistical techniques and Isolation Forest to identify abnormal sensor readings, monitor hardware degradation, and evaluate sensor reliability.

### Key Features
- IoT sensor data preprocessing and cleaning
- Temperature, humidity, light, and voltage analysis
- Temporal feature engineering
- Anomaly detection using Isolation Forest
- Statistical outlier detection using Z-Score and IQR
- Sensor battery health monitoring
- Spatial Reliability Index calculation
- Interactive Streamlit dashboard
- Machine learning model evaluation

### Technologies
Python, Pandas, NumPy, Scikit-learn, Matplotlib, Seaborn, Jupyter Notebook, and Streamlit.

[View SensorGuard Project](./Sensorgaurd/README.md)

---

## Project 2: Zombie Survival — Survive Using Data

Zombie Survival is an interactive, story-driven educational game designed to teach fundamental data science concepts through five survival missions.

Players take the role of a tactical data analyst in a zombie-infested world, using statistical reasoning and data science techniques to make decisions and survive.

### Five Survival Missions

1. Safe Zone Recon — Sampling and Sampling Bias
2. Quarantine Checkpoint — Classification and Confusion Matrix
3. Supply Drop Recovery — K-Means Clustering
4. Outbreak Diagnosis — Bayes' Theorem
5. Highway Convoy Escape — Linear Regression and Outlier Detection

### Key Features
- Interactive zombie survival gameplay
- Five data science learning missions
- Real-time resource management
- Health, food, medicine, and fuel tracking
- Interactive charts and visualizations
- Mission-based learning and decision-making
- Two-level hint system
- Performance-based grading
- Story-driven gameplay and sound effects

### Technologies
React 18, Vite, JavaScript, Tailwind CSS, Recharts, Lucide React, SVG, and Web Audio API.

[View Zombie Survival Game](./zombie-survival/README.md)

---

## Repository Structure

```text
SensorGaurd/
|
|-- Sensorgaurd/
|   |-- README.md
|   |-- app.py
|   |-- requirements.txt
|   |-- Data/
|   |-- Other source files
|
|-- zombie-survival/
|   |-- README.md
|   |-- package.json
|   |-- src/
|   |-- vite.config.js
|
|-- .gitignore
|-- README.md
```

---

## Technologies Used

### Data Science and Machine Learning
- Python
- Pandas and NumPy
- Scikit-learn
- Isolation Forest
- Statistical Analysis
- Streamlit
- Matplotlib and Seaborn

### Game Development
- JavaScript
- React
- Vite
- Tailwind CSS
- Recharts
- Web Audio API

---

## Learning Outcomes

These projects demonstrate practical experience in:

- Data preprocessing and exploratory analysis
- Machine learning and anomaly detection
- Statistical reasoning and visualization
- Interactive dashboard development
- Game-based educational application development
- Problem-solving and software development

---

## Project Documentation

For detailed information, installation instructions, implementation details, and project features, visit the individual project README files.

**SensorGuard:** [Project Documentation](./Sensorgaurd/README.md)

**Zombie Survival:** [Project Documentation](./zombie-survival/README.md)

---

## GitHub Repository

[SensorGaurd Repository](https://github.com/PurnaChandRaja05/SensorGaurd)
'@ | Set-Content -Path ".\README.md" -Encoding UTF8

 
