# Cortex

Running biomechanics analysis platform. Processes gait sensor data from Nucleus insoles and Garmin watches, then serves interactive dashboards per athlete.

## Architecture

- **`data/`** -- Raw session CSVs organized by athlete
- **`pipeline/`** -- Python scripts that process CSVs into structured JSON
- **`site/`** -- React + Vite web app (deployed to GitHub Pages)
- **`.github/workflows/`** -- CI/CD automation

## Quick Start

```bash
# 1. Process raw data into JSON
cd pipeline
pip install -r requirements.txt
python process.py

# 2. Run the web app locally
cd ../site
npm install
npm run dev
```

## Adding New Session Data

Drop CSV files into `data/athletes/{name}/sessions/` and push. GitHub Actions will automatically reprocess the data and redeploy the site.

## URL Structure

- `/` -- Summary dashboard (all athletes)
- `/athlete/{uuid}` -- Individual athlete page (shareable link)
