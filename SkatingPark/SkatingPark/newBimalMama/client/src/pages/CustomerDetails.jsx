import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import ModernHeader from '../components/ModernHeader';
import SectionCard from '../components/SectionCard';
import GradientButton from '../components/GradientButton';

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

  if (loading && tickets.length === 0) {
    return <Loader text="Loading customer details..." />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '20px' }}>
      <NotificationContainer />
      
      <ModernHeader 
        title="Customer Details" 
        subtitle="View customer information and ticket history"
        icon="👥"
      />

      {/* Search */}
      <SectionCard title="Search Customers" icon="🔍" accentColor="#3498db">
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
        accentColor="#9b59b6"
        headerActions={
          <GradientButton 
            onClick={fetchTickets}
            disabled={loading}
            color="#95a5a6"
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </GradientButton>
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

