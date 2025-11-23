import express from 'express';
import puppeteer from 'puppeteer';
import { install } from '@puppeteer/browsers';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ticket from '../models/Ticket.js';
import Sales from '../models/Sales.js';
import Expense from '../models/Expense.js';
import Settings from '../models/Settings.js';
import Branch from '../models/Branch.js';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local assets (font + logo) live under client/public so Puppeteer can load them offline
const publicDir = path.join(__dirname, '../../client/public');

const localDevanagariFontPath = path.join(publicDir, 'fonts/NotoSansDevanagari-Regular.ttf').replace(/\\/g, '/');
const localDevanagariFontUrl = `file://${localDevanagariFontPath}`;
let localDevanagariFontDataUri = null;

try {
  if (fs.existsSync(localDevanagariFontPath)) {
    const fontBuffer = fs.readFileSync(localDevanagariFontPath);
    localDevanagariFontDataUri = `data:font/ttf;base64,${fontBuffer.toString('base64')}`;
    console.log('✅ Loaded local Devanagari font, bytes:', fontBuffer.length);
  } else {
    console.warn('⚠️ Local Devanagari font file not found at', localDevanagariFontPath);
  }
} catch (fontError) {
  console.warn('⚠️ Failed to read local Devanagari font:', fontError);
}

const localLogoPath = path.join(publicDir, 'valyntix-logo.png.jpg').replace(/\\/g, '/');
const valyntixLogoUrl = fs.existsSync(localLogoPath)
  ? `file://${localLogoPath}`
  : 'https://skatingpark.netlify.app/valyntix-logo.png.jpg';


const router = express.Router();

// Cache browser instance for faster PDF generation (reuse across requests)
let cachedBrowser = null;
let browserLaunchPromise = null;

// Log Puppeteer info on module load (for debugging)
console.log('📦 Puppeteer module loaded');
console.log('Puppeteer version:', puppeteer.version || 'unknown');

// Function to get or create browser instance
const getBrowser = async () => {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    console.log('♻️ Reusing cached browser instance');
    return cachedBrowser;
  }

  // If browser is launching, wait for it
  if (browserLaunchPromise) {
    console.log('⏳ Waiting for browser launch...');
    return await browserLaunchPromise;
  }

  // Launch new browser
  browserLaunchPromise = (async () => {
    console.log('🚀 Launching new browser instance...');
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ];

    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      puppeteerArgs.push('--single-process');
    }

    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    // Try Puppeteer's default executable path
    try {
      executablePath = puppeteer.executablePath();
      if (fs.existsSync(executablePath)) {
        console.log('✅ Found Puppeteer executable:', executablePath);
      } else {
        executablePath = null;
      }
    } catch (execPathError) {
      // Continue to system Chromium check
    }
    
    // If Puppeteer's path doesn't work, try system Chromium
    if (!executablePath || !fs.existsSync(executablePath)) {
      const systemChromiumPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium'
      ];
      
      for (const chromiumPath of systemChromiumPaths) {
        try {
          if (fs.existsSync(chromiumPath)) {
            executablePath = chromiumPath;
            console.log('✅ Found system Chromium:', executablePath);
            break;
          }
        } catch (e) {
          // Continue checking other paths
        }
      }
    }
    
    // If still no executable found, try to install Chrome via @puppeteer/browsers
    if (!executablePath || !fs.existsSync(executablePath)) {
      console.log('📥 Chrome not found, attempting to install via @puppeteer/browsers...');
      const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
      
      try {
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        let browserPath;
        try {
          browserPath = await install({
            browser: 'chromium',
            cacheDir: cacheDir,
          });
          executablePath = browserPath.executablePath;
          console.log('✅ Chromium installed successfully:', executablePath);
        } catch (chromiumError) {
          const chromeBuildId = '131.0.6778.85';
          browserPath = await install({
            browser: 'chrome',
            buildId: chromeBuildId,
            cacheDir: cacheDir,
          });
          executablePath = browserPath.executablePath;
          console.log('✅ Chrome installed successfully:', executablePath);
        }
      } catch (installError) {
        throw new Error(`Could not find or install Chrome/Chromium: ${installError.message}`);
      }
    }
    
    console.log('🟡 About to launch Puppeteer (Chrome)');
    if (executablePath) {
      console.log('🚦 Using executable path:', executablePath);
    } else {
      console.log('🚦 Using bundled Chromium executable path');
    }
    console.log('🔧 Launch args:', puppeteerArgs.join(' '));
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      executablePath: executablePath || puppeteer.executablePath(),
      timeout: 0,
      protocolTimeout: 0,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions']
    });
    console.log('🟢 Puppeteer/Chrome launched');
    
    console.log('✅ Browser launched successfully');
    cachedBrowser = browser;
    browserLaunchPromise = null;
    
    // Handle browser disconnection
    browser.on('disconnected', () => {
      console.log('⚠️ Browser disconnected, will create new instance on next request');
      cachedBrowser = null;
    });
    
    return browser;
  })();

  return await browserLaunchPromise;
};

