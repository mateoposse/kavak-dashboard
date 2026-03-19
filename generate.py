#!/usr/bin/env python3
"""
Kavak Analytics — Static Dashboard Generator

1. Starts the existing kavak-dashboard backend
2. Fetches all data via the API (reuses all backend logic)
3. Injects data into the pre-built React app (dist/)
4. Copies the result to this repo root → ready to push to GitHub Pages
"""

import os
import json
import sys
import re
import subprocess
import time
import shutil
from datetime import date, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Paths
STATIC_DIR   = Path(__file__).parent
FRONTEND_DIR = STATIC_DIR / "frontend"
DIST_DIR     = FRONTEND_DIR / "dist"
BACKEND_DIR  = Path("/Users/mateopossemolina/Documents/kavak-dashboard/backend")

BACKEND_PORT = 8001
BASE_URL     = f"http://localhost:{BACKEND_PORT}"
USERNAME     = "kavak"
PASSWORD     = "kavak2025"

# Date range: last 30 days (same as app default)
DATE_TO   = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
DATE_FROM = (date.today() - timedelta(days=30)).strftime("%Y-%m-%d")


# ── Backend lifecycle ──────────────────────────────────────────────────────────

def start_backend():
    print(f"  Starting backend on port {BACKEND_PORT}…")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--port", str(BACKEND_PORT), "--host", "127.0.0.1"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Wait up to 30s for it to be ready
    for i in range(30):
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=2)
            if r.status_code == 200:
                print(f"  Backend ready (took {i+1}s)")
                return proc
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("Backend failed to start after 30s")


def stop_backend(proc):
    if proc:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
    print("  Backend stopped")


# ── API helpers ────────────────────────────────────────────────────────────────

def get_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def api_get(path, token, params=None):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(
        f"{BASE_URL}/api{path}", headers=headers, params=params, timeout=120
    )
    r.raise_for_status()
    return r.json()


# ── Data fetching ──────────────────────────────────────────────────────────────

def fetch_all(token):
    data = {}
    steps = [
        # Sales / Purchase dashboards (last 30d)
        ("dashboard_Sale",
         "/data/dashboard",
         {"date_from": DATE_FROM, "date_to": DATE_TO, "campaign_type": "Sale"}),
        ("dashboard_Purchase",
         "/data/dashboard",
         {"date_from": DATE_FROM, "date_to": DATE_TO, "campaign_type": "Purchase"}),

        # Overview (last 10 days) — all group_by variants
        ("overview_Purchase_general",  "/data/overview",
         {"campaign_type": "Purchase", "days": 10, "group_by": "general"}),
        ("overview_Purchase_channel",  "/data/overview",
         {"campaign_type": "Purchase", "days": 10, "group_by": "channel"}),
        ("overview_Purchase_campaign", "/data/overview",
         {"campaign_type": "Purchase", "days": 10, "group_by": "campaign"}),
        ("overview_Sale_general",      "/data/overview",
         {"campaign_type": "Sale", "days": 10, "group_by": "general"}),
        ("overview_Sale_channel",      "/data/overview",
         {"campaign_type": "Sale", "days": 10, "group_by": "channel"}),
        ("overview_Sale_campaign",     "/data/overview",
         {"campaign_type": "Sale", "days": 10, "group_by": "campaign"}),

        # Weekly
        ("weekly_Purchase", "/data/weekly", {"campaign_type": "Purchase"}),
        ("weekly_Sale",     "/data/weekly", {"campaign_type": "Sale"}),

        # Charts (FunnelChart)
        ("charts_Sale",     "/data/charts",  {"campaign_type": "Sale"}),
        ("charts_Purchase", "/data/charts",  {"campaign_type": "Purchase"}),

        # Waterfall
        ("waterfall_Sale",     "/data/waterfall", {"campaign_type": "Sale"}),
        ("waterfall_Purchase", "/data/waterfall", {"campaign_type": "Purchase"}),

        # Cost Heatmap (campaign daily breakdown)
        ("cost_heatmap_Sale",
         "/data/cost-heatmap",
         {"date_from": DATE_FROM, "date_to": DATE_TO, "campaign_type": "Sale"}),
        ("cost_heatmap_Purchase",
         "/data/cost-heatmap",
         {"date_from": DATE_FROM, "date_to": DATE_TO, "campaign_type": "Purchase"}),

        # Inventory
        ("inventory",         "/data/inventory",         None),
        ("inventory_weekly",  "/data/inventory_weekly",  None),

        # Rotation
        ("rotation", "/rotation/summary", None),

        # Kavak Crédito — campaigns (Meta + Google Ads)
        ("credito_campaigns",
         "/credito/campaigns-daily",
         {"date_from": DATE_FROM, "date_to": DATE_TO}),

        # Kavak Crédito — GA4 funnel
        ("ga4_credito_funnel",
         "/ga4-credito/funnel-daily",
         {"date_from": DATE_FROM, "date_to": DATE_TO}),
    ]

    for i, (key, path, params) in enumerate(steps, 1):
        print(f"  [{i:2d}/{len(steps)}] {key}…", end="", flush=True)
        try:
            data[key] = api_get(path, token, params)
            print(" ✓")
        except Exception as e:
            print(f" ✗ ({e})")
            data[key] = None

    data["__updated__"] = date.today().strftime("%d %b %Y")
    return data


