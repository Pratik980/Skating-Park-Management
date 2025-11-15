# Netlify Deployment Setup

## Quick Fix for 404 Errors

If you're seeing "Page not found" errors on Netlify, follow these steps:

### Step 1: Verify Netlify Build Settings

In your Netlify dashboard, go to **Site settings → Build & deploy → Build settings**:

- **Base directory**: `SkatingPark/SkatingPark/newBimalMama/client`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Step 2: Verify Environment Variables

Go to **Site settings → Environment variables** and add:

- **Key**: `VITE_API_BASE_URL`
- **Value**: `https://your-backend-url.onrender.com/api` (your actual backend URL)

### Step 3: Trigger a New Deploy

After making changes:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**

### Step 4: Verify Files Are Present

Make sure these files exist in your repository:
- ✅ `client/netlify.toml` (in the client folder)
- ✅ `client/public/_redirects` (in the client/public folder)

### Common Issues

#### Issue: 404 on all routes except `/`
**Solution**: The `_redirects` file should be in `client/public/` folder. It will be automatically copied to `dist/` during build.

#### Issue: Build fails
**Solution**: 
- Check Node.js version (should be 18.x or 20.x)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

#### Issue: API calls fail
**Solution**: 
- Verify `VITE_API_BASE_URL` environment variable is set
- Check CORS settings on your backend
- Ensure backend is deployed and running

### Testing Locally

Before deploying, test the build locally:

```bash
cd client
npm run build
npm run preview
```

This will build and preview your app locally to catch any issues.

### Manual Redirects File

If the automatic redirects don't work, you can manually add a `_redirects` file in your `dist` folder after build, or use Netlify's UI:

1. Go to **Site settings → Build & deploy → Post processing**
2. Add redirect rule: `/* /index.html 200`

