# GST Recon - Vercel Deployment

Deploy the complete GST Reconciliation Engine to Vercel with Neo4j Cloud.

## What's Included

✅ **Frontend** - React + Vite (Vercel Static)
✅ **Backend** - Node.js Serverless Functions (Vercel Functions)
✅ **Database** - Neo4j Cloud (Managed)
✅ **File Uploads** - Drag & drop interface
✅ **Real-time Analytics** - Dashboard & Risk scoring

## Quick Deploy

### 1️⃣ Prerequisites

- GitHub account
- Vercel account (free)
- Neo4j Cloud account (free)

### 2️⃣ Create Neo4j Database

1. Go to https://neo4j.com/cloud/aura/
2. Sign up → Create Free Instance
3. Copy credentials:
   ```
   URI: bolt+s://xxxxxxxx.databases.neo4j.io
   User: neo4j
   Password: xxxxxxxxxxxxxxxx
   ```

### 3️⃣ Deploy to Vercel

**Using Vercel CLI:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Using Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your GitHub repository
4. Click "Deploy"

### 4️⃣ Configure Environment

In Vercel Dashboard → Project Settings → Environment Variables:

```env
NEO4J_URI=bolt+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
VITE_API_URL=https://your-project.vercel.app
NODE_ENV=production
```

### 5️⃣ Done! 🚀

Your app is live at: `https://your-project.vercel.app`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel                           │
├─────────────────────────────────────────────────────┤
│  Frontend (React)      │  API (Serverless)          │
│  - Dashboard           │  - /api/ingest/*           │
│  - Upload Bills        │  - /api/reconcile/*        │
│  - Reconciliation      │  - /api/risk/*             │
│  - Vendor Risk         │  - /api/audit/*            │
└─────────────────────────────────────────────────────┘
              ↓
    ┌──────────────────────┐
    │   Neo4j Cloud        │
    │   (Managed DB)       │
    └──────────────────────┘
```

## Features

### Dashboard
- Real-time ITC reconciliation metrics
- Vendor risk distribution
- Invoice processing status
- Network analysis

### Upload Bills
- Drag & drop file upload
- Support for GSTR-1, GSTR-2B, E-Invoice, Purchase Register
- JSON/CSV/Excel formats
- Real-time processing feedback

### Reconciliation
- ITC chain validation
- Mismatch detection
- Root cause analysis
- Audit trail generation

### Vendor Risk
- Risk scoring algorithm
- Network analysis
- Community detection
- Suspicious pattern identification

## API Endpoints

All endpoints available at `https://your-project.vercel.app/api/`:

### Ingestion
```
POST /api/ingest/gstr1              Upload GSTR-1 returns
POST /api/ingest/gstr2b             Upload GSTR-2B returns
POST /api/ingest/einvoice           Upload e-invoice data
POST /api/ingest/purchase-register  Upload purchase register
POST /api/ingest/upload/gstr1       Upload GSTR-1 file
POST /api/ingest/upload/gstr2b      Upload GSTR-2B file
POST /api/ingest/upload/einvoice    Upload e-invoice file
POST /api/ingest/upload/purchase-register  Upload purchase file
```

### Analysis
```
GET  /api/reconcile/:gstin/:period  Run ITC reconciliation
GET  /api/risk                      Get all vendor risks
GET  /api/risk/:gstin               Get vendor risk details
GET  /api/audit/:invoiceNo          Get audit trail
GET  /api/analytics/network-risk    Get network analysis
GET  /api/dashboard/summary         Get dashboard data
```

### AI Analysis
```
POST /api/ai/analyze/vendor         AI vendor analysis
POST /api/ai/analyze/invoice        AI invoice analysis
```

## File Upload Limits

| Tier | Limit | Cost |
|------|-------|------|
| Free | 4.5MB | $0 |
| Pro | 12MB | $20/mo |
| Enterprise | Unlimited | Custom |

**Tip:** Split large files into smaller batches for free tier.

## Monitoring

### Vercel Logs
```bash
vercel logs
# or via Dashboard → Deployments → Logs
```

### Neo4j Monitoring
- Go to Neo4j Cloud dashboard
- View query performance
- Monitor storage usage

### Performance Metrics
- Vercel Analytics (built-in)
- Function execution time
- Database query time

## Troubleshooting

### Build Fails
```bash
# Test locally
npm run build:all

# Check logs
vercel logs
```

### Neo4j Connection Error
- Verify credentials in environment variables
- Check Neo4j instance is running
- Ensure IP whitelist allows all (Neo4j Cloud settings)

### Upload Fails
- Check file size (< 4.5MB for free tier)
- Verify JSON format
- Check browser console for errors

### Slow Performance
- Neo4j free tier has limited resources
- Consider upgrading to paid tier
- Optimize database queries

## Scaling

### For Production

**Upgrade Vercel:**
- Move to Pro tier ($20/mo)
- Increase function timeout
- Enable edge caching

**Upgrade Neo4j:**
- Move to paid tier ($50+/mo)
- Increase memory/storage
- Enable backups

**Optimize:**
- Add Redis caching
- Implement query optimization
- Use connection pooling

## Cost Breakdown

| Service | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Vercel | $0 | $20/mo | Custom |
| Neo4j | $0 | $50+/mo | Custom |
| **Total** | **$0** | **$70+/mo** | **Custom** |

## Custom Domain

1. Go to Vercel Dashboard
2. Project Settings → Domains
3. Add your domain
4. Follow DNS configuration

## Rollback

To revert to a previous deployment:

1. Vercel Dashboard → Deployments
2. Find previous deployment
3. Click "..." → "Promote to Production"

## Environment Variables

### Required
```env
NEO4J_URI=bolt+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

### Optional
```env
VITE_API_URL=https://your-project.vercel.app
NODE_ENV=production
OLLAMA_URL=http://localhost:11434  # For AI features
```

## Local Development

```bash
# Install dependencies
npm install

# Set up .env
cp frontend/.env.example frontend/.env.local

# Run locally
npm run dev

# Build for production
npm run build:all
```

## Security Checklist

- [ ] Environment variables set (not in code)
- [ ] Neo4j password is strong
- [ ] IP whitelist configured
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] Rate limiting configured
- [ ] Sensitive data not logged

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Neo4j Docs:** https://neo4j.com/docs/
- **GitHub Issues:** Report bugs

## Next Steps

1. ✅ Deploy to Vercel
2. Test all features
3. Set up custom domain
4. Configure monitoring
5. Plan scaling strategy
6. Set up backups

## FAQ

**Q: Can I use my own database?**
A: Yes, update NEO4J_URI to your database URL.

**Q: How do I update the code?**
A: Push to GitHub, Vercel auto-deploys.

**Q: Can I use a custom domain?**
A: Yes, configure in Vercel Dashboard.

**Q: What's the uptime SLA?**
A: Vercel: 99.95%, Neo4j Cloud: 99.9%

**Q: How do I backup data?**
A: Neo4j Cloud handles backups automatically.

## License

MIT
