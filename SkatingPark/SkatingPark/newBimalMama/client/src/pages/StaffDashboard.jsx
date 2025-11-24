import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI, salesAPI, expensesAPI, summaryAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import TicketPrint from '../components/TicketPrint';
import logo from '/valyntix-logo.png.jpg';

const StaffDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentBranch, user } = useApp();

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    name: '',
    playerNames: '',
    ticketType: 'Adult',
    fee: '100',
    remarks: ''
  });
  const [showPrint, setShowPrint] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const printContentRef = useRef(null);
  const nameInputRef = useRef(null);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sales state
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    items: [{ itemName: '', quantity: 1, price: 0, total: 0 }],
    paymentMethod: 'Cash',
    remarks: ''
  });

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    description: '',
    amount: '',
    receiptNo: '',
    vendor: '',
    paymentMethod: 'Cash',
    remarks: ''
  });
  const [customCategories, setCustomCategories] = useState([]);

  useEffect(() => {
    if (currentBranch) {
      fetchDashboardData();
      fetchTickets();
      fetchSales();
      fetchExpenses();
      fetchCategories();
    }
  }, [currentBranch, todayDate]);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Auto print functionality
  useEffect(() => {
    if (autoPrint && selectedTicket && printContentRef.current) {
      const printContent = printContentRef.current.innerHTML;
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Ticket</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 0; font-family: 'Courier New', monospace; background: white; width: 80mm; font-size: 10px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .ticket-print { width: 76mm; padding: 2mm; box-sizing: border-box; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        <style>{`
          .staff-dashboard-wrapper {
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
    }
  };

  const fetchTickets = async () => {
    if (!currentBranch) return;
    try {
      setTicketsLoading(true);
      const response = await ticketsAPI.getAll({ limit: 200, date: todayDate });
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchSales = async () => {
    if (!currentBranch) return;
    try {
      setSalesLoading(true);
      const response = await salesAPI.getAll({ branch: currentBranch._id, limit: 50 });
      setSales(response.data.sales.slice(0, 10)); // Show only recent 10
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!currentBranch) return;
    try {
      setExpensesLoading(true);
      const response = await expensesAPI.getAll({ branch: currentBranch._id, limit: 50 });
      setExpenses(response.data.expenses.slice(0, 10)); // Show only recent 10
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setExpensesLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await expensesAPI.getCategories();
      setCustomCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Ticket handlers
  const handleQuickAddSubmit = async () => {
    if (!quickAddData.name.trim() && !quickAddData.playerNames.trim()) {
      alert('Please enter customer name or player names');
      return;
    }
    try {
      setTicketsLoading(true);
      const ticketData = {
        name: quickAddData.name.trim() || 'Customer',
        playerNames: quickAddData.playerNames,
        ticketType: quickAddData.ticketType,
        fee: parseFloat(quickAddData.fee) || 100,
        remarks: quickAddData.remarks
      };
      const response = await ticketsAPI.quickCreate(ticketData);
      const newTicket = response.data.ticket;
      setTickets([newTicket, ...tickets]);
      setQuickAddData({
        name: '',
        playerNames: '',
        ticketType: 'Adult',
        fee: '100',
        remarks: ''
      });
      setSelectedTicket(newTicket);
      setAutoPrint(true);
      setShowPrint(true);
      if (nameInputRef.current) {
        setTimeout(() => nameInputRef.current.focus(), 100);
      }
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket: ' + (error.response?.data?.message || error.message));
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAddSubmit();
    }
  };

  const ticketTypes = {
    'Adult': { price: 100, label: 'Adult' }
  };

  // Sales handlers
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updatedItem = {
          ...item,
          [field]: field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value
        };
        const quantity = Number(updatedItem.quantity) || 0;
        const price = Number(updatedItem.price) || 0;
        updatedItem.total = quantity * price;
        return updatedItem;
      });
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemName: '', quantity: 1, price: 0, total: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  };

  const handleSalesSubmit = async (e) => {
    e.preventDefault();
    try {
      setSalesLoading(true);
      const response = await salesAPI.create({
        ...formData,
        branch: currentBranch._id
      });
      setSales([response.data.sale, ...sales]);
      setFormData({
        customerName: '',
        items: [{ itemName: '', quantity: 1, price: 0, total: 0 }],
        paymentMethod: 'Cash',
        remarks: ''
      });
      alert('Sale recorded successfully!');
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error recording sale');
    } finally {
      setSalesLoading(false);
    }
  };

  // Expenses handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseFormData.category || !expenseFormData.amount) {
      alert('Please fill in category and amount');
      return;
    }
    try {
      setExpensesLoading(true);
      const response = await expensesAPI.create({
        ...expenseFormData,
        branch: currentBranch._id,
        amount: parseFloat(expenseFormData.amount)
      });
      setExpenses([response.data.expense, ...expenses]);
      setExpenseFormData({
        category: '',
        description: '',
        amount: '',
        receiptNo: '',
        vendor: '',
        paymentMethod: 'Cash',
        remarks: ''
      });
      alert('Expense recorded successfully!');
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Error recording expense');
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleCategoryKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newCategory = e.target.value.trim();
      if (newCategory && !expenseCategories.includes(newCategory)) {
        const updatedCategories = [...customCategories, newCategory];
        setCustomCategories(updatedCategories);
        localStorage.setItem('expenseCategories', JSON.stringify(updatedCategories));
        setExpenseFormData({ ...expenseFormData, category: newCategory });
        setTimeout(() => {
          document.querySelector('input[name="expense-amount"]')?.focus();
        }, 100);
      }
    }
  };

  const predefinedCategories = ['Maintenance', 'Salary', 'Electricity', 'Rent', 'Supplies', 'Other'];
  const expenseCategories = [...predefinedCategories, ...customCategories];

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const formatCurrency = (value) => `रु ${Number(value || 0).toLocaleString()}`;
  const formattedTotalAmount = formatCurrency(totalAmount);
  const isFormValid =
    formData.customerName.trim().length > 0 &&
    formData.items.some(item => item.itemName.trim() && Number(item.quantity) > 0 && Number(item.price) > 0) &&
    totalAmount > 0;

  if (loading && !stats) {
    return <Loader text="Loading dashboard..." />;
  }

  return (
    <div className="staff-dashboard-page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .staff-dashboard-page-wrapper {
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
      `}</style>
      <NotificationContainer />
      <header style={{ textAlign: 'center', margin: '24px 0 8px 0' }}>
        <img src={logo} alt="Valyntix Logo" style={{ maxWidth: 120, height: 'auto', marginBottom: 8 }} />
        <h2 style={{ margin: 0, fontWeight: 700, color: '#233043', letterSpacing: 1 }}>Valyntix AI TECH SYSTEM</h2>
      </header>
      <div style={{ flex: 1 }}>
        <div className="d-flex justify-between align-center mb-3">
          <div>
            <p className="text-muted mb-0">Welcome, {user?.name}! - {currentBranch?.branchName}</p>
          </div>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => {
              fetchDashboardData();
              fetchTickets();
              fetchSales();
              fetchExpenses();
            }}
          >
            🔄 Refresh All
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="stats-grid mb-4">
            <div className="stat-card tickets">
              <div className="stat-label">Today's Tickets</div>
              <div className="stat-number">{stats.today.tickets}</div>
              <small>Total tickets sold today</small>
            </div>
            <div className="stat-card sales">
              <div className="stat-label">Today's Sales</div>
              <div className="stat-number">{stats.today.sales}</div>
              <small>Total sales transactions</small>
            </div>
            <div className="stat-card expenses">
              <div className="stat-label">Today's Expenses</div>
              <div className="stat-number">{stats.today.expenses}</div>
              <small>Total expenses recorded</small>
            </div>
            <div className="stat-card profit">
              <div className="stat-label">Net Profit</div>
              <div className="stat-number" style={{ color: stats.totals.netProfit >= 0 ? '#27ae60' : '#14532d' }}>
                रु {stats.totals.netProfit?.toLocaleString()}
              </div>
              <small>Overall profit/loss</small>
            </div>
          </div>
        )}

        {/* Hidden print content */}
        {showPrint && selectedTicket && (
          <div ref={printContentRef} style={{ display: 'none' }}>
            <TicketPrint ticket={selectedTicket} />
          </div>
        )}

        {/* TICKETS SECTION */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">🎫 Tickets</h3>
          </div>
          <div className="card-body">
            {/* Quick Add Ticket Form */}
            <div className="card mb-3" style={{ backgroundColor: '#f0f9f4', border: '2px solid #27ae60' }}>
              <div className="card-body">
                <h5 className="card-title">Quick Ticket Entry</h5>
                <div className="grid grid-5 gap-2">
                  <div>
                    <label className="form-label">Customer Name *</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      className="form-control"
                      value={quickAddData.name}
                      onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Player Names</label>
                    <input
                      type="text"
                      className="form-control"
                      value={quickAddData.playerNames}
                      onChange={(e) => setQuickAddData({ ...quickAddData, playerNames: e.target.value })}
                      onKeyPress={handleKeyPress}
                      placeholder="Rahul, Ritesh, Suresh"
                    />
                    <small className="text-muted">Separate with commas</small>
                  </div>
                  <div>
                    <label className="form-label">Ticket Type</label>
                    <select
                      className="form-control"
                      value={quickAddData.ticketType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setQuickAddData({
                          ...quickAddData,
                          ticketType: type,
                          fee: ticketTypes[type].price.toString()
                        });
                      }}
                    >
                      {Object.entries(ticketTypes).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Fee (NPR) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={quickAddData.fee}
                      onChange={(e) => setQuickAddData({ ...quickAddData, fee: e.target.value })}
                      onKeyPress={handleKeyPress}
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      value={quickAddData.remarks}
                      onChange={(e) => setQuickAddData({ ...quickAddData, remarks: e.target.value })}
                      onKeyPress={handleKeyPress}
                      placeholder="Any remarks"
                    />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button 
                    className="btn btn-success"
                    onClick={handleQuickAddSubmit}
                    disabled={ticketsLoading}
                  >
                    {ticketsLoading ? 'Creating...' : 'Add & Auto-Print (Enter)'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setQuickAddData({
                      name: '',
                      playerNames: '',
                      ticketType: 'Adult',
                      fee: '100',
                      remarks: ''
                    })}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Tickets Table */}
            <div className="table-container">
              <div className="table-header">
                <h4 className="table-title">Today's Tickets ({tickets.length})</h4>
                <button className="btn btn-sm btn-secondary" onClick={fetchTickets} disabled={ticketsLoading}>
                  {ticketsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {tickets.length === 0 ? (
                <div className="empty-state">
                  <p>No tickets found for today</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticket No</th>
                      <th>Customer/Players</th>
                      <th>Type</th>
                      <th>Fee</th>
                      <th>Date/Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice(0, 10).map(ticket => (
                      <tr key={ticket._id} className={ticket.isRefunded ? 'table-danger' : ''}>
                        <td><strong>{ticket.ticketNo}</strong></td>
                        <td>
                          {ticket.name}
                          {ticket.playerNames && ticket.playerNames.length > 0 && (
                            <div className="text-muted small">
                              {ticket.playerNames.join(', ')}
                            </div>
                          )}
                        </td>
                        <td>{ticket.ticketType}</td>
                        <td>
                          <div>
                            <strong>रु {ticket.fee?.toLocaleString()}</strong>
                            {ticket.discount > 0 && (
                              <div>
                                <small className="text-muted" style={{ textDecoration: 'line-through' }}>
                                  रु {((ticket.fee || 0) + (ticket.discount || 0)).toLocaleString()}
                                </small>
                                <small className="text-success" style={{ marginLeft: '5px' }}>
                                  -रु {ticket.discount.toLocaleString()}
                                </small>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <small>
                            {ticket.date?.englishDate 
                              ? new Date(ticket.date.englishDate).toLocaleDateString()
                              : new Date(ticket.createdAt).toLocaleDateString()}
                            <br />
                            {ticket.date?.nepaliDate || '—'}
                          </small>
                        </td>
                        <td>
                          {ticket.isRefunded ? (
                            <span className="badge bg-danger">Refunded</span>
                          ) : (
                            <span className="badge bg-success">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* SALES SECTION */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">💰 Sales</h3>
          </div>
          <div className="card-body">
            {/* Sales Form */}
            <div className="card mb-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #d1f2e8' }}>
              <div className="card-body" style={{ padding: '12px' }}>
                <h5 className="card-title" style={{ fontSize: '1rem', marginBottom: '8px' }}>Record New Sale</h5>
                <form onSubmit={handleSalesSubmit}>
                  <div className="grid grid-2 gap-2">
                    <div>
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          required
                          placeholder="Walk-in customer"
                        />
                      </div>
                      <div className="d-flex justify-between align-center mt-3 mb-2">
                        <label className="form-label mb-0">Sale Items</label>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}>
                          + Add item
                        </button>
                      </div>
                      <div className="d-flex flex-column gap-1">
                        {formData.items.map((item, index) => (
                          <div key={index} className="p-1 rounded" style={{ background: '#ffffff', border: '1px solid #e9ecef' }}>
                            <div className="d-flex justify-between align-center mb-1">
                              <strong style={{ fontSize: '0.9rem' }}>Item {index + 1}</strong>
                              {formData.items.length > 1 && (
                                <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => removeItem(index)}>
                                  ✕
                                </button>
                              )}
                            </div>
                            <div className="grid grid-4 gap-1">
                              <div className="form-group mb-0">
                                <label className="form-label text-muted small">Item Name</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.itemName}
                                  onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label text-muted small">Qty</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                />
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label text-muted small">Price</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.price}
                                  min="0"
                                  step="0.01"
                                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                />
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label text-muted small">Total</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={formatCurrency(item.total)}
                                  readOnly
                                  style={{ backgroundColor: '#f8f9fa', fontWeight: 600 }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <select
                          className="form-control form-control-sm"
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Digital Wallet">Digital Wallet</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div className="p-2 rounded mb-3" style={{ background: '#1e90ff', color: 'white' }}>
                        <div className="d-flex justify-between align-center">
                          <span style={{ fontSize: '0.95rem' }}>Total Due</span>
                          <strong style={{ fontSize: '1.2rem' }}>{formattedTotalAmount}</strong>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Remarks</label>
                        <textarea
                          className="form-control form-control-sm"
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          rows="2"
                          placeholder="Notes or special instructions"
                        />
                      </div>
                      <div className="form-actions mt-2">
                        <button type="button" className="btn btn-sm btn-light" onClick={() => setFormData({
                          customerName: '',
                          items: [{ itemName: '', quantity: 1, price: 0, total: 0 }],
                          paymentMethod: 'Cash',
                          remarks: ''
                        })}>
                          Clear
                        </button>
                        <button type="submit" className="btn btn-sm btn-primary" disabled={salesLoading || !isFormValid}>
                          {salesLoading ? 'Saving...' : 'Record Sale'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent Sales Table */}
            <div className="table-container">
              <div className="table-header">
                <h4 className="table-title">Recent Sales ({sales.length})</h4>
                <button className="btn btn-sm btn-secondary" onClick={fetchSales} disabled={salesLoading}>
                  {salesLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {sales.length === 0 ? (
                <div className="empty-state">
                  <p>No sales found</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sale No</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale._id}>
                        <td><strong>{sale.saleNo}</strong></td>
                        <td>{sale.customerName}</td>
                        <td>
                          {sale.items?.map(i => `${i.itemName} (x${i.quantity})`).join(', ') || 'N/A'}
                        </td>
                        <td>रु {sale.totalAmount?.toLocaleString()}</td>
                        <td>{sale.paymentMethod}</td>
                        <td>
                          <small>
                            {sale.date?.englishDate 
                              ? new Date(sale.date.englishDate).toLocaleDateString()
                              : new Date(sale.createdAt).toLocaleDateString()}
                            <br />
                            {sale.date?.nepaliDate || '—'}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* EXPENSES SECTION */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">📝 Expenses</h3>
          </div>
          <div className="card-body">
            {/* Expense Form */}
            <div className="card mb-3" style={{ backgroundColor: '#f0f9f4', border: '1px solid #27ae60' }}>
              <div className="card-body">
                <h5 className="card-title">Add New Expense</h5>
                <form onSubmit={handleExpenseSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Category *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={expenseFormData.category}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                        onKeyPress={handleCategoryKeyPress}
                        list="categoryOptions"
                        required
                        placeholder="Type category and press Enter"
                      />
                      <datalist id="categoryOptions">
                        {expenseCategories.map(category => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (NPR) *</label>
                      <input
                        type="number"
                        name="expense-amount"
                        className="form-control"
                        value={expenseFormData.amount}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vendor</label>
                      <input
                        type="text"
                        className="form-control"
                        value={expenseFormData.vendor}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, vendor: e.target.value })}
                        placeholder="Enter vendor name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-control"
                        value={expenseFormData.paymentMethod}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value })}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Receipt No</label>
                      <input
                        type="text"
                        className="form-control"
                        value={expenseFormData.receiptNo}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, receiptNo: e.target.value })}
                        placeholder="Enter receipt number"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        value={expenseFormData.description}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                        placeholder="Enter expense description"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        value={expenseFormData.remarks}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })}
                        rows="2"
                        placeholder="Any additional notes"
                      />
                    </div>
                  </div>
                  <div className="form-actions mt-3">
                    <button type="button" className="btn btn-light" onClick={() => setExpenseFormData({
                      category: '',
                      description: '',
                      amount: '',
                      receiptNo: '',
                      vendor: '',
                      paymentMethod: 'Cash',
                      remarks: ''
                    })}>
                      Clear
                    </button>
                    <button type="submit" className="btn btn-warning" disabled={expensesLoading}>
                      {expensesLoading ? 'Saving...' : 'Record Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent Expenses Table */}
            <div className="table-container">
              <div className="table-header">
                <h4 className="table-title">Recent Expenses ({expenses.length})</h4>
                <button className="btn btn-sm btn-secondary" onClick={fetchExpenses} disabled={expensesLoading}>
                  {expensesLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {expenses.length === 0 ? (
                <div className="empty-state">
                  <p>No expenses found</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Vendor</th>
                      <th>Payment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(expense => (
                      <tr key={expense._id}>
                        <td><strong>{expense.category}</strong></td>
                        <td>{expense.description || '—'}</td>
                        <td>रु {expense.amount?.toLocaleString()}</td>
                        <td>{expense.vendor || '—'}</td>
                        <td>{expense.paymentMethod}</td>
                        <td>
                          <small>
                            {expense.date?.englishDate 
                              ? new Date(expense.date.englishDate).toLocaleDateString()
                              : new Date(expense.createdAt).toLocaleDateString()}
                            <br />
                            {expense.date?.nepaliDate || '—'}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default StaffDashboard;
