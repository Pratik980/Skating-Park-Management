import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { expensesAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

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

  if (loading && expenses.length === 0) {
    return <Loader text="Loading expenses..." />;
  }

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Expense Management</h1>
      </div>

      {/* Expense Form - Always Visible */}
      {(user?.role === 'admin' || user?.role === 'staff') && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">Add New Expense</h3>
          </div>
          <div className="card-body">
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

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading || !formData.category || !formData.amount}
                >
                  {loading ? 'Processing...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Expense Records</h3>
          <div className="table-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={fetchExpenses}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expense records found</p>
          </div>
        ) : (
          <div className="responsive-table">
            <table className="table">
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
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(expense._id)}
                          title="Delete Expense"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {expenses.length > 0 && (
        <div className="card mt-4">
          <h3>Expense Summary</h3>
          <div className="stats-grid">
            <div className="stat-item text-center">
              <div className="stat-number">{expenses.length}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className="stat-item text-center">
              <div className="stat-number text-danger">
                रु {expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}
              </div>
              <div className="stat-label">Total Amount</div>
            </div>
            <div className="stat-item text-center">
              <div className="stat-number">
                {expenses.filter(e => e.category === 'Maintenance').length}
              </div>
              <div className="stat-label">Maintenance</div>
            </div>
            <div className="stat-item text-center">
              <div className="stat-number">
                {expenses.filter(e => e.category === 'Salary').length}
              </div>
              <div className="stat-label">Salary</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mt-3">
            <h4>Category Breakdown</h4>
            {Array.from(new Set(expenses.map(e => e.category))).map(category => {
              const categoryExpenses = expenses.filter(e => e.category === category);
              const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
              
              return (
                <div key={category} className="category-breakdown-item">
                  <span>{category}</span>
                  <span className="text-danger">रु {total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
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