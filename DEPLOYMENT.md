# 🚀 Deployment Guide - DataMind AI

Choose your deployment platform:

## Option 1: Render.com (Recommended - Easiest)

### Steps:
1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub account

2. **Connect GitHub**
   - Add your DataMind repo to Render
   - Click "New +" → "Web Service"

3. **Configure Service**
   - **Name**: datamind-ai
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `streamlit run app.py --server.port=$PORT --server.address=0.0.0.0`

4. **Add Environment Variables**
   - Key: `OPENAI_API_KEY`
   - Value: Your API key from platform.openai.com

5. **Deploy**
   - Click "Deploy"
   - Wait 3-5 minutes
   - Your app is live! 🎉

**Cost**: Free tier available (with limitations)

---

## Option 2: Railway.app

### Steps:
1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your DataMind repo

3. **Configure**
   - Add environment variables:
     - `OPENAI_API_KEY` = Your key
     - `PORT` = 8000 (default)

4. **Deploy**
   - Railway auto-deploys on git push
   - Check deployment logs

**Cost**: Generous free tier ($5/month credit)

---

## Option 3: Docker + Render/Railway

### Local Testing:
```bash
# Build image
docker build -t datamind:latest .

# Run locally
docker run -p 8501:8501 \
  -e OPENAI_API_KEY="your_key_here" \
  datamind:latest
```

### Deploy to Render:
```bash
# Build and push
docker build -t datamind:latest .
docker tag datamind:latest your_docker_user/datamind:latest
docker push your_docker_user/datamind:latest

# Then use image on Render
```

---

## Option 4: Local VPS (DigitalOcean/Linode)

### Steps:
```bash
# SSH into server
ssh root@your_server_ip

# Clone repo
git clone https://github.com/yourusername/data_mind.git
cd data_mind

# Setup
chmod +x setup.sh
./setup.sh

# Run with systemd
sudo nano /etc/systemd/system/datamind.service
```

### Service file:
```ini
[Unit]
Description=DataMind AI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/data_mind
ExecStart=/root/data_mind/venv/bin/streamlit run app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable datamind
sudo systemctl start datamind

# View logs
sudo journalctl -u datamind -f
```

---

## Environment Variables

Required:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional:
- `STREAMLIT_SERVER_HEADLESS=true`
- `STREAMLIT_LOGGER_LEVEL=info`

---

## Post-Deployment Checklist

- [ ] App loads without errors
- [ ] File upload works
- [ ] Charts render correctly
- [ ] AI chat responds
- [ ] PDF download works
- [ ] No API rate limits hit

---

## Troubleshooting

**Issue**: "OpenAI API key not provided"
- Add environment variable in deployment platform

**Issue**: "Module not found"
- Check requirements.txt is in repo
- Rebuild and redeploy

**Issue**: "Streamlit connection refused"
- Check PORT environment variable
- Verify firewall settings

---

## Monitor & Maintain

### Render:
- Dashboard: https://dashboard.render.com
- View logs, analytics, restart services

### Railway:
- Dashboard: https://railway.app/dashboard
- Real-time deployment logs

### Performance Tips:
- Cache data with `@st.cache_data`
- Use `st.session_state` for state
- Minimize API calls
- Use CDN for static assets

---

## Next Steps

1. Deploy to Render (5 min setup)
2. Share live link in GitHub README
3. Add to portfolio
4. Update LinkedIn with live demo

---

**Demo Link Format**:
```
https://datamind-ai.onrender.com
https://datamind-ai-railway.up.railway.app
```

Use this in your resume! 💼
