# Deployment Guide

This guide explains how to deploy the Bimal Skating Park Management System.

## Architecture

This is a **full-stack application** with:
- **Frontend**: React (Vite) - Can be deployed on Netlify, Vercel, etc.
- **Backend**: Node.js/Express - Needs a Node.js hosting service

## Deployment Options

### Option 1: Netlify (Frontend) + Render (Backend) - Recommended

#### Deploy Frontend on Netlify

1. **Build the frontend:**
   ```bash
   cd client
   npm install
   npm run build
   ```

2. **Go to Netlify:**
   - Visit https://app.netlify.com
   - Sign up/Login
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository
   - Configure build settings:
     - **Base directory**: `SkatingPark/SkatingPark/newBimalMama/client`
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`

3. **Add Environment Variable:**
   - Go to Site settings → Environment variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com/api`
   - (Replace with your actual backend URL)

4. **Deploy!**

#### Deploy Backend on Render

1. **Go to Render:**
   - Visit https://render.com
   - Sign up/Login
   - Click "New" → "Web Service"

2. **Connect GitHub:**
   - Connect your GitHub repository
   - Select the repository

3. **Configure:**
   - **Name**: `skating-park-backend`
   - **Root Directory**: `SkatingPark/SkatingPark/newBimalMama/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js` or `npm start`

4. **Add Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (or leave default)
   - `MONGO_URI` = `your_mongodb_connection_string`
   - `JWT_SECRET` = `your_jwt_secret_key`

5. **Deploy!**

6. **Update Frontend API URL:**
   - Copy your Render backend URL (e.g., `https://skating-park-backend.onrender.com`)
   - Update Netlify environment variable: `VITE_API_BASE_URL` = `https://skating-park-backend.onrender.com/api`

### Option 2: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:
1. Install Vercel CLI: `npm i -g vercel`
2. Go to client directory: `cd client`
3. Run: `vercel`
4. Set environment variable: `VITE_API_BASE_URL`

#### Backend on Railway:
1. Visit https://railway.app
2. New Project → Deploy from GitHub
3. Select repository and backend folder
4. Add environment variables
5. Deploy

### Option 3: Full Stack on Vercel

Vercel supports full-stack deployments:
1. Deploy both frontend and backend
2. Use Vercel serverless functions for API routes
3. Requires restructuring backend code

## Important Notes

### CORS Configuration

Make sure your backend allows requests from your frontend domain. Update `backend/server.js`:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-netlify-app.netlify.app'],
  credentials: true
}));
```

### MongoDB

- Use MongoDB Atlas (free tier available) for production database
- Update `MONGO_URI` in backend environment variables

### Environment Variables

**Frontend (Netlify/Vercel):**
- `VITE_API_BASE_URL` - Your backend API URL

**Backend (Render/Railway):**
- `NODE_ENV` - `production`
- `PORT` - Server port (usually auto-assigned)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

## Quick Deploy Commands

### Netlify CLI:
```bash
cd client
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Vercel CLI:
```bash
cd client
npm install -g vercel
vercel login
vercel --prod
```

## Troubleshooting

### Frontend can't connect to backend:
- Check CORS settings in backend
- Verify `VITE_API_BASE_URL` is set correctly
- Ensure backend is deployed and running

### Build fails:
- Check Node.js version (should be 14+)
- Verify all dependencies are in package.json
- Check build logs for specific errors

### Backend errors:
- Verify MongoDB connection string
- Check environment variables are set
- Review server logs

## Recommended Setup

1. **Frontend**: Netlify (free, easy, great for React)
2. **Backend**: Render (free tier, easy Node.js hosting)
3. **Database**: MongoDB Atlas (free tier available)

This combination provides a free, production-ready deployment!

