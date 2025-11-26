import React, { useState } from 'react';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import TicketPrint from '../components/TicketPrint';
import { useApp } from '../context/AppContext';

// Utility to format Nepali date nicely (e.g., "2082-11-14" -> "2082/11/14")
function formatNepaliDate(nepaliDateStr) {
  if (!nepaliDateStr) return '—';
  // Convert "2082-11-14" to "2082/11/14" or keep as is if already formatted
  if (typeof nepaliDateStr === 'string') {
    return nepaliDateStr.replace(/-/g, '/');
  }
  return nepaliDateStr;
}

// Utility to format date without timezone issues (for English date fallback)
function formatDate(dateValue) {
  if (!dateValue) return '—';
  
  let date;
  if (typeof dateValue === 'string') {
    // If it's an ISO string, parse it and use local timezone
    const dateStr = dateValue.split('T')[0]; // Get YYYY-MM-DD part
    const [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day); // Create date in local timezone
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date(dateValue);
  }
  
  // Format as DD/MM/YYYY
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// Utility to get Nepal time (Asia/Kathmandu) from any date
function getNepalTime(dateValue) {
  if (!dateValue) return null;
  
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    date = new Date(dateValue);
  }
  
  // Convert to Nepal time (UTC+5:45)
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const nepalOffset = 5 * 60 + 45; // 345 minutes
  const nepalTime = new Date(utcTime + (nepalOffset * 60000));
  
  const hours = nepalTime.getHours().toString().padStart(2, '0');
  const minutes = nepalTime.getMinutes().toString().padStart(2, '0');
  const seconds = nepalTime.getSeconds().toString().padStart(2, '0');
  
  return {
    time: `${hours}:${minutes}:${seconds}`,
    hours: hours,
    minutes: minutes,
    seconds: seconds
  };
}

// Utility to format time - always use Nepal time from englishDate if available
function formatTime(timeStr, englishDate = null) {
  // If we have englishDate, use it to get correct Nepal time (frontend fix)
  if (englishDate) {
    const nepalTime = getNepalTime(englishDate);
    if (nepalTime) {
      return nepalTime.time.substring(0, 5); // Return HH:mm
    }
  }
  
  // Fallback to stored time string if no englishDate
  if (!timeStr) return '—';
  if (typeof timeStr === 'string') {
    const sanitized = timeStr.replace(/[^0-9:]/g, '');
    return sanitized.substring(0, 5); // Get HH:mm part
  }
  return timeStr;
}

// Utility to get end time as HH:mm - always use Nepal time
function getEndTime(startTimeStr, dateObj, extraMinutes = 0, isRefunded = false) {
  if (!dateObj) return '';
  
  // Get Nepal time from englishDate
  const nepalTime = getNepalTime(dateObj);
  if (!nepalTime) return '';
  
  const startHours = parseInt(nepalTime.hours);
  const startMinutes = parseInt(nepalTime.minutes);
  
  let minsToAdd = isRefunded ? extraMinutes : 60 + (extraMinutes || 0);
  const totalMinutes = startHours * 60 + startMinutes + minsToAdd;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
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
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Courier New', monospace; background: white; width: 80mm; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .ticket-print { width: 76mm; padding: 2mm; box-sizing: border-box; }
            .ticket-footer-vtx { text-align: center; font-size:8px; margin-top:10px; border-top:1px dashed #333; padding-top:2px; color:#666;}
          </style>
        </head>
        <body>
          <div class="ticket-print">
            ${document.getElementById(`ticket-print-${ticket._id}`)?.innerHTML || ''}
            <div class="ticket-footer-vtx">
              <img src="/public/fonts/valyntix-logo.png.jpg" alt="Valyntix Logo" style="height:14px;vertical-align:middle;margin-right:4px;opacity:0.68;" onerror="this.style.display='none'" />
              © Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
            </div>
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
    <>
      <style>{`
        .ticket-history-page-wrapper {
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
      <div className="ticket-history-page-wrapper ticket-history-search-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
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
                  <p><strong>Date:</strong> <strong>{formatNepaliDate(ticket.date?.nepaliDate)}</strong> ({formatDate(ticket.date?.englishDate)})</p>
                  <p><strong>Time:</strong> <strong>{formatTime(ticket.time, ticket.date?.englishDate || ticket.createdAt)}</strong>{(() => {
                    if (!ticket.time) return '';
                    const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
                    if (!dateObj) return '';
                    const endTime = getEndTime(ticket.time, dateObj, ticket.totalExtraMinutes || 0, ticket.isRefunded);
                    return endTime ? ` - ${endTime}` : '';
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
                  <div className="ticket-footer-vtx">
                    <img src="/public/fonts/valyntix-logo.png.jpg" alt="Valyntix Logo" style="height:14px;vertical-align:middle;margin-right:4px;opacity:0.68;" onerror="this.style.display='none'" />
                    © Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
                  </div>
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
    </>
  );
}
