"""
Example Data Analysis Script
This demonstrates basic data analysis using pandas
"""

import pandas as pd
import numpy as np

# Generate sample data
np.random.seed(42)
dates = pd.date_range('2024-01-01', periods=100)
data = {
    'date': dates,
    'sales': np.random.randint(100, 1000, 100),
    'customers': np.random.randint(10, 100, 100),
    'region': np.random.choice(['North', 'South', 'East', 'West'], 100)
}

# Create DataFrame
df = pd.DataFrame(data)

# Basic analysis
print("Dataset Overview:")
print(df.head())
print("\nSummary Statistics:")
print(df.describe())

# Group by region
region_summary = df.groupby('region').agg({
    'sales': ['sum', 'mean'],
    'customers': ['sum', 'mean']
})

print("\nRegion Summary:")
print(region_summary)

# Calculate metrics
df['revenue_per_customer'] = df['sales'] / df['customers']
df['rolling_avg_sales'] = df['sales'].rolling(window=7).mean()

# Top performing days
top_days = df.nlargest(10, 'sales')[['date', 'sales', 'region']]
print("\nTop 10 Sales Days:")
print(top_days)

# Export results
df.to_csv('sales_analysis.csv', index=False)
print("\nAnalysis complete! Results saved to 'sales_analysis.csv'")