# ── Inject data into built HTML ────────────────────────────────────────────────

def inject_data(data: dict):
    index_html = DIST_DIR / "index.html"
    if not index_html.exists():
        raise FileNotFoundError(f"dist/index.html not found: {DIST_DIR}")

    content = index_html.read_text(encoding="utf-8")

    json_str = json.dumps(data, ensure_ascii=False, default=str)
    inject = (
        "<script>\n"
        f"window.__STATIC_DATA__ = {json_str};\n"
        "document.addEventListener('DOMContentLoaded', function() {\n"
        "  var el = document.getElementById('static-updated-ts');\n"
        "  if (el) el.textContent = 'Updated: ' + (window.__STATIC_DATA__.__updated__ || '—');\n"
        "});\n"
        "</script>"
    )

    # Replace any existing injection
    if "window.__STATIC_DATA__" in content:
        content = re.sub(
            r"<script>\s*window\.__STATIC_DATA__[\s\S]*?</script>",
            inject,
            content,
        )
    else:
        content = content.replace("</head>", inject + "\n</head>")

    index_html.write_text(content, encoding="utf-8")
    kb = index_html.stat().st_size / 1024
    print(f"  Injected {kb:.0f} KB into dist/index.html")


# ── Copy dist to repo root ─────────────────────────────────────────────────────

def copy_dist_to_root():
    for item in DIST_DIR.iterdir():
        dest = STATIC_DIR / item.name
        if item.name in ("generate.py", ".env", ".gitignore", "requirements.txt", "frontend"):
            continue  # never overwrite these
        if item.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)
    print(f"  Files copied to {STATIC_DIR}")


# ── Optional: build React frontend ────────────────────────────────────────────

def build_frontend():
    node_bin = Path.home() / ".nvm/versions/node/v25.8.0/bin"
    env = {**os.environ, "PATH": str(node_bin) + ":" + os.environ.get("PATH", "")}
    print("  Building React app…")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=FRONTEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stderr[-2000:])
        raise RuntimeError("React build failed")
    print("  Build complete ✓")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    rebuild = "--rebuild" in sys.argv

    print("=" * 55)
    print("Kavak Static Dashboard Generator")
    print(f"Date range: {DATE_FROM} → {DATE_TO}")
    print("=" * 55)

    # Step 1: Build React app if needed
    if rebuild or not DIST_DIR.exists():
        print("\n[BUILD] Compiling React app…")
        build_frontend()
    else:
        print(f"\n[BUILD] Using existing dist/ (run with --rebuild to force)")

    # Step 2: Start backend and fetch data
    print("\n[DATA] Fetching data from Redshift via backend…")
    proc = None
    try:
        proc = start_backend()
        token = get_token()
        data = fetch_all(token)
    finally:
        stop_backend(proc)

    # Step 3: Inject data into built HTML
    print("\n[INJECT] Embedding data into index.html…")
    inject_data(data)

    # Step 4: Copy dist to repo root
    print("\n[COPY] Copying dist/ to repo root…")
    copy_dist_to_root()

    print("\n" + "=" * 55)
    print(f"✓ Done! Generated {date.today()}")
    print(f"  Open: {STATIC_DIR / 'index.html'}")
    print("=" * 55)


if __name__ == "__main__":
    main()
