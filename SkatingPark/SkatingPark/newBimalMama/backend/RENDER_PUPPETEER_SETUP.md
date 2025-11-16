# Puppeteer Configuration for Render.com

## Overview
This guide explains how to configure Puppeteer (used for PDF generation) on Render.com.

## Changes Made

1. **Updated Puppeteer Launch Configuration** (`routes/pdf.js`):
   - Added Render.com-compatible Puppeteer arguments
   - Added `--single-process` flag (important for Render.com)
   - Added timeout configuration
   - Improved error handling

2. **Error Handling**:
   - Better error messages for Chrome/Chromium not found
   - Timeout error handling
   - Detailed logging for debugging

## Render.com Configuration

### Option 1: Using render.yaml (Recommended)
The `render.yaml` file is already configured. Make sure to:
1. Set all required environment variables in Render.com dashboard
2. Ensure `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` is set to `false` (or not set at all)

### Option 2: Manual Configuration
In your Render.com dashboard:

1. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `false` (or leave unset)
   - Add all your other environment variables (MONGO_URI, JWT_SECRET, etc.)

2. **Build Command**: `npm install`
3. **Start Command**: `npm start`

## Troubleshooting

### Issue: "Could not find Chrome" or "Executable doesn't exist"
**Solution**: 
- Ensure `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` is not set to `true`
- Puppeteer should automatically download Chromium during `npm install`
- Check Render.com build logs to verify Chromium download

### Issue: PDF generation times out
**Solution**:
- The timeout is set to 30 seconds
- If your dashboard HTML is very large, you may need to increase the timeout
- Check Render.com service logs for detailed error messages

### Issue: PDF generation fails silently
**Solution**:
- Check the browser console on the frontend for error messages
- Check Render.com service logs for backend errors
- The improved error handling should now show specific error messages

## Testing

After deploying to Render.com:
1. Try exporting a PDF from the Dashboard
2. Check the browser console for any errors
3. Check Render.com service logs if PDF generation fails
4. The error messages should now be more descriptive

## Notes

- Puppeteer downloads Chromium (~170MB) during `npm install`, which may increase build time
- The `--single-process` flag is important for Render.com's environment
- All Puppeteer args are optimized for cloud/serverless environments

