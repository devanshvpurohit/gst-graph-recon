# Quick Start: Deploy to Vercel

## 5-Minute Setup

### 1. Create Neo4j Cloud Database (2 min)

```bash
# Go to https://neo4j.com/cloud/aura/
# Sign up → Create Free Instance
# Save these credentials:
NEO4J_URI=bolt+s://xxxxxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxxxxxxxxxxxxxxx
```

### 2. Push to GitHub (1 min)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gst-graph-recon.git
git push -u origin main
```

### 3. Deploy to Vercel (2 min)

**Option A: CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option B: Dashboard**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Add environment variables (see below)
5. Click "Deploy"

### 4. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

```
NEO4J_URI=bolt+s://your-uri.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
VITE_API_URL=https://your-project.vercel.app
NODE_ENV=production
```

### 5. Done! 🎉

Your app is live at: `https://your-project.vercel.app`

## Troubleshooting

**Build fails?**
```bash
# Test locally first
npm run build:all
```

**Neo4j connection error?**
- Check credentials in Vercel environment variables
- Verify Neo4j instance is running
- Check IP whitelist in Neo4j Cloud (set to "Allow all")

**Upload not working?**
- File must be < 4.5MB (free tier limit)
- Check browser console for errors
- Check Vercel function logs

## File Structure

```
gst-graph-recon/
├── api/                    # Serverless functions
│   ├── health.ts
│   ├── ingest/
│   ├── reconcile/
│   ├── risk/
│   ├── dashboard/
│   └── middleware.ts
├── backend/                # Shared backend code
│   ├── src/
│   ├── dist/
│   └── package.json
├── frontend/               # React app
│   ├── src/
│   ├── dist/
│   └── package.json
├── vercel.json            # Vercel config
└── package.json           # Root config
```

## API Endpoints

All available at `https://your-project.vercel.app/api/`:

```
GET    /api/health
POST   /api/ingest/gstr1
POST   /api/ingest/gstr2b
POST   /api/ingest/einvoice
POST   /api/ingest/purchase-register
GET    /api/reconcile/:gstin/:period
GET    /api/risk
GET    /api/risk/:gstin
GET    /api/audit/:invoiceNo
GET    /api/dashboard/summary
GET    /api/analytics/network-risk
POST   /api/ai/analyze/vendor
POST   /api/ai/analyze/invoice
```

## Monitoring

- **Vercel Logs**: Dashboard → Deployments → Logs
- **Neo4j Logs**: Neo4j Cloud dashboard
- **Performance**: Vercel Analytics (built-in)

## Scaling

| Tier | Cost | Features |
|------|------|----------|
| Free | $0 | 4.5MB uploads, limited functions |
| Pro | $20/mo | 12MB uploads, more functions |
| Enterprise | Custom | Unlimited |

## Next Steps

1. ✅ Deploy to Vercel
2. Test all features
3. Set up custom domain
4. Configure monitoring
5. Plan scaling strategy

## Support

- Vercel: https://vercel.com/docs
- Neo4j: https://neo4j.com/docs/
- Issues: GitHub Issues
