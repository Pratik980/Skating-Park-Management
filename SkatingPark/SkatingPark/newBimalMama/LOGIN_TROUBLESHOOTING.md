# Login Troubleshooting Guide

## Common Login Issues and Solutions

### Issue 1: "Cannot connect to server" or "Network Error"

**Cause**: The frontend cannot reach the backend API.

**Solutions**:
1. **Check Environment Variable in Netlify**:
   - Go to Site settings → Environment variables
   - Verify `VITE_API_BASE_URL` is set correctly
   - Format: `https://your-backend-url.onrender.com/api` (with `/api` at the end)
   - **Important**: Must start with `VITE_` prefix

2. **Verify Backend is Deployed and Running**:
   - Check your backend URL (Render, Railway, etc.)
   - Test the backend directly: `https://your-backend-url.onrender.com/api/auth/check-setup`
   - Should return a JSON response

3. **Check CORS Settings**:
   - Backend must allow requests from your Netlify domain
   - Update `FRONTEND_URL` environment variable in backend to include your Netlify URL

### Issue 2: "API endpoint not found" (404 Error)

**Cause**: The API URL is incorrect or backend route doesn't exist.

**Solutions**:
1. **Verify API URL Format**:
   - Should end with `/api`: `https://backend-url.com/api`
   - Not: `https://backend-url.com` ❌
   - Yes: `https://backend-url.com/api` ✅

2. **Check Backend Routes**:
   - Ensure `/api/auth/login` endpoint exists
   - Test: `https://your-backend-url.com/api/auth/login` (POST request)

### Issue 3: "Invalid email or password" (401 Error)

**Cause**: Wrong credentials or user doesn't exist.

**Solutions**:
1. **Verify Credentials**:
   - Check email and password are correct
   - Ensure user exists in database

2. **Check Database Connection**:
   - Verify MongoDB connection string is correct
   - Check backend logs for database errors

### Issue 4: Login works locally but fails on Netlify

**Cause**: Environment variable not set or incorrect in Netlify.

**Solutions**:
1. **Set Environment Variable in Netlify**:
   ```
   Key: VITE_API_BASE_URL
   Value: https://your-backend-url.onrender.com/api
   ```

2. **Redeploy After Setting Variable**:
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - Environment variables require a new build

3. **Verify Build Logs**:
   - Check Netlify build logs
   - Look for any errors during build
   - Verify environment variable is being used

## Debugging Steps

### Step 1: Check Browser Console
1. Open your Netlify site
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Try to login
5. Look for error messages:
   - `🔗 API Base URL: ...` - Shows what URL is being used
   - `🔐 Attempting login to: ...` - Shows login endpoint
   - `❌ Login error: ...` - Shows detailed error

### Step 2: Check Network Tab
1. Open Developer Tools → Network tab
2. Try to login
3. Look for the login request:
   - **Request URL**: Should be your backend URL
   - **Status**: Check if it's 200, 401, 404, etc.
   - **Response**: Check the error message

### Step 3: Test Backend Directly
1. Use Postman or curl to test backend:
   ```bash
   curl -X POST https://your-backend-url.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```
2. If this fails, the issue is with the backend, not frontend

## Quick Checklist

- [ ] Backend is deployed and running
- [ ] `VITE_API_BASE_URL` is set in Netlify environment variables
- [ ] API URL ends with `/api`
- [ ] Backend CORS allows your Netlify domain
- [ ] User exists in database
- [ ] Credentials are correct
- [ ] New deploy triggered after setting environment variable

## Still Having Issues?

1. **Check Backend Logs**:
   - Render: Go to your service → Logs
   - Railway: Go to your service → Logs
   - Look for any errors

2. **Verify Environment Variables**:
   - Backend: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`
   - Frontend: `VITE_API_BASE_URL`

3. **Test API Endpoints**:
   - Use Postman or browser to test:
     - `GET /api/auth/check-setup`
     - `POST /api/auth/login`

## Example Environment Variables

### Netlify (Frontend):
```
VITE_API_BASE_URL=https://skating-park-backend.onrender.com/api
```

### Render/Railway (Backend):
```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-app.netlify.app
```

