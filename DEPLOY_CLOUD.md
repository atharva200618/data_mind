# 🌐 DataMind AI — Cloud Deployment Guide

## Overview

| Service | Role | Free Tier |
|---------|------|-----------|
| **Render** | Streamlit App Backend | 750 hrs/month |
| **Vercel** | Static Landing Page | Unlimited |
| **Supabase** | Database (optional) | 500MB |

---

## 🚀 Option 1: Deploy to Render (Recommended)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "feat: DataMind AI with 9 features"
git remote add origin https://github.com/YOUR_USERNAME/data-mind.git
git push -u origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `streamlit run app.py --server.port $PORT --server.address 0.0.0.0`
4. Add Environment Variable: `OPENAI_API_KEY` = your key

### Step 3: Your app will be live at:
```
https://data-mind.onrender.com
```

> **Note**: Free tier spins down after 15 minutes of inactivity. Upgrade to Starter ($7/mo) for always-on.

---

## ⚡ Option 2: Deploy to Railway

### One-Command Deploy
```bash
npm install -g @railway/cli
railway login
railway new
railway up
railway domain
```

### Set environment variables:
```bash
railway variables set OPENAI_API_KEY=your_key_here
```

---

## 🔧 Option 3: Docker Deployment

### Build & Run Locally
```bash
docker build -t datamind-ai .
docker run -p 8501:8501 -e OPENAI_API_KEY=your_key datamind-ai
```

### Push to Docker Hub
```bash
docker tag datamind-ai YOUR_USERNAME/datamind-ai:latest
docker push YOUR_USERNAME/datamind-ai:latest
```

### Deploy on any VPS (DigitalOcean, AWS EC2, etc.)
```bash
docker pull YOUR_USERNAME/datamind-ai:latest
docker run -d -p 80:8501 -e OPENAI_API_KEY=your_key --name datamind YOUR_USERNAME/datamind-ai:latest
```

---

## 🔌 Prediction API Deployment

The FastAPI server (`api_server.py`) can be deployed separately:

### Option A: Same Render instance (background thread)
The "Deploy API" tab in the app launches it automatically on port 8001.

### Option B: Separate service
```bash
# On any server with Python:
pip install fastapi uvicorn
uvicorn api_server:app --host 0.0.0.0 --port 8001 --reload
```

### Option C: Railway (FastAPI)
```bash
# Create a new Railway service pointing to api_server.py
# Start command: uvicorn api_server:app --host 0.0.0.0 --port $PORT
```

---

## 🗄️ Optional: Supabase for Shared Reports

If you want reports to persist via a database link:

### Setup
```bash
pip install supabase
```

### Create a `.env` addition:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Usage in app
```python
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Save report
result = supabase.table("reports").insert({"html": html_content, "created_at": "now()"}).execute()
report_id = result.data[0]['id']
share_url = f"https://your-app.onrender.com/report/{report_id}"
```

---

## ✅ Pre-Deployment Checklist

- [ ] `requirements.txt` is up to date
- [ ] `.env` has `OPENAI_API_KEY` set
- [ ] `render.yaml` is configured (see existing file)
- [ ] GitHub repo is public or connected to Render
- [ ] Test locally: `streamlit run app.py`
- [ ] Verify all 8 tabs load without errors

---

## 🔒 Security Notes

- **Never commit** `.env` files (already in `.gitignore`)
- API key is stored in Streamlit session state only (memory, never disk)
- For production: use Render's Secret Files instead of env vars
- The prediction API has CORS enabled — restrict in production:
  ```python
  allow_origins=["https://your-app.onrender.com"]
  ```
