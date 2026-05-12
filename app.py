from collections import defaultdict

from flask import Flask, render_template
import json

import pandas as pd

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler


app = Flask(__name__)

# ensure that we can reload when we change the HTML / JS for debugging
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

COUNTRIES = ['Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Brazil', 'Bulgaria', 'Cameroon', 'Chile', 'China', 'Colombia', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Ecuador', 'Egypt, Arab Rep.', 'Eritrea', 'Ethiopia', 'France', 'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran, Islamic Rep.', 'Iraq', 'Ireland', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Lebanon', 'Malta', 'Mexico', 'Morocco', 'Pakistan', 'Peru', 'Philippines', 'Russian Federation', 'Syrian Arab Republic', 'Tunisia', 'Turkey', 'Ukraine']


@app.route('/')
def data():
    df = pd.read_csv("./agriRuralDevelopment_clean.csv")
    df = df[df['Name'].str.lower().isin([country.lower() for country in COUNTRIES])]


    result = defaultdict(lambda: defaultdict(list))

    for (name, code), group in df.groupby(['Name', 'Code']):
        result[code]["name"] = name
        for column in df.columns:
            if column not in ['Name', 'Code', 'Year']:
                result[code][column].extend(group[column].tolist())

    years = [int(y) for y in sorted(df['Year'].unique())]    
    columns = [column for column in df.columns if column not in ['Name', 'Code', 'Year']]

    # Select only the most recent year
    latest_df = df[df['Year'] == df['Year'].max()]

    # Scale features before PCA
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(latest_df.drop(columns=['Name', 'Code', 'Year']))


    X_pca = PCA(n_components=2).fit_transform(X_scaled)
    pca_df = pd.DataFrame({
        'Country': latest_df['Name'].values,
        "Code": latest_df['Code'].values,
        'PC1': X_pca[:, 0],
        'PC2': X_pca[:, 1]
    })

    return render_template("index.html", data=json.dumps(result), pca=json.dumps(pca_df.to_dict(orient='records')), years=list(years), indicators=list(columns))

if __name__ == '__main__':
    app.run()
