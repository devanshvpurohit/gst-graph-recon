# Quick Start Guide

Get the GST Reconciliation Engine with Gemma AI running in 5 minutes.

## Prerequisites

- **Ollama** installed (https://ollama.ai)
- **Docker & Docker Compose** installed
- **Git** for cloning the repository

## Step 1: Install Ollama & Gemma Model

```bash
# macOS
brew install ollama

# Start Ollama service (keep this running)
ollama serve

# In another terminal, pull Gemma 3:1B model
ollama pull gemma:3b

# Verify model is installed
ollama list
# Should show: gemma:3b    2.0 GB
```

**Keep the `ollama serve` terminal open while running the application.**

## Step 2: Start the Application

```bash
# Clone repository (if not already done)
git clone https://github.com/devanshvpurohit/gst-graph-recon.git
cd gst-graph-recon

# Start all services with Docker Compose
docker-compose up --build

# Wait for services to start (2-3 minutes)
# You'll see: "gst-backend | Server running on port 8000"
```

## Step 3: Access the Application

Open your browser and navigate to:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Neo4j Browser**: http://localhost:7474

## Step 4: Test AI Features

### On Dashboard (Home Page)
1. Navigate to http://localhost:3000
2. Scroll down to see **"🤖 AI-Powered Insights (Gemma 3:1B)"** section
3. You should see 4 insight cards with AI analysis

### On Data Editor
1. Navigate to http://localhost:3000/data-editor
2. Click **"Analyze Risk with ML Model"** button
3. Wait 5-15 seconds for analysis
4. You'll see:
   - ML risk score and factors
   - **🤖 AI Analysis (Gemma 3:1B)** section with Gemma's reasoning
   - Success factors and recommendations

## Troubleshooting

### "Ollama not available" error
- Ensure `ollama serve` is running in a terminal
- Check: `curl http://localhost:11434/api/tags`

### "Model not found" error
- Run: `ollama pull gemma:3b`
- Wait for download to complete

### Docker containers won't start
- Ensure Ollama is running first
- Check Docker is running: `docker ps`
- View logs: `docker-compose logs -f`

### AI analysis is slow
- First request takes longer (model loading)
- Subsequent requests are faster
- Ensure your system has 4GB+ RAM available

## What's Included

✅ **GST Reconciliation Engine**
- 95 invoices with 15 suppliers
- ML risk analysis with 8 validation checks
- Network graph visualization

✅ **Gemma 3:1B AI Integration**
- Risk analysis and compliance assessment
- Audit explanations with reasoning
- Actionable recommendations
- Dashboard insights

✅ **File Upload**
- Support for GSTR-1, GSTR-2B, E-Invoice, Purchase Register
- Drag-and-drop interface

✅ **Data Editor**
- Mutable invoice data
- Real-time graph updates
- Combined ML + AI analysis

## Next Steps

1. **Explore Dashboard**: View AI insights and KPIs
2. **Edit Data**: Go to Data Editor and modify invoices
3. **Analyze Risk**: Click "Analyze Risk with ML Model" to see AI analysis
4. **Upload Files**: Use Upload page to add your own GST data
5. **Deploy**: See `README_VERCEL.md` for Vercel deployment

## Documentation

- **AI Integration**: See `AI_INTEGRATION_GUIDE.md`
- **Data Editor**: See `DATA_EDITOR_GUIDE.md`
- **File Upload**: See `UPLOAD_GUIDE.md`
- **Vercel Deployment**: See `README_VERCEL.md`

## Support

For detailed information, see:
- `AI_INTEGRATION_GUIDE.md` - Complete AI setup and troubleshooting
- `docker-compose.yml` - Service configuration
- `backend/src/services/ai.ts` - AI service implementation
- `api/ai/analyze.ts` - API endpoint

---

**Ready to go!** 🚀

Start with `ollama serve` and `docker-compose up --build`, then open http://localhost:3000

