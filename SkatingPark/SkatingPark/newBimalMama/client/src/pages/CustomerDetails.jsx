import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';

const CustomerDetails = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentBranch } = useApp();

  useEffect(() => {
    fetchCustomerDetails();
  }, [currentBranch]);

  const fetchCustomerDetails = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll({ 
        limit: 10000, // Get all tickets
        range: 'history' // Get all tickets, not just today's
      });
      
      // Process tickets to extract customer details
      const customerMap = new Map();
      
      response.data.tickets.forEach(ticket => {
        const key = `${ticket.name}-${ticket.contactNumber || 'no-contact'}`;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: ticket.name,
            contactNumber: ticket.contactNumber || 'N/A',
            ticketNumbers: [],
            dates: [],
            playerNames: new Set(),
            totalTickets: 0
          });
        }
        
        const customer = customerMap.get(key);
        customer.ticketNumbers.push(ticket.ticketNo);
        customer.dates.push({
          date: ticket.date?.englishDate ? new Date(ticket.date.englishDate).toLocaleDateString() : 'N/A',
          nepaliDate: ticket.date?.nepaliDate || 'N/A',
          ticketNo: ticket.ticketNo
        });
        
        // Collect player names
        if (ticket.playerNames && Array.isArray(ticket.playerNames) && ticket.playerNames.length > 0) {
          ticket.playerNames.forEach(playerName => {
            if (playerName && playerName.trim()) {
              customer.playerNames.add(playerName.trim());
            }
          });
        }
        
        customer.totalTickets += 1;
      });
      
      // Convert Set to Array for each customer
      customerMap.forEach(customer => {
        customer.playerNames = Array.from(customer.playerNames);
      });
      
      // Convert map to array and sort by name
      const customerArray = Array.from(customerMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setCustomers(customerArray);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm.trim()) return true;
    const searchTermLower = searchTerm.toLowerCase();
    const searchTermNum = searchTerm.trim();
    
    // Search in name
    const nameMatch = customer.name.toLowerCase().includes(searchTermLower);
    
    // Search in contact number (handle various formats)
    const contactMatch = customer.contactNumber && 
      customer.contactNumber !== 'N/A' && 
      (String(customer.contactNumber).includes(searchTermNum) || 
       String(customer.contactNumber).toLowerCase().includes(searchTermLower));
    
    // Search in ticket numbers
    const ticketMatch = customer.ticketNumbers && customer.ticketNumbers.some(ticketNo => {
      if (!ticketNo) return false;
      const ticketStr = String(ticketNo);
      return ticketStr.includes(searchTermNum) || ticketStr.toLowerCase().includes(searchTermLower);
    });
    
    // Search in player names
    const playerMatch = customer.playerNames && customer.playerNames.some(playerName => 
      playerName && playerName.toLowerCase().includes(searchTermLower)
    );
    
    return nameMatch || contactMatch || ticketMatch || playerMatch;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Contact Number', 'Player Names', 'Ticket Numbers', 'Total Tickets', 'Dates'];
    const rows = filteredCustomers.map(customer => [
      customer.name,
      customer.contactNumber,
      customer.playerNames.join('; ') || 'N/A',
      customer.ticketNumbers.join('; '),
      customer.totalTickets.toString(),
      customer.dates.map(d => `${d.date} (${d.ticketNo})`).join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Customer_Details_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <Loader text="Loading customer details..." />;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <NotificationContainer />
      
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Customer Details</h1>
          <button 
            className="btn btn-primary"
            onClick={exportToCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, contact number, player name, or ticket number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px', flex: '1', minWidth: '200px' }}
          />
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            Total Customers: <strong>{filteredCustomers.length}</strong>
          </div>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            {searchTerm ? 'No customers found matching your search.' : 'No customer details available.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Number</th>
                <th>Player Names</th>
                <th>Ticket Numbers</th>
                <th>Total Tickets</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{customer.name}</td>
                  <td>{customer.contactNumber}</td>
                  <td>
                    <div style={{ maxWidth: '300px', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                      {customer.playerNames && customer.playerNames.length > 0 
                        ? customer.playerNames.join(', ')
                        : <span style={{ color: '#999' }}>—</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                      {customer.ticketNumbers.join(', ')}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {customer.totalTickets}
                  </td>
                  <td>
                    <div style={{ maxWidth: '400px', fontSize: '0.9rem' }}>
                      {customer.dates.map((dateInfo, idx) => (
                        <div key={idx} style={{ marginBottom: '0.25rem' }}>
                          {dateInfo.date} ({dateInfo.nepaliDate})
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;

