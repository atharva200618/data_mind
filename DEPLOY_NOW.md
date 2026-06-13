# 🚀 Ultimate DataMind Deployment Guide

This repository has been fully upgraded with the **Top 9 High-Value Features** you requested!

Here is how you launch the final application stack to the cloud.

---

### 1️⃣ Frontend → Vercel (Next.js)
The frontend configuration (`apps/web/vercel.json`) is already setup to automatically point to your Render backend.
1. Create a free account at [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to `Next.js`.
5. Set the **Root Directory** to `apps/web`.
6. Click **Deploy**. Vercel will build and host your highly-aesthetic UI.

---

### 2️⃣ Backend → Render (FastAPI & Streamlit)
We have updated `render.yaml` to deploy your dual-engine backend automatically.
1. Create an account at [Render](https://render.com).
2. Go to **Dashboard** -> **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml` and deploy **two** services:
   - `datamind-fastapi`: Your ML Engine powering the Next.js frontend.
   - `datamind-streamlit`: Your all-in-one Python dashboard.
5. *Don't forget to add your `OPENAI_API_KEY` in the Render dashboard environment variables.*

---

### 3️⃣ Database → Supabase (Shareable Reports)
To enable **Feature 3 (Real-Time Dashboard Sharing)**, we prepared `apps/api/app/db/supabase.py`.
1. Create a project at [Supabase](https://supabase.com).
2. Go to **Project Settings** -> **Database**.
3. Copy the **Connection String (URI)**.
4. Go to your Render `datamind-fastapi` service and add the environment variable:
   `SUPABASE_DB_URL` = `postgresql+asyncpg://postgres:[YOUR-PASSWORD]...`
5. *Now your FastAPI backend can save reports and generate unique sharing links!*

---

### 🎉 All 9 Features Executed
* **Feature 1:** AI Analyst Chat is live (Tab 3).
* **Feature 2:** Automated Insights instantly generate on CSV upload.
* **Feature 3:** Real-time sharing DB logic built via Supabase.
* **Feature 4:** Explainable AI (Feature Importance) added to the ML Workbench.
* **Feature 5:** Natural Language ETL executes safely directly on your Pandas dataframe.
* **Feature 6:** Advanced Vis (Pair Plots, Heatmaps, 3D Scatters) fully operational.
* **Feature 7:** Model Deployment API automatically exported after training.
* **Feature 8:** Executive AI Reports generated via GPT-4o in the Export Hub.
* **Feature 9:** Cloud configurations (`vercel.json`, `render.yaml`) completely finalized.
