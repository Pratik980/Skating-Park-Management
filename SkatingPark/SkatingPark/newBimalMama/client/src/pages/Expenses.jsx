import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { expensesAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import Modal from 'react-modal';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    receiptNo: '',
    vendor: '',
    paymentMethod: 'Cash',
    remarks: ''
  });
  const [customCategories, setCustomCategories] = useState([]);
  const [previewExpense, setPreviewExpense] = useState(null);
  const { currentBranch, user } = useApp();



useEffect(() => {
  fetchExpenses();
  fetchCategories();
}, [currentBranch]);

const fetchCategories = async () => {
  try {
    const response = await expensesAPI.getCategories();
    setCustomCategories(response.data.categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

  const fetchExpenses = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await expensesAPI.getAll({ branch: currentBranch._id });
      setExpenses(response.data.expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      alert('Error loading expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      alert('Please fill in category and amount');
      return;
    }
    
    try {
      setLoading(true);
      const response = await expensesAPI.create({
        ...formData,
        branch: currentBranch._id,
        amount: parseFloat(formData.amount)
      });
      
      setExpenses([response.data.expense, ...expenses]);
      setFormData({
        category: '',
        description: '',
        amount: '',
        receiptNo: '',
        vendor: '',
        paymentMethod: 'Cash',
        remarks: ''
      });
      alert('Expense recorded successfully!');
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Error recording expense');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, category: value });
  };

  const handleCategoryKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newCategory = e.target.value.trim();
      
      if (newCategory && !expenseCategories.includes(newCategory)) {
        // Add to custom categories
        const updatedCategories = [...customCategories, newCategory];
        setCustomCategories(updatedCategories);
        localStorage.setItem('expenseCategories', JSON.stringify(updatedCategories));
        
        // Set as current category
        setFormData({ ...formData, category: newCategory });
        
        // Focus on amount field
        setTimeout(() => {
          document.querySelector('input[name="amount"]')?.focus();
        }, 100);
      }
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense record? This action cannot be undone.')) {
      try {
        await expensesAPI.delete(expenseId);
        setExpenses(expenses.filter(e => e._id !== expenseId));
        alert('Expense record deleted successfully');
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense record');
      }
    }
  };

  const predefinedCategories = [
    'Maintenance',
    'Salary',
    'Electricity',
    'Rent',
    'Supplies',
    'Other'
  ];

  const expenseCategories = [...predefinedCategories, ...customCategories];

  // Render expense receipt HTML
  const renderExpenseReceiptHtml = (expense, title = 'Expense Receipt') => {
    const staffName = expense.staff?.name || '—';
    const date = expense.date?.englishDate ? new Date(expense.date.englishDate).toLocaleDateString() : '—';
    const nepaliDate = expense.date?.nepaliDate || '—';
    
    return `
    <div style='max-width:480px;margin:0 auto;background:white;padding:20px;font-family:Arial,sans-serif;'>
      <div style='text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px;'>
        <h2 style='margin:0;font-size:22px;font-weight:bold;'>${title}</h2>
      </div>
      <table style='width:100%;border-collapse:collapse;margin-bottom:16px;'>
        <tr><td style='padding:6px 0;font-weight:bold;width:40%;'>Expense No:</td><td style='padding:6px 0;'>${expense.expenseNo || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Category:</td><td style='padding:6px 0;'>${expense.category || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Description:</td><td style='padding:6px 0;'>${expense.description || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Amount:</td><td style='padding:6px 0;font-size:18px;color:#d32f2f;font-weight:bold;'>रु ${expense.amount ? expense.amount.toLocaleString() : '0'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Vendor:</td><td style='padding:6px 0;'>${expense.vendor || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Payment Method:</td><td style='padding:6px 0;'>${expense.paymentMethod || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Receipt No:</td><td style='padding:6px 0;'>${expense.receiptNo || '—'}</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Date:</td><td style='padding:6px 0;'>${date} (${nepaliDate})</td></tr>
        <tr><td style='padding:6px 0;font-weight:bold;'>Staff:</td><td style='padding:6px 0;'>${staffName}</td></tr>
        ${expense.remarks ? `<tr><td style='padding:6px 0;font-weight:bold;'>Remarks:</td><td style='padding:6px 0;'>${expense.remarks}</td></tr>` : ''}
      </table>
      <div style='text-align:center;color:#125a15;font-weight:700;font-size:15px;margin-top:14px;'>धन्यवाद!</div>
    </div>`;
  };

  // Print expense receipt
  const printExpenseReceipt = (expense, title = 'Expense Receipt') => {
    if (!expense) return;
    const html = renderExpenseReceiptHtml(expense, title);
    const win = window.open('', '_blank', 'width=480,height=870');
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body style='margin:0;background:#e8edfa'>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),700);}</script></body></html>`);
    win.document.close();
  };

  // Print all expense receipts one by one
  const printAllExpenses = async (expensesToPrint) => {
    if (!expensesToPrint || expensesToPrint.length === 0) {
      alert('No expenses to print');
      return;
    }

    // Print each expense with a delay to allow print dialog to appear
    for (let i = 0; i < expensesToPrint.length; i++) {
      const expense = expensesToPrint[i];
      printExpenseReceipt(expense, `Expense Receipt - ${expense.expenseNo || i + 1}`);
      
      // Wait before printing next (except for last one)
      if (i < expensesToPrint.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  if (loading && expenses.length === 0) {
    return <Loader text="Loading expenses..." />;
  }

  return (
    <div className="expenses-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .expenses-wrapper {
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

      {/* Expense Form - Always Visible */}
      {(user?.role === 'admin' || user?.role === 'staff') && (
        <SectionCard title="Add New Expense" icon="➕" accentColor="#27ae60">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    onKeyPress={handleCategoryKeyPress}
                    list="categoryOptions"
                    required
                    placeholder="Type category and press Enter to add new"
                  />
                  <datalist id="categoryOptions">
                    {expenseCategories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <small className="form-text text-muted">
                    Select from list or type new category and press Enter
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (NPR) *</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt No (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.receiptNo}
                    onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                    placeholder="Enter receipt number"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter expense description"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Remarks (Optional)</label>
                  <textarea
                    className="form-control"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows="2"
                    placeholder="Any additional remarks"
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <GradientButton 
                  type="submit" 
                  disabled={loading || !formData.category || !formData.amount}
                  color="#27ae60"
                >
                  {loading ? 'Processing...' : 'Add Expense'}
                </GradientButton>
              </div>
            </form>
        </SectionCard>
      )}

      {/* Expenses List */}
      <SectionCard 
        title="Expense Records" 
        icon="📋"
        accentColor="#27ae60"
        headerActions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {expenses.length > 0 && (
              <GradientButton
                onClick={() => printAllExpenses(expenses)}
                color="#27ae60"
                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                title="Print All Expense Receipts"
              >
                🖨️ Print All
              </GradientButton>
            )}
            <GradientButton 
              onClick={fetchExpenses}
              disabled={loading}
              color="#14532d"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </GradientButton>
          </div>
        }
      >

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p style={{ fontSize: '1.1rem' }}>No expense records found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Expense No</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Vendor</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Staff</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense._id}>
                    <td data-label="Expense No"><strong>{expense.expenseNo}</strong></td>
                    <td data-label="Category">
                      <span className={`badge ${
                        expense.category === 'Maintenance' ? 'bg-warning' :
                        expense.category === 'Salary' ? 'bg-info' :
                        expense.category === 'Electricity' ? 'bg-primary' :
                        expense.category === 'Rent' ? 'bg-secondary' :
                        expense.category === 'Supplies' ? 'bg-success' : 'bg-dark'
                      }`}>
                        {expense.category}
                      </span>
                    </td>
                    <td data-label="Description">{expense.description || '-'}</td>
                    <td data-label="Amount" className="text-danger">
                      <strong>रु {expense.amount.toLocaleString()}</strong>
                    </td>
                    <td data-label="Vendor">{expense.vendor || '-'}</td>
                    <td data-label="Payment">{expense.paymentMethod}</td>
                    <td data-label="Date">
                      {new Date(expense.date.englishDate).toLocaleDateString()}
                      <br />
                      <small>{expense.date.nepaliDate}</small>
                    </td>
                    <td data-label="Staff">{expense.staff?.name}</td>
                    {user?.role === 'admin' && (
                      <td data-label="Actions">
                        <div className="d-flex gap-1">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setPreviewExpense(expense)}
                            title="Preview Expense"
                          >
                            👁️
                          </button>
                          <button 
                            className="btn btn-sm btn-info"
                            onClick={() => printExpenseReceipt(expense)}
                            title="Print Expense"
                          >
                            🖨️
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(expense._id)}
                            title="Delete Expense"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Summary Stats */}
      {expenses.length > 0 && (
        <SectionCard title="Expense Summary" icon="📊" accentColor="#e74c3c">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <ModernStat 
              value={expenses.length} 
              label="Total Expenses" 
              color="#27ae60"
              icon="📝"
            />
            <ModernStat 
              value={expenses.reduce((sum, expense) => sum + expense.amount, 0)} 
              label="Total Amount" 
              color="#14532d"
              icon="💰"
            />
            <ModernStat 
              value={expenses.filter(e => e.category === 'Maintenance').length} 
              label="Maintenance" 
              color="#f39c12"
              icon="🔧"
            />
            <ModernStat 
              value={expenses.filter(e => e.category === 'Salary').length} 
              label="Salary" 
              color="#3498db"
              icon="💼"
            />
          </div>

          {/* Category Breakdown */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '16px', fontWeight: 700 }}>Category Breakdown</h4>
            {Array.from(new Set(expenses.map(e => e.category))).map(category => {
              const categoryExpenses = expenses.filter(e => e.category === category);
              const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
              
              return (
                <div key={category} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  background: 'rgba(231, 76, 60, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(231, 76, 60, 0.1)'
                }}>
                  <span style={{ fontWeight: 600, color: '#2c3e50' }}>{category}</span>
                  <span style={{ color: '#e74c3c', fontWeight: 700 }}>रु {total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <style jsx>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .full-width {
          grid-column: 1 / -1;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }
        
        .responsive-table {
          overflow-x: auto;
        }
        
        .category-breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .stat-item {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .stat-number {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: #6c757d;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          
          .table {
            font-size: 0.875rem;
          }
          
          .table th,
          .table td {
            padding: 0.5rem;
          }
          
          .card-body {
            padding: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .table {
            font-size: 0.8rem;
          }
          
          .stat-number {
            font-size: 1.25rem;
          }
        }
        
        /* Responsive table for mobile */
        @media (max-width: 768px) {
          .responsive-table table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .responsive-table thead {
            display: none;
          }
          
          .responsive-table tr {
            display: block;
            margin-bottom: 1rem;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 0.75rem;
          }
          
          .responsive-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border: none;
            border-bottom: 1px solid #f1f1f1;
          }
          
          .responsive-table td:last-child {
            border-bottom: none;
          }
          
          .responsive-table td::before {
            content: attr(data-label);
            font-weight: bold;
            margin-right: 1rem;
            flex: 0 0 120px;
          }
        }
      `}</style>

      {/* Preview Expense Modal */}
      {previewExpense && (
        <Modal
          isOpen={!!previewExpense}
          onRequestClose={() => setPreviewExpense(null)}
          contentLabel="Expense Preview"
          style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000
            },
            content: {
              maxWidth: '600px',
              margin: 'auto',
              padding: '20px',
              borderRadius: '8px'
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Expense Receipt Preview</h3>
            <button 
              onClick={() => setPreviewExpense(null)}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderExpenseReceiptHtml(previewExpense) }} />
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setPreviewExpense(null)}
            >
              Close
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                printExpenseReceipt(previewExpense);
                setPreviewExpense(null);
              }}
            >
              Print
            </button>
          </div>
        </Modal>
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

export default Expenses;