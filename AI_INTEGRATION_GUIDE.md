# AI Integration Guide - Gemma 3:1B with GST Reconciliation Engine

## Overview

The GST Reconciliation Engine now includes **Gemma 3:1B AI model integration** via Ollama for intelligent analysis of GST transactions. The AI provides:

- **Risk Analysis**: Analyzes invoices for compliance issues
- **Audit Explanations**: Explains why specific invoices are flagged
- **Recommendations**: Provides actionable steps to reduce risk
- **Dashboard Insights**: Executive summary of reconciliation data

---

## Architecture

### Components

1. **Backend AI Service** (`backend/src/services/ai.ts`)
   - Core AI service with Gemma 3:1B integration
   - Functions: `analyzeRiskWithAI()`, `generateAuditExplanation()`, `generateRecommendations()`, `generateDashboardInsights()`
   - Ollama HTTP API integration with 30-second timeout

2. **API Endpoint** (`api/ai/analyze.ts`)
   - Serverless endpoint for Vercel deployment
   - Supports 4 analysis types: `risk`, `audit`, `recommendation`, `insights`
   - CORS-enabled with error handling

3. **Frontend Components**
   - **AIInsights.tsx**: Displays AI-generated insights on Dashboard
   - **DataEditor.tsx**: Shows both ML and AI analysis results
   - Dashboard: Includes AI insights section at top

### Data Flow

```
User Action
    ↓
Frontend Component (AIInsights / DataEditor)
    ↓
API Endpoint (/api/ai/analyze)
    ↓
Backend AI Service (ai.ts)
    ↓
Ollama HTTP API (localhost:11434)
    ↓
Gemma 3:1B Model
    ↓
Response → Frontend Display
```

---

## Prerequisites

### Required Software

1. **Ollama** - Download from https://ollama.ai
2. **Docker & Docker Compose** - For containerized deployment
3. **Node.js 18+** - For backend and frontend
4. **Neo4j** - Database (runs in Docker)

### Ollama Setup

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Start Ollama Service**
   ```bash
   ollama serve
   ```
   This starts Ollama on `http://localhost:11434`

3. **Pull Gemma 3:1B Model**
   ```bash
   ollama pull gemma:3b
   ```
   This downloads the ~2GB Gemma 3:1B model (one-time)

4. **Verify Model is Available**
   ```bash
   ollama list
   ```
   Should show: `gemma:3b    2.0 GB`

---

## Running the Application

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - Neo4j: http://localhost:7474
```

**Important**: Ollama must be running on your host machine before starting Docker Compose.

### Option 2: Local Development

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Backend
cd backend
npm install
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm install
npm run dev

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8000
```

---

## Features

### 1. Dashboard with AI Insights

**Location**: Home page (`/`)

The Dashboard displays:
- **AI-Powered Insights** (Gemma 3:1B)
  - Overall compliance status
  - Key risks and opportunities
  - Priority actions
- **KPI Cards**: Total ITC, Eligible ITC, High Risk ITC, Match Rate
- **Charts**: Reconciliation status, mismatch categories, top risky vendors
- **Network Graph**: Supplier-buyer relationships

**How it works**:
1. Page loads and fetches dashboard summary
2. AIInsights component calls `/api/ai/analyze` with `type: 'insights'`
3. Gemma analyzes the data and returns insights
4. Results displayed in 4 insight cards

### 2. Data Editor with AI Analysis

**Location**: Data Editor page (`/data-editor`)

Features:
- **Interactive Graph**: Visualize supplier-buyer network
- **Invoice Management**: Add, edit, delete invoices
- **ML Risk Analysis**: 8 validation checks
- **AI Analysis**: Gemma 3:1B provides reasoning
- **Recommendations**: Actionable steps to reduce risk

**How it works**:
1. User edits invoices and clicks "Analyze Risk with ML Model"
2. Frontend calls `/api/analyze/risk` for ML analysis
3. Frontend calls `/api/ai/analyze` with `type: 'risk'` for AI analysis
4. Results show:
   - ML risk score and factors
   - AI analysis from Gemma
   - Success factors and recommendations

### 3. AI Analysis Types

#### Risk Analysis
```javascript
POST /api/ai/analyze
{
  "type": "risk",
  "data": {
    "invoices": [...]
  }
}
```
Returns: Compliance assessment and red flags

#### Audit Explanation
```javascript
POST /api/ai/analyze
{
  "type": "audit",
  "data": {
    "invoiceNo": "INV001",
    "supplierGSTIN": "29AABCS1234F1Z5",
    "buyerGSTIN": "29BUYER001KA1Z5",
    "riskLevel": "HIGH",
    "status": "FLAGGED",
    "rootCause": ["Invalid IRN", "GST mismatch"]
  }
}
```
Returns: Why invoice is flagged and implications

#### Recommendations
```javascript
POST /api/ai/analyze
{
  "type": "recommendation",
  "data": {
    "riskScore": 0.75,
    "riskLevel": "HIGH",
    "reasoning": ["Invalid IRN", "GST mismatch"]
  }
}
```
Returns: 3-5 specific, actionable recommendations

