# Debug Login Issues - Step by Step Guide

## Quick Checklist

Follow these steps in order:

### ✅ Step 1: Verify Backend is Running

1. **Test your backend URL directly in browser:**
   ```
   https://your-backend-url.onrender.com/api/auth/check-setup
   ```
   - Should return JSON like: `{"setup": true}` or similar
   - If you get an error, backend is not running properly

2. **Check backend logs:**
   - Render: Go to your service → Logs tab
   - Railway: Go to your service → Logs tab
   - Look for: `🚀 Server running on port...`
   - Look for: `✅ MongoDB Connected Successfully`

### ✅ Step 2: Verify Frontend Environment Variable

1. **In Netlify:**
   - Go to Site settings → Environment variables
   - Check if `VITE_API_BASE_URL` exists
   - Value should be: `https://your-backend-url.onrender.com/api`
   - **Important**: Must end with `/api`

2. **After setting/updating variable:**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - **Environment variables require a new build!**

### ✅ Step 3: Test API Endpoint Directly

**Option A: Using Browser**
1. Open browser console (F12)
2. Run this in console:
   ```javascript
   fetch('https://your-backend-url.onrender.com/api/auth/check-setup')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```
   - Should return JSON without errors

**Option B: Using curl (Terminal)**
```bash
curl https://your-backend-url.onrender.com/api/auth/check-setup
```

### ✅ Step 4: Check Browser Console

1. Open your Netlify site
2. Press F12 → Console tab
3. Try to login
4. Look for these messages:
   - `🔗 API Base URL: ...` - Should show your backend URL
   - `🔐 Attempting login to: ...` - Should show full login URL
   - `❌ Login error: ...` - Will show the actual error

### ✅ Step 5: Check Network Tab

1. Open Developer Tools → Network tab
2. Try to login
3. Find the request to `/auth/login`
4. Check:
   - **Status**: Should be 200 (success) or 401 (wrong password)
   - **Request URL**: Should be your backend URL
   - **Response**: Check the error message

### ✅ Step 6: Verify Backend Environment Variables

**In Render/Railway backend, check these variables:**
- `NODE_ENV` = `production`
- `MONGO_URI` = Your MongoDB connection string
- `JWT_SECRET` = Your secret key
- `FRONTEND_URL` = Your Netlify URL (e.g., `https://your-app.netlify.app`)

**Important**: `FRONTEND_URL` should be your Netlify domain, not the backend URL!

### ✅ Step 7: Test Login API Directly

**Using Browser Console:**
```javascript
fetch('https://your-backend-url.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'your-password'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

- If this works, the backend is fine, issue is with frontend
- If this fails, the issue is with backend

## Common Error Messages & Solutions

### Error: "Network Error" or "ERR_NETWORK"
**Cause**: Frontend can't reach backend

**Solutions**:
1. Check `VITE_API_BASE_URL` is set in Netlify
2. Verify backend URL is correct (test in browser)
3. Check backend is running (check logs)
4. Verify CORS is configured

### Error: "404 Not Found"
**Cause**: API endpoint doesn't exist or URL is wrong

**Solutions**:
1. Verify API URL ends with `/api`
2. Check backend routes are correct
3. Test backend directly (see Step 3)

### Error: "401 Unauthorized" or "Invalid email or password"
**Cause**: Wrong credentials or user doesn't exist

**Solutions**:
1. Verify user exists in database
2. Check credentials are correct
3. Check MongoDB connection in backend logs

### Error: "CORS policy" or "Access-Control-Allow-Origin"
**Cause**: Backend not allowing your frontend domain

**Solutions**:
1. Set `FRONTEND_URL` in backend environment variables
2. Value should be: `https://your-app.netlify.app`
3. Restart backend service
4. Check backend logs for CORS messages

### Error: "Cannot read properties" or JavaScript errors
**Cause**: Frontend code issue

**Solutions**:
1. Check browser console for full error
2. Verify all files are deployed correctly
3. Clear browser cache
4. Try incognito/private window

## Quick Test Commands

### Test Backend Health:
```bash
curl https://your-backend-url.onrender.com/
```
Should return: `{"message":"🏒 Skating Park Management System API",...}`

### Test Login Endpoint:
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Check Environment Variables:
In browser console on your Netlify site:
```javascript
console.log('API URL:', import.meta.env.VITE_API_BASE_URL)
```

## Still Not Working?

1. **Share these details:**
   - Backend URL
   - Frontend URL (Netlify)
   - Error message from browser console
   - Network tab screenshot

2. **Check backend logs** for any errors

3. **Verify MongoDB** is connected and working

