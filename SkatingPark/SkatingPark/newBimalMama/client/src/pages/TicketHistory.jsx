import React, { useState } from 'react';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import TicketPrint from '../components/TicketPrint';
import { useApp } from '../context/AppContext';

// Utility to get end time as HH:mm
function getEndTime(startTimeStr, dateObj, extraMinutes = 0, isRefunded = false) {
  if (!startTimeStr || !dateObj) return '';
  const [hh, mm, ss] = startTimeStr.split(':');
  const start = new Date(dateObj);
  start.setHours(+hh, +mm, +((ss || 0)), 0);
  let minsToAdd = isRefunded ? extraMinutes : 60 + (extraMinutes || 0);
  const end = new Date(start.getTime() + minsToAdd * 60000);
  return end.toTimeString().substring(0, 5);
}

export default function TicketHistory() {
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const { user } = useApp();

  // Open ticket print window
  const openTicketPrintWindow = (ticket) => {
    if (!ticket) return;
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket Print</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: "Courier New", monospace;
              background: white;
              width: 80mm;
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .ticket-print {
              width: 76mm;
              padding: 2mm;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="ticket-print">
            ${document.getElementById(`ticket-print-${ticket._id}`)?.innerHTML || ''}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Handle delete ticket
  const handleDelete = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      try {
        await ticketsAPI.delete(ticketId);
        setTicket(null);
        setSearchValue('');
        alert('Ticket deleted successfully');
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert(error.response?.data?.message || 'Error deleting ticket');
      }
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setTicket(null);
    setSearching(true);
    try {
      if (searchValue.trim() !== '') {
        // Use the lookup API which searches by ticket number or ID
        const response = await ticketsAPI.lookup(searchValue.trim());
        if (response && response.data && response.data.ticket) {
          setTicket(response.data.ticket);
        } else {
          setError('No ticket found with that number or ID.');
        }
      }
    } catch (err) {
      console.error('Error searching ticket:', err);
      setError(err.response?.data?.message || 'No ticket found with that number or ID.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="ticket-history-search-container" style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
      <h1>Ticket History Lookup</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <label htmlFor="ticket-lookup-input" style={{ fontWeight: 'bold' }}>Ticket Number or Ticket ID</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            id="ticket-lookup-input"
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            placeholder="Enter ticket number or ID"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={searching || !searchValue.trim()}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {ticket && (
        <div className="ticket-history-single-result" style={{ marginTop: 32 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="d-flex justify-between align-center mb-3">
                <h3>Ticket Details</h3>
                <div className="d-flex gap-1">
                  {/* Preview button */}
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    style={{ minWidth: 30 }}
                    onClick={() => setShowPrint(true)}
                    title="Preview Ticket"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg>
                  </button>
                  {/* Print button */}
                  <button 
                    className="btn btn-sm btn-info"
                    onClick={() => openTicketPrintWindow(ticket)}
                    title="Print Ticket"
                  >
                    🖨️
                  </button>
                  {/* Delete button - only for admin */}
                  {user?.role === 'admin' && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(ticket._id)}
                      title="Delete Ticket"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-2">
                <div>
                  <p><strong>Ticket No:</strong> {ticket.ticketNo}</p>
                  <p><strong>Name:</strong> {ticket.name}</p>
                  {ticket.playerNames && ticket.playerNames.length > 0 && (
                    <p><strong>Players:</strong> {ticket.playerNames.join(', ')}</p>
                  )}
                  <p><strong>People:</strong> {ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1}</p>
                  <p><strong>Ticket Type:</strong> {ticket.ticketType}</p>
                  {ticket.groupInfo?.groupName && (
                    <p><strong>Group:</strong> {ticket.groupInfo.groupName} {ticket.groupInfo.groupNumber && `(${ticket.groupInfo.groupNumber})`}</p>
                  )}
                </div>
                <div>
                  <p><strong>Date:</strong> {ticket.date?.nepaliDate} ({ticket.date?.englishDate ? new Date(ticket.date.englishDate).toLocaleDateString() : '—'})</p>
                  <p><strong>Time:</strong> {(() => {
                    if (!ticket.time) return '—';
                    const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
                    if (!dateObj) return ticket.time;
                    const endTime = getEndTime(ticket.time, dateObj, ticket.totalExtraMinutes || 0, ticket.isRefunded);
                    return endTime ? `${ticket.time} - ${endTime}` : ticket.time;
                  })()}</p>
                  <p><strong>Extra Time:</strong> {ticket.totalExtraMinutes || 0} min</p>
                  <p><strong>Fee:</strong> रु {ticket.fee?.toLocaleString() || '0'}</p>
                  {ticket.discount > 0 && (
                    <p><strong>Discount:</strong> रु {ticket.discount.toLocaleString()}</p>
                  )}
                  <p><strong>Status:</strong> {ticket.isRefunded ? <span className="badge badge-danger">Refunded</span> : <span className="badge badge-success">Active</span>}</p>
                  {ticket.remarks && (
                    <p><strong>Remarks:</strong> {ticket.remarks}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Hidden print block for direct printing */}
          {ticket && (
            <div id={`ticket-print-${ticket._id}`} style={{ display: 'none' }}>
              <TicketPrint ticket={ticket} />
            </div>
          )}

          {/* Print Preview Modal */}
          {showPrint && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content" style={{ maxWidth: '90%', width: '400px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Ticket Print Preview</h3>
                  <button 
                    className="close-button"
                    onClick={() => setShowPrint(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <TicketPrint ticket={ticket} />
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowPrint(false)}
                  >
                    Close
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      window.print();
                    }}
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {searching && <Loader text="Searching ticket..." />}
    </div>
  );
}
