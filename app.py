"""
InfoVis VU 2026 - Exercise 2
Flask backend for the linked-views visualization.

Responsibilities:
    Task 1: Load the CSV, filter to the COUNTRIES list, expose the data.
    Task 2: Compute a PCA (with prior feature scaling) on the most recent
            year and expose the 2D coordinates plus auxiliary information
            (explained variance, feature loadings) to the client.

The full filtered data set is sent to the client via Jinja2 so that the
frontend can render the choropleth map and the time-series view for any
year / indicator without further round trips.
"""

import json

import numpy as np
import pandas as pd
from flask import Flask, render_template
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

# -----------------------------------------------------------------------------
# Flask configuration
# -----------------------------------------------------------------------------
app = Flask(__name__)

# Ensure that we can reload when we change the HTML / JS for debugging
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.config["TEMPLATES_AUTO_RELOAD"] = True

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------
DATA_FILE = "static/data/agriRuralDevelopment_clean.csv"

# Countries to keep (as required by Task 1).
COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Angola", "Argentina", "Armenia",
    "Australia", "Austria", "Azerbaijan", "Brazil", "Bulgaria", "Cameroon",
    "Chile", "China", "Colombia", "Croatia", "Cuba", "Cyprus",
    "Czech Republic", "Ecuador", "Egypt, Arab Rep.", "Eritrea", "Ethiopia",
    "France", "Germany", "Ghana", "Greece", "India", "Indonesia",
    "Iran, Islamic Rep.", "Iraq", "Ireland", "Italy", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Lebanon", "Malta", "Mexico", "Morocco",
    "Pakistan", "Peru", "Philippines", "Russian Federation",
    "Syrian Arab Republic", "Tunisia", "Turkey", "Ukraine",
]

# Columns that are NOT part of the feature space.
META_COLUMNS = ["Name", "Code", "Year"]


# -----------------------------------------------------------------------------
# Data loading and preprocessing
# -----------------------------------------------------------------------------
def load_filtered_data() -> pd.DataFrame:
    """Task 1 - Load the CSV and filter rows to the required country list."""
    df = pd.read_csv(DATA_FILE)
    df = df[df["Name"].isin(COUNTRIES)].copy()
    # Make sure the order is deterministic for downstream processing.
    df.sort_values(["Name", "Year"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def compute_pca(df: pd.DataFrame) -> dict:
    """
    Task 2 - Compute a 2D PCA on the most recent year only.

    The feature matrix is standardised (zero mean, unit variance) before
    the projection so that variables on very different scales (e.g.,
    population vs. percentage) do not dominate the result.

    Returns a dict that contains:
        * year                : the year used for the projection
        * features            : list of feature names that were used
        * points              : list of {Name, Code, x, y} dicts
        * explained_variance  : explained variance ratio of PC1 / PC2
        * loadings            : feature loadings (length-2 vector per feature)
    """
    most_recent_year = int(df["Year"].max())
    recent = df[df["Year"] == most_recent_year].copy()

    # Numeric feature columns only.
    feature_cols = [
        c for c in recent.columns
        if c not in META_COLUMNS and pd.api.types.is_numeric_dtype(recent[c])
    ]

    # The cleaned CSV does not contain NaNs, but we still defend against it
    # so the code stays robust.
    feature_matrix = recent[feature_cols].fillna(recent[feature_cols].mean())

    # 1. Standardise (essential for PCA on heterogeneous units).
    scaler = StandardScaler()
    scaled = scaler.fit_transform(feature_matrix.values)

    # 2. Project to 2 dimensions.
    pca = PCA(n_components=2)
    coords = pca.fit_transform(scaled)

    points = [
        {
            "Name": row["Name"],
            "Code": row["Code"],
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
        }
        for i, (_, row) in enumerate(recent.iterrows())
    ]

    return {
        "year": most_recent_year,
        "features": feature_cols,
        "points": points,
        "explained_variance": pca.explained_variance_ratio_.tolist(),
        "loadings": pca.components_.T.tolist(),  # one [pc1, pc2] per feature
    }


def dataframe_to_records(df: pd.DataFrame) -> list:
    """Convert the filtered DataFrame to a JSON-serialisable list."""
    # Replace NaN/Inf with None so json.dumps does not produce 'NaN' literals.
    safe = df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(df), None)
    return safe.to_dict(orient="records")


# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------
@app.route("/")
def index():
    """Render the single page with the filtered data and PCA result."""
    df = load_filtered_data()
    pca_result = compute_pca(df)

    # Indicator list (everything that is not metadata).
    indicators = [c for c in df.columns if c not in META_COLUMNS]

    payload = {
        "countries": COUNTRIES,
        "indicators": indicators,
        "year_min": int(df["Year"].min()),
        "year_max": int(df["Year"].max()),
        "data": dataframe_to_records(df),
        "pca": pca_result,
    }

    # Pass everything as one JSON blob; the frontend parses it once.
    return render_template("index.html", payload=json.dumps(payload))


if __name__ == "__main__":
    app.run(debug=True)