const DEFAULT_COMPANY = 'बेलका स्केट पार्क एण्ड गेमिङ जोन';
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value = 0) => `रु ${currencyFormatter.format(value || 0)}`;
const formatNumber = (value = 0) => numberFormatter.format(value || 0);

const computeDashboardStats = async (branchId) => {
  const branchObjectId = new mongoose.Types.ObjectId(branchId);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayTickets,
    todaySales,
    todayExpenses,
    totalTickets,
    totalSales,
    totalExpenses,
    ticketRevenueAgg,
    salesRevenueAgg,
    expensesAgg
  ] = await Promise.all([
    Ticket.countDocuments({
      branch: branchObjectId,
      'date.englishDate': { $gte: startOfDay, $lte: endOfDay }
    }),
    Sales.countDocuments({
      branch: branchObjectId,
      'date.englishDate': { $gte: startOfDay, $lte: endOfDay },
      isSale: true
    }),
    Expense.countDocuments({
      branch: branchObjectId,
      'date.englishDate': { $gte: startOfDay, $lte: endOfDay }
    }),
    Ticket.countDocuments({ branch: branchObjectId }),
    Sales.countDocuments({ branch: branchObjectId }),
    Expense.countDocuments({ branch: branchObjectId }),
    Ticket.aggregate([
      { $match: { branch: branchObjectId } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]),
    Sales.aggregate([
      { $match: { branch: branchObjectId, isSale: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Expense.aggregate([
      { $match: { branch: branchObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const ticketRevenue = ticketRevenueAgg[0]?.total || 0;
  const salesRevenue = salesRevenueAgg[0]?.total || 0;
  const expensesAmount = expensesAgg[0]?.total || 0;
  const totalRevenue = ticketRevenue + salesRevenue;
  const netProfit = totalRevenue - expensesAmount;

  return {
    today: {
      tickets: todayTickets,
      sales: todaySales,
      expenses: todayExpenses
    },
    totals: {
      tickets: totalTickets,
      sales: totalSales,
      expenses: totalExpenses,
      revenue: totalRevenue,
      ticketRevenue,
      otherRevenue: salesRevenue,
      expensesAmount,
      netProfit
    }
  };
};

const buildDashboardHtml = ({ stats, settings, branch, generatedAt, user }) => {
  const companyName = escapeHtml(settings?.companyName || DEFAULT_COMPANY);
  const branchLine = branch
    ? `${escapeHtml(branch.branchName)} • ${escapeHtml(branch.location || '')}`
    : 'Branch Information';
  const regNo = escapeHtml(settings?.regNo || '________');
  const manager = escapeHtml(settings?.ownerName || user?.name || 'Branch Owner');
  const generatedText = generatedAt.toLocaleString();

  return `<!DOCTYPE html>
  <html lang="ne">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Dashboard Report</title>
      <!-- Try Google Fonts as a fallback -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        /* Embed local Devanagari font so Nepali text shows even if Google Fonts fails */
        @font-face {
          font-family: 'Noto Sans Devanagari Local';
          src: url('${localDevanagariFontDataUri || localDevanagariFontUrl}') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          font-family: 'Noto Sans Devanagari Local', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          background: #f5f7fb;
          color: #1d1f2c;
        }
        .report {
          background: #ffffff;
          border-radius: 18px;
          padding: 32px;
          box-shadow: 0 12px 45px rgba(15, 23, 42, 0.15);
        }
        .header {
          text-align: center;
          margin-bottom: 26px;
        }
        .header .logo {
          margin-bottom: 10px;
        }
        .header .logo img {
          display: inline-block;
          width: 120px;
          height: auto;
        }
        .header .company {
          font-size: 24px;
          font-weight: 600;
          color: #101936;
          font-family: 'Noto Sans Devanagari Local', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        .header .branch {
          margin-top: 6px;
          color: #4b5674;
        }
        .meta {
          margin-top: 10px;
          font-size: 12px;
          color: #7a839a;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          padding: 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, #eef2ff, #f5f9ff);
          border: 1px solid #e5e9fa;
        }
        .stat-card .label {
          font-size: 13px;
          color: #5c6695;
          margin-bottom: 4px;
        }
        .stat-card .value {
          font-size: 24px;
          font-weight: 600;
          color: #1c2140;
        }
        .section {
          margin-bottom: 28px;
        }
        .section h3 {
          margin-bottom: 12px;
          color: #20274b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 12px;
          overflow: hidden;
        }
        th, td {
          padding: 12px 16px;
          text-align: left;
        }
        th {
          background: #eff2fb;
          color: #4a5170;
          font-weight: 600;
        }
        tr:nth-child(every) { background: #fff; }
        tr:nth-child(odd) { background: #fafbff; }
        .footer {
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #e2e6f5;
          font-size: 13px;
          color: #60708e;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="report" style="padding: 12px;">
        <div class="header">
          <div class="company">${companyName}</div>
          <div class="branch">${branchLine}</div>
          <div class="meta">Reg No: ${regNo} • Generated on ${escapeHtml(generatedText)}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Today's Tickets</div>
            <div class="value">${formatNumber(stats.today.tickets)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Today's Sales</div>
            <div class="value">${formatNumber(stats.today.sales)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Today's Expenses</div>
            <div class="value">${formatNumber(stats.today.expenses)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Net Profit</div>
            <div class="value" style="color: ${stats.totals.netProfit >= 0 ? '#27ae60' : '#e74c3c'}">
              ${stats.totals.netProfit >= 0 ? formatCurrency(stats.totals.netProfit) : '—'}
            </div>
          </div>
          <div class="stat-card">
            <div class="label">Net Loss</div>
            <div class="value" style="color: #e74c3c">
              ${stats.totals.netProfit < 0 ? formatCurrency(Math.abs(stats.totals.netProfit)) : '—'}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Revenue Overview</h3>
          <table>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Total Revenue</td>
              <td>${formatCurrency(stats.totals.revenue)}</td>
            </tr>
            <tr>
              <td>Ticket Revenue</td>
              <td>${formatCurrency(stats.totals.ticketRevenue)}</td>
            </tr>
            <tr>
              <td>Other Sales Revenue</td>
              <td>${formatCurrency(stats.totals.otherRevenue)}</td>
            </tr>
            <tr>
              <td>Total Expenses</td>
              <td>${formatCurrency(stats.totals.expensesAmount)}</td>
            </tr>
            <tr>
              <td>Net Profit</td>
              <td style="color: #27ae60; font-weight: bold;">
                ${stats.totals.netProfit >= 0 ? formatCurrency(stats.totals.netProfit) : '—'}
              </td>
            </tr>
            <tr>
              <td>Net Loss</td>
              <td style="color: #e74c3c; font-weight: bold;">
                ${stats.totals.netProfit < 0 ? formatCurrency(Math.abs(stats.totals.netProfit)) : '—'}
              </td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h3>Records Summary</h3>
          <table>
            <tr>
              <th>Records</th>
              <th>Count</th>
            </tr>
            <tr>
              <td>Total Tickets</td>
              <td>${formatNumber(stats.totals.tickets)}</td>
            </tr>
            <tr>
              <td>Total Sales</td>
              <td>${formatNumber(stats.totals.sales)}</td>
            </tr>
            <tr>
              <td>Total Expenses Logged</td>
              <td>${formatNumber(stats.totals.expenses)}</td>
            </tr>
          </table>
        </div>

        <div class="footer" style="text-align:center; margin-top:28px; padding-top:16px; border-top:1px solid #e2e6f5; font-size:13px; color:#60708e; display:flex; flex-direction:column; align-items:center; gap:6px;">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            <img src='${valyntixLogoUrl}' alt='Valyntix Logo' style='width:24px;height:24px;vertical-align:middle;border-radius:4px;object-fit:contain;margin-right:2px;' />
            &copy; ${companyName}. सर्वाधिकार सुरक्षित।
          </span>
        </div>
      </div>
    </body>
  </html>`;
};

router.get('/dashboard', protect, async (req, res) => {
  let page;
  try {
    console.log('📄 PDF Export Request Started');
    
    const requestBranchId = req.query.branchId || req.user?.branch?._id || req.user?.branch;
    const userBranchId = req.user?.branch?._id || req.user?.branch;

    if (!requestBranchId || String(requestBranchId) !== String(userBranchId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to export this branch report.'
      });
    }

    console.log('✅ Fetching branch, settings, and stats...');
    const [branch, settings, stats] = await Promise.all([
      Branch.findById(requestBranchId).lean(),
      Settings.findOne({ branch: requestBranchId }).lean(),
      computeDashboardStats(requestBranchId)
    ]);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    console.log('✅ Building HTML...');
    const html = buildDashboardHtml({
      stats,
      settings,
      branch,
      generatedAt: new Date(),
      user: req.user
    });

    // Get or reuse browser instance (cached for performance)
    const browser = await getBrowser();

    console.log('📄 Creating new page...');
    page = await browser.newPage();
    
    // Set shorter timeouts for faster generation
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Use faster wait strategy - domcontentloaded is much faster than networkidle0
    console.log('📝 Setting page content...');
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for fonts to load (shorter wait for speed)
    console.log('⏳ Waiting for fonts...');
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise(resolve => setTimeout(resolve, 1500)) // Max 1.5s wait
    ]);
    
    await page.emulateMediaType('screen');
    console.log('✅ Page ready for PDF generation');

    // Generate PDF with error handling
    console.log('📄 Generating PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', right: '8mm', bottom: '10mm', left: '8mm' },
        scale: 0.82,
        preferCSSPageSize: true,
        timeout: 60000
      });
      console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError);
      // If PDF generation fails, try to close resources before throwing
      try {
        await page.close().catch(() => {});
      } catch (e) {}
      throw pdfError;
    }

    // Close page (but keep browser cached for next request)
    console.log('🧹 Cleaning up page...');
    try {
      await page.close();
      console.log('✅ Page closed');
    } catch (e) {
      console.warn('⚠️ Error closing page:', e);
    }
    // Note: Browser is kept alive (cached) for faster subsequent requests

    console.log('📤 Sending PDF response...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Dashboard_${branch.branchName?.replace(/\s+/g, '_') || 'Report'}.pdf`
    );
    res.send(pdfBuffer);
    console.log('✅ PDF sent successfully');
  } catch (error) {
    console.error('❌ Dashboard PDF export error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Close page if it exists
    if (page) {
      try {
        await page.close().catch(() => {});
      } catch (e) {}
    }
    
    // Note: We don't close the browser here to keep it cached for next request
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to generate dashboard PDF';
    const errorMsgLower = (error.message || '').toLowerCase();
    const errorNameLower = (error.name || '').toLowerCase();
    
    if (errorMsgLower.includes('could not find chrome') || 
        errorMsgLower.includes('executable doesn\'t exist') ||
        errorMsgLower.includes('no usable sandbox') ||
        errorMsgLower.includes('chrome') && errorMsgLower.includes('not found')) {
      errorMessage = 'Chrome/Chromium not found. Please ensure Puppeteer dependencies are installed on the server.';
    } else if (errorMsgLower.includes('navigation timeout') || 
               errorMsgLower.includes('timeout') ||
               errorMsgLower.includes('timeout exceeded')) {
      errorMessage = 'PDF generation timed out. The server may be under heavy load. Please try again.';
    } else if (errorMsgLower.includes('target closed') || 
               errorMsgLower.includes('targetcloseerror') ||
               errorMsgLower.includes('browsing context') ||
               errorNameLower.includes('targetclose')) {
      errorMessage = 'Browser closed unexpectedly during PDF generation. This may be due to memory constraints. Please try again or contact support.';
    } else if (errorMsgLower.includes('protocol error')) {
      errorMessage = 'Browser communication error. Please try again.';
    } else if (errorMsgLower.includes('cannot find module') || errorMsgLower.includes('puppeteer')) {
      errorMessage = 'Puppeteer is not properly installed. Please check server configuration.';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    // Log the full error for debugging (this will appear in Render logs)
    console.error('📋 Full error details for debugging:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    });
    
    // Always return JSON (not blob) for errors
    // Make sure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    } else {
      console.error('⚠️ Response already sent, cannot send error response');
    }
  }
});

export default router;