#### Dashboard Insights
```javascript
POST /api/ai/analyze
{
  "type": "insights",
  "data": {
    "totalInvoices": 95,
    "matchedInvoices": 81,
    "mismatchedInvoices": 14,
    "totalITC": 1520000,
    "eligibleITC": 1300000,
    "highRiskITC": 220000
  }
}
```
Returns: Executive summary (2-3 sentences)

---

## Configuration

### Environment Variables

**Backend** (`.env` or `docker-compose.yml`):
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=gstrecon2025
PORT=8000
OLLAMA_URL=http://localhost:11434
```

**Frontend** (`.env.production`):
```
VITE_API_URL=http://localhost:8000
```

### Ollama Configuration

- **Model**: `gemma:3b` (Gemma 3:1B)
- **Endpoint**: `http://localhost:11434/api/generate`
- **Temperature**: 0.3 (analysis), 0.4 (recommendations)
- **Timeout**: 30 seconds
- **Stream**: Disabled (we use `stream: false`)

---

## Troubleshooting

### Issue: "Ollama not available" or "Connection refused"

**Solution**:
1. Ensure Ollama is running: `ollama serve`
2. Check Ollama is accessible: `curl http://localhost:11434/api/tags`
3. Verify Gemma model is installed: `ollama list`
4. If using Docker, ensure `OLLAMA_URL=http://host.docker.internal:11434`

### Issue: "Model not found" or "gemma:3b not available"

**Solution**:
1. Pull the model: `ollama pull gemma:3b`
2. Wait for download to complete (~2GB)
3. Verify: `ollama list`

### Issue: AI analysis returns empty or timeout

**Solution**:
1. Check Ollama logs: `ollama serve` (in terminal)
2. Increase timeout in `api/ai/analyze.ts` (currently 30s)
3. Check system resources (Gemma needs ~4GB RAM)
4. Restart Ollama: `pkill ollama && ollama serve`

### Issue: Frontend shows "AI service unavailable"

**Solution**:
1. Check backend is running: `curl http://localhost:8000/api/health`
2. Check API endpoint: `curl http://localhost:8000/api/ai/analyze` (should return 405 for GET)
3. Check browser console for CORS errors
4. Verify `VITE_API_URL` environment variable

### Issue: Docker container can't reach Ollama

**Solution**:
1. Use `host.docker.internal:11434` (already configured)
2. On Linux, use `--network host` or `172.17.0.1:11434`
3. Verify from container: `docker exec gst-backend curl http://host.docker.internal:11434/api/tags`

---

## Performance Notes

- **Gemma 3:1B**: ~2GB model, requires ~4GB RAM
- **Response Time**: 5-15 seconds per analysis (depends on system)
- **Batch Processing**: Analyzes up to 5 invoices per request
- **Caching**: No caching implemented (each request is fresh)

---

## Testing

### Manual Testing

1. **Test Ollama Connection**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Test AI Endpoint**
   ```bash
   curl -X POST http://localhost:8000/api/ai/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "type": "insights",
       "data": {
         "totalInvoices": 95,
         "matchedInvoices": 81,
         "mismatchedInvoices": 14,
         "totalITC": 1520000,
         "eligibleITC": 1300000,
         "highRiskITC": 220000
       }
     }'
   ```

3. **Test Frontend**
   - Navigate to http://localhost:3000
   - Check Dashboard for AI Insights section
   - Go to Data Editor and click "Analyze Risk with ML Model"
   - Verify AI analysis appears below ML results

### Automated Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

---

## Deployment

### Vercel Deployment

The application is configured for Vercel deployment:

1. **Frontend**: Deployed as static site
2. **Backend**: Deployed as serverless functions in `/api` directory
3. **Database**: Neo4j Cloud (requires setup)
4. **Ollama**: Must be accessible from Vercel (requires public endpoint or alternative)

**Note**: Ollama integration requires either:
- Self-hosted Ollama with public endpoint
- Alternative AI service (OpenAI, Anthropic, etc.)
- Serverless AI service (AWS Bedrock, Google Vertex AI, etc.)

See `README_VERCEL.md` for detailed deployment instructions.

---

## Next Steps

1. **Start Ollama**: `ollama serve`
2. **Pull Gemma Model**: `ollama pull gemma:3b`
3. **Start Application**: `docker-compose up --build`
4. **Access Dashboard**: http://localhost:3000
5. **Test AI Features**: Click on insights and analyze data

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker-compose logs -f`
3. Check Ollama status: `ollama list`
4. Verify network connectivity: `curl http://localhost:11434/api/tags`

---

## Files Reference

- **Backend AI Service**: `backend/src/services/ai.ts`
- **API Endpoint**: `api/ai/analyze.ts`
- **Frontend Component**: `frontend/src/components/AIInsights.tsx`
- **Data Editor**: `frontend/src/pages/DataEditor.tsx`
- **Dashboard**: `frontend/src/pages/Dashboard.tsx`
- **Docker Config**: `docker-compose.yml`
- **Environment**: `frontend/.env.production`, `backend/.env`

