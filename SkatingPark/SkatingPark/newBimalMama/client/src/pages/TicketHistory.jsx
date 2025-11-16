import React, { useState } from 'react';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import TicketPrint from '../components/TicketPrint';

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
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPrint(true)}
                >
                  🖨️ Print Ticket
                </button>
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
