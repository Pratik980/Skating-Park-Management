import express from 'express';
import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Sales from '../models/Sales.js';
import Expense from '../models/Expense.js';
import Settings from '../models/Settings.js';
import Branch from '../models/Branch.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

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
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
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
        .header .company {
          font-size: 24px;
          font-weight: 600;
          color: #101936;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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
          font-size: 12px;
          color: #7c86a7;
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

        <div class="footer">
          Report generated for ${escapeHtml(manager)} • ${companyName}
        </div>
      </div>
    </body>
  </html>`;
};

router.get('/dashboard', protect, async (req, res) => {
  let browser;
  try {
    const requestBranchId = req.query.branchId || req.user?.branch?._id || req.user?.branch;
    const userBranchId = req.user?.branch?._id || req.user?.branch;

    if (!requestBranchId || String(requestBranchId) !== String(userBranchId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to export this branch report.'
      });
    }

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

    const html = buildDashboardHtml({
      stats,
      settings,
      branch,
      generatedAt: new Date(),
      user: req.user
    });

    // Puppeteer configuration for Render.com and other cloud platforms
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

    // Only use --single-process in production/cloud environments
    // It can cause issues on localhost/Windows
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      puppeteerArgs.push('--single-process');
    }

    // Launch browser with improved error handling
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: puppeteerArgs,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        timeout: 60000,
        // Additional options for stability
        ignoreHTTPSErrors: true,
        ignoreDefaultArgs: ['--disable-extensions']
      });
    } catch (launchError) {
      console.error('Failed to launch browser:', launchError);
      throw new Error(`Failed to launch browser: ${launchError.message}`);
    }

    const page = await browser.newPage();
    
    // Set a longer timeout for page operations
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    // Disable images and media to speed up rendering (fonts are system fonts, so we allow them)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images and media that might cause timeouts
      // Allow fonts since we're using system fonts
      if (['image', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Set content with a more lenient wait strategy
    // Use 'domcontentloaded' instead of 'networkidle0' for faster, more reliable rendering
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Wait a bit to ensure all content is rendered
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.emulateMediaType('screen');

    // Generate PDF with error handling
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
    } catch (pdfError) {
      // If PDF generation fails, try to close resources before throwing
      try {
        await page.close().catch(() => {});
      } catch (e) {}
      throw pdfError;
    }

    // Close page and browser after successful PDF generation
    try {
      await page.close();
    } catch (e) {
      console.warn('Error closing page:', e);
    }
    
    try {
      await browser.close();
    } catch (e) {
      console.warn('Error closing browser:', e);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Dashboard_${branch.branchName?.replace(/\s+/g, '_') || 'Report'}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Dashboard PDF export error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to generate dashboard PDF';
    const errorMsgLower = (error.message || '').toLowerCase();
    
    if (errorMsgLower.includes('could not find chrome') || 
        errorMsgLower.includes('executable doesn\'t exist') ||
        errorMsgLower.includes('no usable sandbox')) {
      errorMessage = 'Chrome/Chromium not found. Please ensure Puppeteer dependencies are installed on the server.';
    } else if (errorMsgLower.includes('navigation timeout') || 
               errorMsgLower.includes('timeout') ||
               errorMsgLower.includes('timeout exceeded')) {
      errorMessage = 'PDF generation timed out. The server may be under heavy load. Please try again.';
    } else if (errorMsgLower.includes('target closed') || 
               errorMsgLower.includes('targetcloseerror') ||
               errorMsgLower.includes('browsing context')) {
      errorMessage = 'Browser closed unexpectedly during PDF generation. This may be due to memory constraints. Please try again or contact support.';
    } else if (errorMsgLower.includes('protocol error')) {
      errorMessage = 'Browser communication error. Please try again.';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    // Always return JSON (not blob) for errors
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

export default router;

