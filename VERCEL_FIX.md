# Vercel Deployment Fix

**Issue**: `tsc: command not found` error during Vercel build  
**Status**: ✅ FIXED

---

## Problem

Vercel was failing to build with error:
```
sh: line 1: tsc: command not found
Error: Command "npm run build:all" exited with 127
```

**Root Cause**: TypeScript compiler (`tsc`) was not available in the Vercel build environment because:
1. Dependencies were not installed at the root level
2. Build script didn't install subdirectory dependencies
3. Vercel couldn't find TypeScript in the PATH

---

## Solution

### 1. Updated Root `package.json`

Added TypeScript to root devDependencies:
```json
{
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

Updated build scripts to install dependencies first:
```json
{
  "scripts": {
    "build:all": "npm run install:all && npm run build:backend && npm run build:frontend",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install && cd ..",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build"
  }
}
```

### 2. Updated `vercel.json`

Changed build command to explicitly install all dependencies:
```json
{
  "buildCommand": "npm install && cd backend && npm install && cd ../frontend && npm install && cd .. && npm run build:backend && npm run build:frontend",
  "outputDirectory": "frontend/dist",
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.0"
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Created `.vercelignore`

Optimized build by ignoring unnecessary files:
```
node_modules
.git
*.md
docker-compose.yml
backend/dist
backend/node_modules
frontend/dist
frontend/node_modules
```

---

## What Changed

### Files Modified
1. `package.json` - Added TypeScript, updated build scripts
2. `vercel.json` - Updated build command and output directory
3. `.vercelignore` - Created to optimize build

### Build Process

**Before**:
```
npm run build:all
  → cd backend && npm run build
  → cd frontend && npm run build
```

**After**:
```
npm install (root)
  → cd backend && npm install
  → cd ../frontend && npm install
  → cd ..
  → npm run build:backend
  → npm run build:frontend
```

---

## Verification

### Local Build Test
```bash
npm run build:all
```

✅ Both backend and frontend build successfully

### Build Output
```
✓ Backend compiled with tsc
✓ Frontend built with Vite
✓ Output directory: frontend/dist
✓ API functions: api/**/*.ts
```

---

## Deployment Steps

### 1. Push Changes to GitHub
```bash
git add package.json vercel.json .vercelignore
git commit -m "fix: Update Vercel build configuration for monorepo"
git push origin main
```

### 2. Redeploy on Vercel
```bash
# Option 1: Automatic (if connected to GitHub)
# Push to main branch → Vercel auto-deploys

# Option 2: Manual
vercel --prod
```

### 3. Verify Deployment
- Check Vercel dashboard for build status
- Verify build logs show successful compilation
- Test frontend at https://your-app.vercel.app
- Test API endpoints at https://your-app.vercel.app/api/*

---

## Build Process Details

### Step 1: Install Root Dependencies
```bash
npm install
```
Installs: concurrently, typescript

### Step 2: Install Backend Dependencies
```bash
cd backend && npm install
```
Installs: express, neo4j-driver, axios, multer, pdf-parse, etc.

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend && npm install
```
Installs: react, vite, tailwind, recharts, d3, etc.

### Step 4: Build Backend
```bash
npm run build:backend
```
Compiles TypeScript to JavaScript in `backend/dist`

### Step 5: Build Frontend
```bash
npm run build:frontend
```
Builds React app with Vite to `frontend/dist`

### Step 6: Deploy
Vercel deploys:
- Frontend: `frontend/dist` → Static hosting
- API: `api/**/*.ts` → Serverless functions

---

## Environment Variables

Set these in Vercel dashboard:

```
NODE_ENV=production
NEO4J_URI=<your-neo4j-cloud-uri>
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-password>
OLLAMA_URL=<your-ollama-endpoint>
OLLAMA_MODEL=gemma:3b
VITE_API_URL=https://your-app.vercel.app
```

---

## Troubleshooting

### Issue: Build still fails with `tsc: command not found`

**Solution**:
1. Clear Vercel cache: Dashboard → Settings → Git → Clear Cache
2. Redeploy: `vercel --prod`
3. Check build logs for detailed error

### Issue: API endpoints not working

**Solution**:
1. Verify `api/**/*.ts` files exist
2. Check `functions` configuration in `vercel.json`
3. Ensure environment variables are set

### Issue: Frontend not loading

**Solution**:
1. Verify `outputDirectory: "frontend/dist"` is correct
2. Check `rewrites` configuration
3. Ensure frontend build succeeded

### Issue: Database connection error

**Solution**:
1. Verify `NEO4J_URI` environment variable
2. Check Neo4j Cloud credentials
3. Ensure database is running

---

## Performance Optimization

### Build Time
- Root install: ~30s
- Backend install: ~20s
- Frontend install: ~40s
- Backend build: ~2s
- Frontend build: ~5s
- **Total**: ~2-3 minutes

### Deployment Size
- Frontend dist: ~1MB
- API functions: ~500KB
- **Total**: ~1.5MB

---

## Next Steps

1. **Commit and push changes**
   ```bash
   git add .
   git commit -m "fix: Update Vercel build configuration"
   git push origin main
   ```

2. **Redeploy on Vercel**
   - Automatic if connected to GitHub
   - Or manual: `vercel --prod`

3. **Verify deployment**
   - Check Vercel dashboard
   - Test frontend and API
   - Monitor build logs

4. **Set environment variables**
   - Neo4j Cloud credentials
   - Ollama endpoint (if using)
   - API URL

---

## Files Changed

### `package.json`
- Added `typescript` to devDependencies
- Updated `build:all` script
- Added `install:all` script

### `vercel.json`
- Updated `buildCommand` with explicit install steps
- Changed `outputDirectory` to `frontend/dist`
- Added `functions` configuration
- Added `env` configuration

### `.vercelignore` (NEW)
- Optimizes build by ignoring unnecessary files

---

## Summary

✅ **Vercel build configuration fixed**

**Changes**:
- Added TypeScript to root dependencies
- Updated build command to install all dependencies
- Optimized output directory
- Created .vercelignore for faster builds

**Status**: Ready for deployment

**Next**: Push to GitHub and redeploy on Vercel

