import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

print("SensorGuard - Libraries imported successfully!")

# Column names
columns = [
    'date', 'time', 'epoch', 'moteid',
    'temperature', 'humidity', 'light', 'voltage'
]

# Load dataset
df = pd.read_csv(
    'Data/data.txt',
    sep=r'\s+',
    header=None,
    names=columns
)

print("Dataset loaded successfully!")

# Display first five records
print(df.head())
# Dataset dimensions
print("\nDataset Shape:", df.shape)

print("Total readings:", len(df))

print("Total columns:", len(df.columns))

# Number of unique sensors
print("Number of sensors:", df['moteid'].nunique())