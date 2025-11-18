import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

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
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <div>
          <h1>Customer Details</h1>
          <p className="text-muted mb-0">View customer information and ticket history</p>
        </div>
        <button 
          className="btn btn-sm btn-secondary"
          onClick={fetchTickets}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Search Customers</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, contact number, or ticket number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Customers ({filteredCustomers.length})
          </h3>
        </div>
        <div className="card-body">
          {filteredCustomers.length === 0 ? (
            <div className="empty-state">
              <p>No customers found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
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
        </div>
      </div>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default CustomerDetails;

