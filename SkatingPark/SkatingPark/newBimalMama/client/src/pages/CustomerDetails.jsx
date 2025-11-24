import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import GradientButton from '../components/GradientButton';
import * as XLSX from 'xlsx';

const CustomerDetails = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentBranch } = useApp();

  useEffect(() => {
    if (currentBranch) {
      fetchTickets();
    }
  }, [currentBranch]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll({ limit: 1000 });
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group tickets by customer (name + contact number)
  const customerGroups = useMemo(() => {
    const groups = {};
    
    tickets.forEach(ticket => {
      // Normalize contactNumber to always be an array
      let contactArray = [];
      if (Array.isArray(ticket.contactNumber)) {
        contactArray = ticket.contactNumber;
      } else if (ticket.contactNumber) {
        // If it's a string or other type, convert to array
        contactArray = [String(ticket.contactNumber)];
      }
      
      const customerKey = ticket.name || 'Unknown';
      const contactKey = contactArray.length > 0 ? contactArray.join(', ') : 'No Contact';
      const key = `${customerKey}_${contactKey}`;
      
      if (!groups[key]) {
        groups[key] = {
          name: ticket.name || 'Unknown',
          contactNumber: contactArray,
          tickets: [],
          totalSpent: 0,
          totalTickets: 0,
          lastVisit: null
        };
      }
      
      groups[key].tickets.push(ticket);
      groups[key].totalSpent += ticket.fee || 0;
      groups[key].totalTickets += 1;
      
      const ticketDate = ticket.date?.englishDate 
        ? new Date(ticket.date.englishDate) 
        : new Date(ticket.createdAt);
      
      if (!groups[key].lastVisit || ticketDate > groups[key].lastVisit) {
        groups[key].lastVisit = ticketDate;
      }
    });
    
    return Object.values(groups);
  }, [tickets]);

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerGroups;
    
    const term = searchTerm.toLowerCase();
    return customerGroups.filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      (Array.isArray(customer.contactNumber) && customer.contactNumber.some(num => String(num).toLowerCase().includes(term))) ||
      customer.tickets.some(t => t.ticketNo?.toString().includes(term))
    );
  }, [customerGroups, searchTerm]);

  // Add CSV/XLSX export handler
  const exportToExcel = () => {
    const data = filteredCustomers.map((c) => ({
      Name: c.name,
      Contact: Array.isArray(c.contactNumber) ? c.contactNumber.join(', ') : '',
      'Total Tickets': c.totalTickets,
      'Total Spent': c.totalSpent,
      'Last Visit': c.lastVisit ? c.lastVisit.toLocaleDateString() : '',
      'Ticket Numbers': c.tickets.map(t => t.ticketNo).join(', ')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, 'customer_details.xlsx');
  };

  if (loading && tickets.length === 0) {
    return <Loader text="Loading customer details..." />;
  }

  return (
    <div className="customer-details-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .customer-details-page-wrapper {
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

      {/* Search */}
      <SectionCard title="Search Customers" icon="🔍" accentColor="#27ae60">
        <div className="form-group">
          <label className="form-label">Search Customers</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, contact number, or ticket number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(52, 152, 219, 0.2)',
              fontSize: '1rem'
            }}
          />
        </div>
      </SectionCard>

      {/* Customer List */}
      <SectionCard 
        title={`Customers (${filteredCustomers.length})`}
        icon="📋"
        accentColor="#27ae60"
        headerActions={
          <>
            <GradientButton 
              onClick={fetchTickets}
              disabled={loading}
              color="#95a5a6"
              style={{ fontSize: '0.9rem', padding: '8px 16px', marginRight: 8 }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </GradientButton>
            <GradientButton 
              onClick={exportToExcel}
              color="#27ae60"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              ⬇️ Export to Excel
            </GradientButton>
          </>
        }
      >
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p style={{ fontSize: '1.1rem' }}>No customers found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Contact Number</th>
                    <th>Total Tickets</th>
                    <th>Total Spent</th>
                    <th>Last Visit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{customer.name}</strong>
                      </td>
                      <td>
                        {Array.isArray(customer.contactNumber) && customer.contactNumber.length > 0 ? (
                          customer.contactNumber.join(', ')
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-primary">{customer.totalTickets}</span>
                      </td>
                      <td>
                        <strong>रु {customer.totalSpent.toLocaleString()}</strong>
                      </td>
                      <td>
                        <small>
                          {customer.lastVisit 
                            ? customer.lastVisit.toLocaleDateString()
                            : '—'}
                        </small>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            // Show ticket details in a modal or expand row
                            const customerTickets = customer.tickets;
                            alert(`Customer has ${customerTickets.length} ticket(s).\n\nTicket Numbers: ${customerTickets.map(t => t.ticketNo).join(', ')}`);
                          }}
                        >
                          View Tickets
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </SectionCard>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default CustomerDetails;

