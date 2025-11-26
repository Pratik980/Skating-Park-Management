import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { summaryAPI, ticketsAPI, salesAPI, expensesAPI, settingsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import { formatCurrency } from '../utils/currencyConverter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';

const Summary = () => {
  const defaultDate = new Date().toISOString().split('T')[0];

  const [summary, setSummary] = useState(null);
  const [rangeSummary, setRangeSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dailyDetailsLoading, setDailyDetailsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [dailyTickets, setDailyTickets] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: defaultDate,
    endDate: defaultDate
  });
  const [activeTab, setActiveTab] = useState('daily');
  const [settings, setSettings] = useState(null);
  const { currentBranch } = useApp();

  const totalTicketRevenue = useMemo(
    () => dailyTickets.reduce((sum, ticket) => sum + (ticket.fee || 0), 0),
    [dailyTickets]
  );

  const totalSalesAmount = useMemo(
    () => dailySales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
    [dailySales]
  );

  const totalExpenseAmount = useMemo(
    () => dailyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [dailyExpenses]
  );

  const fetchDailyDetails = useCallback(async (date) => {
    if (!currentBranch) return;

    try {
      setDailyDetailsLoading(true);
      // Fetch all data without limit
      const [ticketsRes, salesRes, expensesRes] = await Promise.all([
        ticketsAPI.getAll({ branch: currentBranch._id, date }),
        salesAPI.getAll({ branch: currentBranch._id, date }),
        expensesAPI.getAll({ branch: currentBranch._id, date })
      ]);

      setDailyTickets(ticketsRes.data.tickets || []);
      setDailySales(salesRes.data.sales || []);
      setDailyExpenses(expensesRes.data.expenses || []);
    } catch (error) {
      console.error('Error fetching daily details:', error);
      setDailyTickets([]);
      setDailySales([]);
      setDailyExpenses([]);
    } finally {
      setDailyDetailsLoading(false);
    }
  }, [currentBranch]);

  const fetchDailySummary = useCallback(async (date = selectedDate) => {
    if (!currentBranch) return;
    
    try {
      setSummaryLoading(true);
      const response = await summaryAPI.getDaily(currentBranch._id, date);
      setSummary(response.data.summary);
      await fetchDailyDetails(date);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [currentBranch, selectedDate, fetchDailyDetails]);

  const fetchRangeSummary = useCallback(async () => {
    if (!currentBranch) return;
    
    try {
      setRangeLoading(true);
      const response = await summaryAPI.getRange(
        currentBranch._id, 
        dateRange.startDate, 
        dateRange.endDate
      );
      setRangeSummary(response.data);
    } catch (error) {
      console.error('Error fetching range summary:', error);
      setRangeSummary(null);
    } finally {
      setRangeLoading(false);
    }
  }, [currentBranch, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!currentBranch || activeTab !== 'daily') return;
    fetchDailySummary(selectedDate);
  }, [currentBranch, activeTab, selectedDate, fetchDailySummary]);

  useEffect(() => {
    if (!currentBranch || activeTab !== 'range') return;
    fetchRangeSummary();
  }, [currentBranch, activeTab, fetchRangeSummary]);

  useEffect(() => {
    if (currentBranch) {
      fetchSettings();
    }
  }, [currentBranch]);

  const fetchSettings = async () => {
    if (!currentBranch) return;
    try {
      const response = await settingsAPI.getByBranch(currentBranch._id);
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleDailyRefresh = () => {
    fetchDailySummary(selectedDate);
  };

  // Format numbers for PDF (avoid toLocaleString issues with jsPDF)
  const formatNumber = (num) => {
    const n = Number(num || 0);
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      
      // Start directly with tables
      let startY = 40;

      // Defensive exportToPDF
      const hasSummaryForDaily = activeTab === 'daily' && summary && Array.isArray(summary.tickets) && Array.isArray(summary.sales) && Array.isArray(summary.expenses);
      const hasRangeSummary = activeTab === 'range' && rangeSummary && Array.isArray(rangeSummary.summaries) && rangeSummary.summaries.length > 0;

      if (!(hasSummaryForDaily || hasRangeSummary)) {
        alert('No report data available for export.');
        return;
      }

      if (activeTab === 'daily' && summary) {
        // Financial Summary Table
        startY += 10;
        const financialData = [
          ['Tickets Sold', String(summary.totalTickets || 0)],
          ['Ticket Revenue', `Rs ${formatNumber(summary.totalTicketSales)}`],
          ['Other Sales', `Rs ${formatNumber(summary.totalOtherSales)}`],
          ['Total Expenses', `Rs ${formatNumber(summary.totalExpenses)}`],
          ['Net Profit/Loss', `Rs ${formatNumber(summary.profitLoss)}`],
        ];

        if (Array.isArray(financialData) && financialData.length) {
          autoTable(doc, {
            startY: startY,
            head: [['Category', 'Amount']],
            body: financialData,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
            theme: 'striped',
            margin: { left: 40, right: 40 },
          });
        } else {
          alert('No financial data available to export.');
        }

        let finalY = startY + (financialData.length * 20) + 30;
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          finalY = doc.lastAutoTable.finalY + 20;
        }

        // Transaction Counts
        if (finalY > 700) {
          doc.addPage();
          finalY = 40;
        }
        finalY += 10;

        const transactionData = [
          ['Tickets', String(summary.tickets?.length || 0)],
          ['Sales', String(summary.sales?.length || 0)],
          ['Expenses', String(summary.expenses?.length || 0)],
        ];

        if (Array.isArray(transactionData) && transactionData.length) {
          autoTable(doc, {
            startY: finalY,
            head: [['Type', 'Count']],
            body: transactionData,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [156, 39, 176], textColor: 255, fontStyle: 'bold' },
            theme: 'striped',
            margin: { left: 40, right: 40 },
          });
        } else {
          alert('No transaction data available to export.');
        }

        finalY = finalY + (transactionData.length * 20) + 30;
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          finalY = doc.lastAutoTable.finalY + 20;
        }

        // Daily Tickets Table (all records)
        if (dailyTickets.length > 0) {
          if (finalY > 700) {
            doc.addPage();
            finalY = 40;
          }
          finalY += 10;

          const ticketsData = dailyTickets.map(ticket => [
            ticket.ticketNo || '—',
            ticket.name || '—',
            `Rs ${formatNumber(ticket.fee)}`,
            ticket.time || '—',
            `${ticket.totalExtraMinutes || 0} min`,
          ]);

          const tableHead = [['Ticket No', 'Customer', 'Fee', 'Time', 'Extra Time']];
          const tableBody = ticketsData;
          if (Array.isArray(tableHead) && tableHead.length > 0 && Array.isArray(tableBody) && tableBody.length > 0) {
            autoTable(doc, {
              startY: finalY,
              head: tableHead,
              body: tableBody,
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [30, 144, 255], textColor: 255, fontStyle: 'bold' },
              theme: 'striped',
              margin: { left: 40, right: 40 },
            });
          } else {
            alert('No ticket data available to export.');
          }

          finalY = finalY + (ticketsData.length * 15) + 20;
          if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
            finalY = doc.lastAutoTable.finalY + 20;
          }
        }

        // Daily Sales Table (all records)
        if (dailySales.length > 0) {
          if (finalY > 700) {
            doc.addPage();
            finalY = 40;
          }
          finalY += 10;

          const salesData = dailySales.map(sale => [
            sale.saleNo || '—',
            sale.customerName || '—',
            `Rs ${formatNumber(sale.totalAmount)}`,
            sale.paymentMethod || '—',
          ]);

          const tableHead = [['Sale No', 'Customer', 'Total', 'Payment']];
          const tableBody = salesData;
          if (Array.isArray(tableHead) && tableHead.length > 0 && Array.isArray(tableBody) && tableBody.length > 0) {
            autoTable(doc, {
              startY: finalY,
              head: tableHead,
              body: tableBody,
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold' },
              theme: 'striped',
              margin: { left: 40, right: 40 },
            });
          } else {
            alert('No sales data available to export.');
          }

          finalY = finalY + (salesData.length * 15) + 20;
          if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
            finalY = doc.lastAutoTable.finalY + 20;
          }
        }

        // Daily Expenses Table (all records)
        if (dailyExpenses.length > 0) {
          if (finalY > 700) {
            doc.addPage();
            finalY = 40;
          }
          finalY += 10;

          const expensesData = dailyExpenses.map(expense => [
            expense.expenseNo || '—',
            expense.category || '—',
            `Rs ${formatNumber(expense.amount)}`,
            expense.staff?.name || '—',
          ]);

          const tableHead = [['Expense No', 'Category', 'Amount', 'Staff']];
          const tableBody = expensesData;
          if (Array.isArray(tableHead) && tableHead.length > 0 && Array.isArray(tableBody) && tableBody.length > 0) {
            autoTable(doc, {
              startY: finalY,
              head: tableHead,
              body: tableBody,
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
              theme: 'striped',
              margin: { left: 40, right: 40 },
            });
          } else {
            alert('No expense data available to export.');
          }
        }

      } else if (activeTab === 'range' && rangeSummary) {
        // Totals Summary
        startY += 10;
        const totalsData = [
          ['Total Tickets', String(rangeSummary.totals.totalTickets || 0)],
          ['Total Revenue', `Rs ${formatNumber(rangeSummary.totals.totalRevenue)}`],
          ['Total Expenses', `Rs ${formatNumber(rangeSummary.totals.totalExpenses)}`],
          ['Net Profit/Loss', `Rs ${formatNumber(rangeSummary.totals.totalProfitLoss)}`],
        ];

        if (Array.isArray(totalsData) && totalsData.length) {
          autoTable(doc, {
            startY: startY,
            head: [['Category', 'Amount']],
            body: totalsData,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
            theme: 'striped',
            margin: { left: 40, right: 40 },
          });
        } else {
          alert('No totals data available to export.');
        }

        let finalY = startY + (totalsData.length * 20) + 30;
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          finalY = doc.lastAutoTable.finalY + 20;
        }

        // Daily Breakdown Table
        if (rangeSummary.summaries && rangeSummary.summaries.length > 0) {
          if (finalY > 650) {
            doc.addPage();
            finalY = 40;
          }
          finalY += 10;

          const breakdownData = rangeSummary.summaries.map((day) => [
            new Date(day.date.englishDate).toLocaleDateString(),
            String(day.totalTickets || 0),
            `Rs ${formatNumber(day.totalTicketSales)}`,
            `Rs ${formatNumber(day.totalOtherSales)}`,
            `Rs ${formatNumber(day.totalExpenses)}`,
            `Rs ${formatNumber(day.profitLoss)}`,
          ]);

          const tableHead = [['Date', 'Tickets', 'Ticket Revenue', 'Other Sales', 'Expenses', 'Profit/Loss']];
          const tableBody = breakdownData;
          if (Array.isArray(tableHead) && tableHead.length > 0 && Array.isArray(tableBody) && tableBody.length > 0) {
            autoTable(doc, {
              startY: finalY,
              head: tableHead,
              body: tableBody,
              styles: { fontSize: 8, cellPadding: 3 },
              headStyles: { fillColor: [156, 39, 176], textColor: 255, fontStyle: 'bold' },
              theme: 'striped',
              margin: { left: 40, right: 40 },
            });
          } else {
            alert('No breakdown data available to export.');
          }
        }
      }

      // No footer

      // Use blob-based download for better compatibility in production
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Summary_Report_${activeTab === 'daily' ? selectedDate : `${dateRange.startDate}_to_${dateRange.endDate}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF report: ${error.message}. Please check the console for details.`);
    }
  };

  if (summaryLoading && !summary) {
    return <Loader text="Loading reports..." />;
  }

  return (
    <div className="summary-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .summary-page-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        .main-content {
          margin-left: 250px !important;
          width: calc(100% - 250px) !important;
        }
        .main-content .content-area {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        /* Mobile override */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .main-content .content-area { max-width: 720px !important; margin: 12px auto !important; padding: 18px !important; background-color: white !important; border-radius: 10px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        }
      `}</style>
      <NotificationContainer />

        {/* Date Range Selector */}
        <SectionCard title="Report Type" icon="📅" accentColor="#27ae60">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <GradientButton
              onClick={() => setActiveTab('daily')}
              color={activeTab === 'daily' ? '#9b59b6' : '#95a5a6'}
              style={{ fontSize: '0.95rem', padding: '10px 20px' }}
            >
              Daily Summary
            </GradientButton>
            <GradientButton
              onClick={() => setActiveTab('range')}
              color={activeTab === 'range' ? '#9b59b6' : '#95a5a6'}
              style={{ fontSize: '0.95rem', padding: '10px 20px' }}
            >
              Date Range
            </GradientButton>
            <GradientButton
              onClick={exportToPDF}
              color="#3498db"
              style={{ fontSize: '0.95rem', padding: '10px 20px', marginLeft: 'auto' }}
            >
              📄 Export PDF
            </GradientButton>
          </div>

          {activeTab === 'daily' && (
            <div className="d-flex gap-2 align-center mt-2 flex-wrap">
              <label className="form-label mb-0">Date</label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || defaultDate)}
                style={{ width: '170px' }}
              />
              <GradientButton
                onClick={handleDailyRefresh}
                disabled={summaryLoading || dailyDetailsLoading}
                color="#2ecc71"
                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              >
                {(summaryLoading || dailyDetailsLoading) ? 'Loading...' : '🔄 Reload'}
              </GradientButton>
            </div>
          )}

          {activeTab === 'range' && (
            <div className="d-flex gap-2 align-center mt-2 flex-wrap">
              <input
                type="date"
                className="form-control"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                style={{ width: '170px' }}
              />
              <span>to</span>
              <input
                type="date"
                className="form-control"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                style={{ width: '170px' }}
              />
              <GradientButton
                onClick={fetchRangeSummary}
                disabled={rangeLoading}
                color="#2ecc71"
                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              >
                {rangeLoading ? 'Loading...' : 'Generate'}
              </GradientButton>
            </div>
          )}
        </SectionCard>

        <div id="report-content">
          {/* Daily Summary */}
          {activeTab === 'daily' && summary && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <SectionCard title="Daily Financial Summary" icon="💰" accentColor="#27ae60">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <ModernStat 
                      value={summary.totalTickets} 
                      label="Tickets Sold" 
                      color="#3498db"
                      icon="🎟️"
                    />
                    <ModernStat 
                      value={summary.totalTicketSales} 
                      label="Ticket Revenue" 
                      color="#2ecc71"
                      icon="💵"
                    />
                    <ModernStat 
                      value={summary.totalOtherSales} 
                      label="Other Sales" 
                      color="#3498db"
                      icon="🛒"
                    />
                    <ModernStat 
                      value={summary.totalExpenses} 
                      label="Total Expenses" 
                      color="#e74c3c"
                      icon="📉"
                    />
                    <ModernStat 
                      value={summary.profitLoss} 
                      label="Net Profit/Loss" 
                      color={summary.profitLoss >= 0 ? '#27ae60' : '#e74c3c'}
                      icon={summary.profitLoss >= 0 ? '📈' : '📉'}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Transaction Details" icon="📋" accentColor="#27ae60">
                  <div className="d-flex justify-between mb-2">
                    <span>Total Revenue:</span>
                    <strong className="text-success">
                      {formatCurrency(summary.totalRevenue)}
                    </strong>
                  </div>
                  <div className="d-flex justify-between mb-2">
                    <span>Total Expenses:</span>
                    <strong className="text-danger">
                      {formatCurrency(summary.totalExpenses)}
                    </strong>
                  </div>
                  <div className="d-flex justify-between mb-2">
                    <span>Net Profit/Loss:</span>
                    <strong style={{ 
                      color: summary.profitLoss >= 0 ? '#27ae60' : '#e74c3c' 
                    }}>
                      {formatCurrency(summary.profitLoss)}
                    </strong>
                  </div>
                  <hr />
                  <div className="d-flex justify-between mb-1">
                    <span>Tickets:</span>
                    <span>{summary.tickets?.length || 0}</span>
                  </div>
                  <div className="d-flex justify-between mb-1">
                    <span>Sales:</span>
                    <span>{summary.sales?.length || 0}</span>
                  </div>
                  <div className="d-flex justify-between">
                    <span>Expenses:</span>
                    <span>{summary.expenses?.length || 0}</span>
                  </div>
                </SectionCard>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px',
                alignItems: 'stretch',
                marginTop: '24px',
                width: '100%' 
              }}>
              {/* Daily Tickets */}
              <SectionCard 
                title={<div style={{textAlign:'center'}}><span style={{fontSize:'2rem',display:'block',lineHeight:1}}>🎟️</span>Daily Tickets</div>} 
                accentColor="#27ae60"
                style={{ width: '100%', maxWidth: '100%', flex: 'unset' }}
                headerActions={<span style={{ color: '#2ecc71', fontWeight: 700, fontSize: '1.15rem' }}>{formatCurrency(totalTicketRevenue)}</span>}
              >
                  {dailyDetailsLoading ? (
                    <p className="text-center text-muted">Loading tickets...</p>
                  ) : dailyTickets.length === 0 ? (
                    <p className="text-center text-muted">No tickets for this date</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ticket No</th>
                          <th>Customer</th>
                          <th>Fee</th>
                          <th>Time</th>
                          <th>Extra Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyTickets.map((ticket) => (
                          <tr key={ticket._id}>
                            <td>{ticket.ticketNo}</td>
                            <td>{ticket.name}</td>
                            <td>{formatCurrency(ticket.fee)}</td>
                            <td>{ticket.time}</td>
                            <td>{ticket.totalExtraMinutes || 0} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {dailyTickets.length > 0 && (
                    <div className="text-right text-muted">
                      Total: {dailyTickets.length} tickets
                    </div>
                  )}
                </SectionCard>
              {/* Daily Sales */}
              <SectionCard 
                title={<div style={{textAlign:'center'}}><span style={{fontSize:'2rem',display:'block',lineHeight:1}}>🛒</span>Daily Sales</div>} 
                accentColor="#1976d2"
                style={{ width: '100%', maxWidth: '100%', flex: 'unset' }}
                headerActions={<span style={{ color: '#3498db', fontWeight: 700, fontSize: '1.15rem' }}>{formatCurrency(totalSalesAmount)}</span>}
              >
                  {dailyDetailsLoading ? (
                    <p className="text-center text-muted">Loading sales...</p>
                  ) : dailySales.length === 0 ? (
                    <p className="text-center text-muted">No sales for this date</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Sale No</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySales.map((sale) => (
                          <tr key={sale._id}>
                            <td>{sale.saleNo}</td>
                            <td>{sale.customerName}</td>
                            <td>{formatCurrency(sale.totalAmount)}</td>
                            <td>{sale.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {dailySales.length > 0 && (
                    <div className="text-right text-muted">
                      Total: {dailySales.length} sales
                    </div>
                  )}
                </SectionCard>
              {/* Daily Expenses */}
              <SectionCard 
                title={<div style={{textAlign:'center'}}><span style={{fontSize:'2rem',display:'block',lineHeight:1}}>📉</span>Daily Expenses</div>} 
                accentColor="#e74c3c"
                style={{ width: '100%', maxWidth: '100%', flex: 'unset' }}
                headerActions={<span style={{ color: '#e74c3c', fontWeight: 700, fontSize: '1.15rem' }}>{formatCurrency(totalExpenseAmount)}</span>}
              >
                  {dailyDetailsLoading ? (
                    <p className="text-center text-muted">Loading expenses...</p>
                  ) : dailyExpenses.length === 0 ? (
                    <p className="text-center text-muted">No expenses for this date</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Expense No</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Staff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyExpenses.map((expense) => (
                          <tr key={expense._id}>
                            <td>{expense.expenseNo}</td>
                            <td>{expense.category}</td>
                            <td>{formatCurrency(expense.amount)}</td>
                            <td>{expense.staff?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {dailyExpenses.length > 0 && (
                    <div className="text-right text-muted">
                      Total: {dailyExpenses.length} expenses
                    </div>
                  )}
                </SectionCard>
            </div>
            </>
          )}

          {/* Range Summary */}
          {activeTab === 'range' && rangeSummary && (
            <>
              <SectionCard 
                title={`Date Range Summary: ${dateRange.startDate} to ${dateRange.endDate}`}
                icon="📊"
                accentColor="#27ae60"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <ModernStat 
                    value={rangeSummary.totals.totalTickets} 
                    label="Total Tickets" 
                    color="#3498db"
                    icon="🎟️"
                  />
                  <ModernStat 
                    value={rangeSummary.totals.totalRevenue} 
                    label="Total Revenue" 
                    color="#2ecc71"
                    icon="💰"
                  />
                  <ModernStat 
                    value={rangeSummary.totals.totalExpenses} 
                    label="Total Expenses" 
                    color="#e74c3c"
                    icon="📉"
                  />
                  <ModernStat 
                    value={rangeSummary.totals.totalProfitLoss} 
                    label="Net Profit/Loss" 
                    color={rangeSummary.totals.totalProfitLoss >= 0 ? '#27ae60' : '#e74c3c'}
                    icon={rangeSummary.totals.totalProfitLoss >= 0 ? '📈' : '📉'}
                  />
                </div>
              </SectionCard>

              {/* Daily Breakdown */}
              <SectionCard title="Daily Breakdown" icon="📅" accentColor="#14532d">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tickets</th>
                      <th>Ticket Revenue</th>
                      <th>Other Sales</th>
                      <th>Expenses</th>
                      <th>Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeSummary.summaries.map((day, index) => (
                      <tr key={index}>
                        <td>
                          {new Date(day.date.englishDate).toLocaleDateString()}
                          <br />
                          <small>{day.date.nepaliDate}</small>
                        </td>
                        <td>{day.totalTickets}</td>
                        <td className="text-success">{formatCurrency(day.totalTicketSales)}</td>
                        <td className="text-info">{formatCurrency(day.totalOtherSales)}</td>
                        <td className="text-danger">{formatCurrency(day.totalExpenses)}</td>
                        <td style={{ 
                          color: day.profitLoss >= 0 ? '#27ae60' : '#e74c3c' 
                        }}>
                          {formatCurrency(day.profitLoss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </>
          )}

          {/* Quick Stats */}
          {summary && (
            <SectionCard title="Quick Stats" icon="⚡" accentColor="#27ae60">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <ModernStat 
                  value={summary.tickets?.length || 0} 
                  label="Today's Tickets" 
                  color="#e74c3c"
                  icon="🎟️"
                />
                <ModernStat 
                  value={summary.sales?.length || 0} 
                  label="Today's Sales" 
                  color="#27ae60"
                  icon="🛒"
                />
                <ModernStat 
                  value={summary.expenses?.length || 0} 
                  label="Today's Expenses" 
                  color="#f39c12"
                  icon="📉"
                />
              </div>
            </SectionCard>
          )}
        </div>

        {!summary && activeTab === 'daily' && (
          <SectionCard title="No Data" icon="📭" accentColor="#14532d">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '20px' }}>No summary data available</p>
              <GradientButton 
                onClick={fetchDailySummary}
                color="#2ecc71"
              >
                Load Summary
              </GradientButton>
            </div>
          </SectionCard>
        )}

        {activeTab === 'range' && !rangeSummary && (
          <SectionCard title="No Data" icon="📭" accentColor="#14532d">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '1.1rem', color: '#7f8c8d' }}>Select a date range and generate report</p>
            </div>
          </SectionCard>
        )}
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Summary;