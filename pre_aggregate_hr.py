import pandas as pd
import numpy as np
import os

HR_FILE = "/Users/kikkiliu/physionet.org/files/mcphases/data/heart_rate.csv"
OUT_FILE = "./data/daily_hr_volatility.csv"
os.makedirs("./data", exist_ok=True)

JOIN_KEYS = ["id", "day_in_study", "study_interval"]

print(f"Pre-aggregating {HR_FILE} in chunks...")

chunks = pd.read_csv(HR_FILE, chunksize=1000000)
aggs = []

for i, chunk in enumerate(chunks):
    print(f" Processing chunk {i+1}...")
    # Group by the keys and get stats for this chunk
    chunk_agg = chunk.groupby(JOIN_KEYS)["bpm"].agg(["sum", "count", "max", "min", "std"])
    aggs.append(chunk_agg)

print("Combining chunk results...")
full_agg = pd.concat(aggs)

# Final aggregation because a participant's day might be split across chunks
final = full_agg.groupby(level=JOIN_KEYS).agg({
    "sum": "sum",
    "count": "sum",
    "max": "max",
    "min": "min",
    "std": "mean" # approximation for std across chunks, or we could do more complex var math
})

# Recalculate mean
final["bpm_mean"] = final["sum"] / final["count"]
final = final.rename(columns={"max": "bpm_max", "min": "bpm_min", "std": "bpm_std"})
final = final.drop(columns=["sum", "count"]).reset_index()

final.to_csv(OUT_FILE, index=False)
print(f"Success! Saved daily heart rate volatility to {OUT_FILE}")
