import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { salesAPI, settingsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from 'react-modal';
import logo from '/valyntix-logo.png.jpg';

const createEmptyItem = () => ({
  itemName: '',
  quantity: 1,
  price: 0,
  total: 0
});

const initialFormState = {
  customerName: '',
  items: [createEmptyItem()],
  paymentMethod: 'Cash',
  remarks: '',
  discount: '' // Add discount to form state
};

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [settings, setSettings] = useState(null);
  const [previewSale, setPreviewSale] = useState(null); // add at top of Sales component
  const { currentBranch, user } = useApp();

  useEffect(() => {
    fetchSales();
    fetchSettings();
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

  const fetchSales = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await salesAPI.getAll({ branch: currentBranch._id });
      setSales(response.data.sales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updatedItem = {
          ...item,
          [field]:
            field === 'quantity' || field === 'price'
              ? parseFloat(value) || 0
              : value
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
      items: [...prev.items, createEmptyItem()]
    }));
  };

  const removeItem = (index) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await salesAPI.create({
        ...formData,
        branch: currentBranch._id
      });
      
      setSales([response.data.sale, ...sales]);
      resetForm();
      alert('Sale recorded successfully!');
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error recording sale');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      items: [createEmptyItem()]
    });
  };

  const handleDelete = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this sale record? This action cannot be undone.')) {
      try {
        await salesAPI.delete(saleId);
        setSales(sales.filter(s => s._id !== saleId));
        alert('Sale record deleted successfully');
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Error deleting sale record');
      }
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = parseFloat(formData.discount) || 0;
  const finalAmount = Math.max(totalAmount - discountAmount, 0);
  const totalQuantity = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const uniqueItems = formData.items.filter(item => item.itemName.trim()).length;
  const formatCurrency = (value) => `रु ${Number(value || 0).toLocaleString()}`;
  const formattedTotalAmount = formatCurrency(totalAmount);
  const averageItemValue = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

  const isFormValid =
    uniqueItems > 0 && // Only require items, not customer name
    formData.items.every(
      (item) =>
        item.itemName.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.price) > 0
    ) &&
    totalAmount > 0;

  if (loading && sales.length === 0) {
    return <Loader text="Loading sales records..." />;
  }

  const exportSalesToPDF = async () => {
    try {
      if (!Array.isArray(sales) || sales.length === 0) {
        alert('No sales data available for PDF export.');
        return;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Format numbers for PDF
      const formatNumber = (num) => {
        const n = Number(num || 0);
        return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      // Start directly with tables
      let startY = 40;

      const rows = sales.map((sale) => [
        sale.saleNo || '—',
        sale.customerName || '—',
        sale.items.map(i => `${i.itemName} (x${i.quantity})`).join(', ') || '—',
        `Rs ${formatNumber(sale.totalAmount)}`,
        sale.paymentMethod || '—',
        sale.date?.englishDate ? new Date(sale.date.englishDate).toLocaleDateString() : '—',
        sale.staff?.name || '—',
      ]);

      const autoTableHead = [['Sale No', 'Customer', 'Items', 'Amount', 'Payment', 'Date', 'Staff']];
      const autoTableBody = rows;

      if (Array.isArray(autoTableHead) && autoTableHead.length && Array.isArray(autoTableBody) && autoTableBody.length) {
        autoTable(doc, {
          startY: startY,
          head: autoTableHead,
          body: autoTableBody,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [128, 128, 128], textColor: 255, fontStyle: 'bold' },
          theme: 'striped',
          margin: { left: margin, right: margin },
        });
      } else {
        alert('No table data to export.');
        return;
      }

      // No footer

      // Use blob-based download for better compatibility in production
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TransactionDetails_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF report: ${error.message}. Please check the console for details.`);
    }
  };

  const renderSaleBillHtml = (sale, title = 'Sale Bill') => {
    if (!sale) return '';
    const items = sale.items?.length ? sale.items : [];
    const discount = sale.discount ? parseFloat(sale.discount) : 0;
    const subtotal = items.reduce((sum, i) => sum + ((i.quantity||0)*(i.price||0)), 0);
    const total = sale.totalAmount || Math.max(0, subtotal - discount);
    const companyName = 'बेलका स्केट पार्क एण्ड गेमिङ जोन';
    const branchName = (sale.branch?.branchName) || (window.currentBranch && window.currentBranch.branchName) || '';
    const customerName = sale.customerName || '—';
    const engDate = sale.date?.englishDate ? new Date(sale.date.englishDate).toLocaleDateString() : new Date().toLocaleDateString();
    const nepDate = sale.date?.nepaliDate || '';
    const staffName = sale.staff?.name || '—';
    const itemsHtml = items.map((i, idx) => `<tr style='background:${idx%2?'#f6f9ff':'#fff'};'><td style='border:1.3px solid #7a8ca0;text-align:left;padding:7px 7px;'>${i.itemName || ''}</td><td style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;'>${i.quantity || 0}</td><td style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;'>रु ${i.price || 0}</td><td style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;'>रु ${((i.quantity||0)*(i.price||0)).toLocaleString()}</td></tr>`).join('');
    return `<div style='max-width:430px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 2px 17px #0002;padding:6px 0 18px 0;font-family:\'Segoe UI\',sans-serif;color:#222;'>
      <div style='text-align:center;border-bottom:2px solid #18458a;padding-bottom:8px;margin-bottom:10px;background:#f6f9ff;'>
        <div style='font-size:24px;font-weight:900;letter-spacing:1px;color:#18458a;'>${companyName}</div>
        ${branchName?`<div style='font-size:15px;color:#2955b6;font-weight:600;margin:2px 0 4px 0;'>${branchName}</div>`:''}
        <div style='margin-top:8px;display:flex;justify-content:space-between;font-size:13.5px;text-align:left;padding:0 10px;'>
          <div>Bill To:<br><b>${customerName}</b></div>
          <div>Date(AD):<br><b>${engDate}</b>${nepDate?`<br><span style='font-size:12px;color:#277;'>BS: ${nepDate}</span>`:''}</div>
        </div>
      </div>
      <div style='padding:7px 15px 5px 15px;'>
        <h2 style='margin:0 0 7px 0;font-size:19px;text-align:center;border-bottom:1.5px dashed #18458a;padding-bottom:6px;letter-spacing:1px;'>${title}</h2>
        <table style='width:100%;border-collapse:collapse;'>
          <thead>
            <tr style='background:#e3eef8;'>
              <th style='border:1.3px solid #7a8ca0;padding:7px 7px;text-align:left;'>Item</th>
              <th style='border:1.3px solid #7a8ca0;padding:7px 7px;text-align:right;'>Qty</th>
              <th style='border:1.3px solid #7a8ca0;padding:7px 7px;text-align:right;'>Rate</th>
              <th style='border:1.3px solid #7a8ca0;padding:7px 7px;text-align:right;'>Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
           <tr><td colspan=3 style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;background:#f6fafe'><b>Subtotal</b></td><td style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;background:#f6fafe'>रु ${subtotal.toLocaleString()}</td></tr>
           ${discount>0?`<tr><td colspan=3 style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px'>Discount</td><td style='border:1.3px solid #7a8ca0;text-align:right;padding:7px 7px;color:#219415'>- रु ${discount.toLocaleString()}</td></tr>`:''}
           <tr><td colspan=3 style='border:1.3px solid #7a8ca0;text-align:right;font-size:18px;border-top:2px solid #18458a;padding:9px 7px 2px 7px'><b>Total Due</b></td><td style='border:1.3px solid #7a8ca0;text-align:right;font-size:18px;border-top:2px solid #18458a;padding:9px 7px 2px 7px'><b>रु ${total.toLocaleString()}</b></td></tr>
          </tfoot>
        </table>
        <div style='margin-top:12px;display:flex;justify-content:space-between;font-size:13px;'><div>Payment: <b>${sale.paymentMethod||'—'}</b></div><div>Staff: <b>${staffName}</b></div></div>
        <div style='text-align:center;color:#125a15;font-weight:700;font-size:15px;margin-top:14px;'>धन्यवाद!</div>
      </div>
    </div>`;
  };
  const printSaleReceipt = (sale, title = 'Sale Bill') => {
    if (!sale) return;
    const html = renderSaleBillHtml(sale, title);
    const win = window.open('', '_blank', 'width=480,height=870');
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body style='margin:0;background:#e8edfa'>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),700);}</script></body></html>`);
    win.document.close();
  };

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Sales Management</h1>
        <small className="text-muted">Record and review sales for this branch.</small>
      </div>

      {(user?.role === 'admin' || user?.role === 'staff') && (
        <div className="card mb-4">
          <div className="card-header d-flex justify-between align-start">
            <div>
              <h3 className="card-title mb-1">Record New Sale</h3>
              <small className="text-muted">
                Capture walk-in purchases and keep branch revenue up to date.
              </small>
            </div>
            <div className="text-right">
              <div className="stat-number text-success" style={{ fontSize: '1.5rem' }}>
                {formattedTotalAmount}
              </div>
              <div className="stat-label text-muted">Current Total</div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2 gap-3 align-start">
                <div
                  className="card p-3"
                  style={{
                    background: '#f8fbff',
                    border: '1px solid #e1ecff',
                    boxShadow: 'none'
                  }}
                >
                  <h4 className="mb-3">Customer & Items</h4>

                  <div className="form-group">
                    <label className="form-label">Customer Name (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Walk-in customer"
                    />
                  </div>

                  <div className="d-flex justify-between align-center mt-3 mb-2">
                    <label className="form-label mb-0">Sale Items</label>
                  </div>
                  <div style={{ width: '100%' }}>
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.3fr 0.9fr 1fr 1.2fr 38px',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 7,
                          padding: 0
                        }}
                      >
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Item Name"
                            value={item.itemName}
                            onChange={e => handleItemChange(index, 'itemName', e.target.value)}
                            style={{ border: '1px solid #e2e6ed', borderRadius: 5, fontSize: 14, padding: '5px 10px' }}
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Qty"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                            style={{ border: '1px solid #e2e6ed', borderRadius: 5, fontSize: 14, width: '100%', padding: '5px 10px' }}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Unit Price"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={e => handleItemChange(index, 'price', e.target.value)}
                            style={{ border: '1px solid #e2e6ed', borderRadius: 5, fontSize: 14, width: '100%', padding: '5px 10px' }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            value={formatCurrency(item.total)}
                            readOnly
                            style={{ background: '#f2f6fa', border: '1px solid #e1e5ed', fontWeight: 600, color: '#2872cd', borderRadius: 5, fontSize: 14, padding: '5px 10px' }}
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              style={{ border: 'none', background: 'none', color: '#e74c3c', fontSize: '1.15rem', fontWeight: 600, padding: 0 }}
                              onClick={() => removeItem(index)}
                              title="Remove item"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={addItem}
                      style={{ marginTop: 7, background: '#24365c', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 7, padding: '7px 26px', textShadow: '0 1px 4px #0002', fontSize: '1rem', boxShadow: '0 2px 14px #24365c11', transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#375192'}
                      onMouseOut={e => e.currentTarget.style.background = '#24365c'}
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="form-group mt-3">
                    <label className="form-label">Discount</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.discount}
                      onChange={e => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="Enter discount amount"
                      min="0"
                    />
                  </div>
                </div>

                <div
                  className="card p-3"
                  style={{ border: '1px solid #efefef', boxShadow: 'none' }}
                >
                  <h4 className="mb-3">Billing Summary</h4>
                  <div className="d-flex justify-between align-center mb-2">
                    <span className="text-muted">Customer</span>
                    <strong>{formData.customerName || '—'}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-2">
                    <span className="text-muted">Unique Items</span>
                    <strong>{uniqueItems}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-2">
                    <span className="text-muted">Total Quantity</span>
                    <strong>{totalQuantity}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-3">
                    <span className="text-muted">Average Value</span>
                    <strong>{formatCurrency(averageItemValue)}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-3">
                    <span className="text-muted">Subtotal</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-3">
                    <span className="text-muted">Discount</span>
                    <strong>{formatCurrency(discountAmount)}</strong>
                  </div>
                  <div className="d-flex justify-between align-center mb-2" style={{ fontSize: '1.15rem' }}>
                    <span>Total</span>
                    <strong>{formatCurrency(finalAmount)}</strong>
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
                      <option value="Digital Wallet">Digital Wallet</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="p-3 rounded mb-3" style={{ background: '#1e90ff', color: 'white' }}>
                    <div className="d-flex justify-between align-center">
                      <span>Total Due</span>
                      <strong style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(finalAmount)}
                      </strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows="4"
                      placeholder="Notes, promo codes or special instructions"
                    />
                  </div>

                  <div className="form-actions mt-3">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Clear
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || !isFormValid}
                    >
                      {loading ? 'Saving...' : 'Record Sale'}
                    </button>
                    <button type="button" className="btn btn-info" style={{marginLeft:8}} disabled={!isFormValid} onClick={() => printSaleReceipt({...formData, date:{}, totalAmount:finalAmount, discount:discountAmount, staff:user, items:formData.items})}>Print</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales List */}
      {user?.role === 'admin' && (
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">Sales Records</h3>
            <div className="table-actions">
              <button 
                className="btn btn-sm btn-secondary"
                onClick={fetchSales}
              >
                Refresh
              </button>
              <button
                className="btn btn-sm btn-info"
                onClick={exportSalesToPDF}
                style={{ marginLeft: 8 }}
              >
                Export Transactions PDF
              </button>
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state">
              <p>No sales records found</p>
              {user?.role === 'admin' && (
                <button 
                  className="btn btn-primary"
                  onClick={resetForm}
                >
                  Record First Sale
                </button>
              )}
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
                  <th>Staff</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale?._id || Math.random()}>
                    <td><strong>{sale?.saleNo || '—'}</strong></td>
                    <td>{sale?.customerName || '—'}</td>
                    <td>
                      {Array.isArray(sale?.items) && sale.items.length > 0 ? (
                        sale.items.map((item, index) => (
                          <div key={index}>
                            {item.itemName || ''} (x{item.quantity || 0}) - रु {item.price != null ? item.price : ''}
                          </div>
                        ))
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <strong>रु {(sale?.totalAmount != null ? sale.totalAmount.toLocaleString() : '—')}</strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        sale?.paymentMethod === 'Cash' ? 'bg-success' :
                        sale?.paymentMethod === 'Card' ? 'bg-info' :
                        sale?.paymentMethod === 'Digital Wallet' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {sale?.paymentMethod || '—'}
                      </span>
                    </td>
                    <td>
                      {sale?.date?.englishDate ? new Date(sale.date.englishDate).toLocaleDateString() : '—'}
                      <br />
                      <small>{sale?.date?.nepaliDate || '—'}</small>
                    </td>
                    <td>{sale?.staff?.name || '—'}</td>
                    <td>
                      {user?.role === 'admin' && (
                        <>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(sale._id)}
                            title="Delete Sale"
                          >
                            🗑️
                          </button>
                          <button className="btn btn-sm btn-info ml-1" title="Print" onClick={() => printSaleReceipt(sale)}>🖨️</button>
                          <button className="btn btn-sm btn-outline-primary ml-1" title="Preview" onClick={() => setPreviewSale(sale)}>👁️ Preview</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {sales.length > 0 && (
        <div className="card">
          <h3>Sales Summary</h3>
          <div className="grid grid-3">
            <div className="text-center">
              <div className="stat-number">{sales.length}</div>
              <div className="stat-label">Total Sales</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-success">
                रु {sales.reduce((sum, sale) => sum + (sale && sale.totalAmount != null ? sale.totalAmount : 0), 0).toLocaleString()}
              </div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="stat-number">
                {sales.filter(s => s && s.paymentMethod === 'Cash').length}
              </div>
              <div className="stat-label">Cash Payments</div>
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={!!previewSale} onRequestClose={() => setPreviewSale(null)} ariaHideApp={false} style={{ content: { maxWidth: 470, margin: '25px auto', borderRadius: 13, padding: '0 0 13px 0', minHeight: 330, boxShadow: '0 2px 20px #0003', border:'none' }, overlay: { background: 'rgba(70,90,120,0.17)' } }}> <div dangerouslySetInnerHTML={{__html: renderSaleBillHtml(previewSale)}} /> <div style={{ textAlign: 'center', marginTop: 15 }}><button className="btn btn-secondary" onClick={()=>setPreviewSale(null)}>Close</button></div> </Modal>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Sales;