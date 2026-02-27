# Vercel Deployment Guide - GST Recon

## Overview

This guide explains how to deploy the GST Recon application to Vercel with a cloud database.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite)  │  API Routes (Serverless)          │
│  - Dashboard            │  - /api/ingest/*                  │
│  - Upload               │  - /api/reconcile/*               │
│  - Reconciliation       │  - /api/risk/*                    │
│  - Vendor Risk          │  - /api/audit/*                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Neo4j Cloud     │
                    │  (Managed DB)    │
                    └──────────────────┘
```

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **GitHub Account** - For connecting your repository
3. **Neo4j Cloud Account** - Sign up at https://neo4j.com/cloud/aura/
4. **Node.js 18+** - For local development

## Step 1: Set Up Neo4j Cloud Database

1. Go to https://neo4j.com/cloud/aura/
2. Create a new AuraDB instance
3. Choose "Free" tier (4GB storage)
4. Note down:
   - **Connection URI** (bolt://...)
   - **Username** (neo4j)
   - **Password** (generated)

## Step 2: Prepare Repository

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gst-graph-recon.git
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build:all`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`

## Step 4: Set Environment Variables

In Vercel Dashboard:

1. Go to your project settings
2. Click "Environment Variables"
3. Add the following variables:

```
NEO4J_URI=bolt+s://YOUR_AURA_URI
NEO4J_USER=neo4j
NEO4J_PASSWORD=YOUR_PASSWORD
VITE_API_URL=https://your-project.vercel.app
NODE_ENV=production
```

## Step 5: Configure Backend for Serverless

The backend is automatically converted to serverless functions in the `/api` directory.

### Key Changes:
- All routes are converted to serverless functions
- File uploads use temporary storage (cleaned up after request)
- Database connections are pooled for efficiency

## Step 6: Deploy

1. Commit your changes:
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

2. Vercel will automatically deploy on push

3. Monitor deployment:
   - Go to Vercel Dashboard
   - Click your project
   - Watch the build logs

## Accessing Your App

After deployment:
- **Frontend**: https://your-project.vercel.app
- **API**: https://your-project.vercel.app/api/*
- **Health Check**: https://your-project.vercel.app/api/health

## API Endpoints

All endpoints are available at `https://your-project.vercel.app/api/`:

```
POST   /api/ingest/gstr1              - Upload GSTR-1
POST   /api/ingest/gstr2b             - Upload GSTR-2B
POST   /api/ingest/einvoice           - Upload E-Invoice
POST   /api/ingest/purchase-register  - Upload Purchase Register
GET    /api/reconcile/:gstin/:period  - Run reconciliation
GET    /api/risk/:gstin               - Get vendor risk
GET    /api/risk                      - Get all vendor risks
GET    /api/audit/:invoiceNo          - Get audit trail
GET    /api/analytics/network-risk    - Get network analysis
GET    /api/dashboard/summary         - Get dashboard data
POST   /api/ai/analyze/vendor         - AI vendor analysis
POST   /api/ai/analyze/invoice        - AI invoice analysis
```

## File Upload Limitations

Vercel has request size limits:
- **Free tier**: 4.5MB
- **Pro tier**: 12MB

For larger files:
1. Split uploads into smaller batches
2. Use streaming uploads
3. Consider upgrading to Pro tier

## Monitoring & Logs

1. **View Logs**:
   - Vercel Dashboard → Project → Deployments → Logs
   - Or use CLI: `vercel logs`

2. **Monitor Performance**:
   - Vercel Analytics (built-in)
   - Neo4j Cloud monitoring dashboard

3. **Error Tracking**:
   - Check Vercel function logs
   - Check Neo4j Cloud logs

## Troubleshooting

### "Neo4j connection failed"
- Verify NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in environment variables
- Check Neo4j Cloud instance is running
- Ensure IP whitelist allows Vercel IPs (usually "Allow all")

### "File upload fails"
- Check file size (must be < 4.5MB on free tier)
- Verify Content-Type header is multipart/form-data
- Check backend logs for detailed error

### "Build fails"
- Check build logs in Vercel Dashboard
- Ensure all dependencies are installed
- Verify TypeScript compilation: `npm run build:all`

### "Slow performance"
- Neo4j Cloud free tier has limited resources
- Consider upgrading to paid tier
- Optimize Cypher queries
- Add database indexes

## Scaling

### For Production:

1. **Upgrade Neo4j**:
   - Move from free to paid tier
   - Increase memory/storage
   - Enable backups

2. **Upgrade Vercel**:
   - Move from free to Pro tier
   - Increase function timeout
   - Enable edge caching

3. **Optimize**:
   - Add Redis for caching
   - Implement query optimization
   - Use database connection pooling

## Cost Estimation

**Monthly costs** (approximate):
- Vercel Free: $0 (or $20/month Pro)
- Neo4j Cloud Free: $0 (or $50+/month paid)
- **Total**: $0-70/month

## Rollback

To rollback to a previous deployment:

1. Go to Vercel Dashboard
2. Click your project
3. Go to "Deployments"
4. Find the previous deployment
5. Click "..." → "Promote to Production"

## Custom Domain

1. Go to Vercel Dashboard
2. Project Settings → Domains
3. Add your custom domain
4. Follow DNS configuration instructions

## CI/CD Pipeline

Vercel automatically:
- Builds on every push to main
- Runs preview deployments for PRs
- Deploys to production on merge

## Next Steps

1. Test all features in production
2. Set up monitoring and alerts
3. Configure custom domain
4. Plan scaling strategy
5. Set up backup strategy for Neo4j

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Neo4j Docs**: https://neo4j.com/docs/
- **GitHub Issues**: Report bugs in your repository

## Security Checklist

- [ ] Environment variables are set (not in code)
- [ ] Neo4j password is strong
- [ ] IP whitelist is configured in Neo4j
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place
- [ ] Sensitive data is not logged
