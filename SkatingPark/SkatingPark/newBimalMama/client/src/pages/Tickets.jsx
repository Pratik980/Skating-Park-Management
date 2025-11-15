import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import TicketPrint from '../components/TicketPrint';

const EXTRA_TIME_DURATION_MINUTES = 60;
const EXTRA_TIME_RATE_PER_HOUR = 100;

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTicket, setRefundTicket] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundForm, setRefundForm] = useState({
    ticketNo: '',
    refundName: '',
    refundReason: '',
    refundAmount: '',
    refundMethod: 'cash',
    paymentReference: '',
    groupName: '',
    groupNumber: '',
    groupPrice: ''
  });
  const [quickAddData, setQuickAddData] = useState({
    name: '',
    playerNames: '',
    contactNumber: '',
    ticketType: 'Adult',
    fee: '100',
    discount: '',
    numberOfPeople: '1',
    remarks: '',
    groupName: '',
    groupNumber: '',
    groupPrice: ''
  });
  const totalCalculatedFee = useMemo(() => {
    const perPerson = parseFloat(quickAddData.fee) || 0;
    const people = parseInt(quickAddData.numberOfPeople, 10);
    const count = Number.isNaN(people) ? 1 : Math.max(1, people);
    const total = perPerson * count;
    const discount = parseFloat(quickAddData.discount) || 0;
    return Math.max(0, total - discount);
  }, [quickAddData.fee, quickAddData.numberOfPeople, quickAddData.discount]);
  const [showExtraTimeModal, setShowExtraTimeModal] = useState(false);
  const [extraTimeTicket, setExtraTimeTicket] = useState(null);
  const [extraTimeForm, setExtraTimeForm] = useState({
    ticketNo: '',
    minutes: EXTRA_TIME_DURATION_MINUTES,
    label: '1 hour',
    notes: '',
    people: '1',
    charge: '',
    discount: ''
  });
  const [showExtraTimePrint, setShowExtraTimePrint] = useState(false);
  const [extraTimePrintData, setExtraTimePrintData] = useState(null);
  const [extraTimeEntries, setExtraTimeEntries] = useState([]);
  const [extraTimeReport, setExtraTimeReport] = useState([]);
  const [extraTimeReportLoading, setExtraTimeReportLoading] = useState(false);
  const printContentRef = useRef(null);
  const nameInputRef = useRef(null);
  const { currentBranch, user } = useApp();
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    fetchTickets();
  }, [currentBranch, todayDate]);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchTicketHistory(1, false);
    }
  }, [showHistory, currentBranch]);


  // Auto print functionality
 useEffect(() => {
  if (autoPrint && selectedTicket && printContentRef.current) {
    const printContent = printContentRef.current.innerHTML;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Ticket</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              background: white;
              width: 80mm;
              font-size: 10px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .ticket-print {
              width: 76mm;
              padding: 2mm;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    setAutoPrint(false);
    setShowPrint(false);
  }
}, [autoPrint, selectedTicket]);


  const fetchTickets = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll({ 
        limit: 200,
        date: todayDate
      });
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketHistory = async (pageToLoad = 1, append = false) => {
    if (!currentBranch) return;

    try {
      setHistoryLoading(true);
      // Fetch all tickets without date filter - use range: 'history' to get all lifetime data
      const response = await ticketsAPI.getAll({
        page: pageToLoad,
        limit: 200,
        range: 'history'  // This tells backend to return all tickets without date filter
      });

      const fetchedTickets = response.data.tickets || [];

      setHistoryTickets(prev => append ? [...prev, ...fetchedTickets] : fetchedTickets);
      setHistoryPage(response.data.currentPage || pageToLoad);
      setHistoryTotalPages(response.data.pages || 1);
      setHistoryTotalCount(response.data.total || fetchedTickets.length);
    } catch (error) {
      console.error('Error fetching ticket history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadMoreHistory = () => {
    if (historyLoading) return;
    if (historyPage >= historyTotalPages) return;
    fetchTicketHistory(historyPage + 1, true);
  };

  const resetRefundState = () => {
    setRefundTicket(null);
    setRefundForm({
      ticketNo: '',
      refundName: '',
      refundReason: '',
      refundAmount: '',
      refundMethod: 'cash',
      paymentReference: '',
      groupName: '',
      groupNumber: '',
      groupPrice: ''
    });
  };

  const lookupRefundTicket = async () => {
    if (!refundForm.ticketNo.trim()) {
      alert('Please enter a Ticket ID');
      return;
    }
    try {
      setRefundLoading(true);
      const response = await ticketsAPI.lookup(refundForm.ticketNo.trim());
      const ticket = response.data.ticket;
      setRefundTicket(ticket);
      setRefundForm((prev) => ({
        ...prev,
        refundName: ticket.name,
        refundAmount: ticket.fee?.toString() || '',
        refundReason: prev.refundReason,
        refundMethod: 'cash',
        groupName: ticket.groupInfo?.groupName || '',
        groupNumber: ticket.groupInfo?.groupNumber || '',
        groupPrice: ticket.groupInfo?.groupPrice?.toString() || ''
      }));
    } catch (error) {
      console.error('Error fetching ticket for refund:', error);
      alert(error.response?.data?.message || 'Ticket not found');
      setRefundTicket(null);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundTicket) {
      alert('Please look up a ticket first');
      return;
    }
    if (!refundForm.refundReason.trim()) {
      alert('Please enter a refund reason');
      return;
    }

    try {
      setRefundLoading(true);
      await ticketsAPI.refund(refundTicket._id, {
        refundReason: refundForm.refundReason,
        refundAmount: parseFloat(refundForm.refundAmount) || refundTicket.fee,
        refundName: refundForm.refundName || refundTicket.name,
        refundMethod: refundForm.refundMethod,
        paymentReference: refundForm.paymentReference,
        groupInfo: {
          groupName: refundForm.groupName,
          groupNumber: refundForm.groupNumber,
          groupPrice: refundForm.groupPrice ? parseFloat(refundForm.groupPrice) : undefined
        }
      });

      setTickets(tickets.map(t => 
        t._id === refundTicket._id ? { ...t, isRefunded: true, refundReason: refundForm.refundReason } : t
      ));
      alert('Ticket refunded successfully');
      setShowRefundModal(false);
      resetRefundState();
    } catch (error) {
      console.error('Error processing refund:', error);
      alert(error.response?.data?.message || 'Error processing refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const presetExtraTimeOptions = [
    { label: '1 hour', value: EXTRA_TIME_DURATION_MINUTES }
  ];

  const resetExtraTimeState = useCallback(() => {
    setExtraTimeTicket(null);
    setExtraTimeEntries([]);
    setExtraTimeForm({
      ticketNo: '',
      minutes: EXTRA_TIME_DURATION_MINUTES,
      label: '1 hour',
      notes: '',
      people: '1',
      charge: '',
      discount: ''
    });
    setShowExtraTimePrint(false);
    setExtraTimePrintData(null);
  }, []);

  const lookupExtraTimeTicket = async () => {
    if (!extraTimeForm.ticketNo.trim()) {
      alert('Enter Ticket ID or Contact Number to search');
      return;
    }
    try {
      const response = await ticketsAPI.lookup(extraTimeForm.ticketNo.trim());
      const ticket = response.data.ticket;
      setExtraTimeTicket(ticket);
      setExtraTimeForm((prev) => ({
        ...prev,
        minutes: EXTRA_TIME_DURATION_MINUTES,
        label: '1 hour',
        people: '1',
        charge: '',
        discount: ''
      }));
      const entriesResponse = await ticketsAPI.getExtraTimeEntries(ticket._id);
      setExtraTimeEntries(entriesResponse.data.entries || []);
    } catch (error) {
      console.error('Error fetching ticket for extra time:', error);
      alert(error.response?.data?.message || 'Ticket not found');
      setExtraTimeTicket(null);
      setExtraTimeEntries([]);
    }
  };

  const handleAddExtraTime = async () => {
    if (!extraTimeTicket) {
      alert('Please search and select a ticket');
      return;
    }
    const minutesValue = Number(extraTimeForm.minutes);
    if (!minutesValue || minutesValue <= 0) {
      alert('Please enter a valid number of minutes for extra time');
      return;
    }

    const people = parseInt(extraTimeForm.people, 10) || 1;
    const charge = parseFloat(extraTimeForm.charge) || 0;
    const discount = parseFloat(extraTimeForm.discount) || 0;
    const totalCharge = Math.max(0, charge - discount);

    if (charge <= 0) {
      alert('Please enter a valid charge amount');
      return;
    }

    try {
      const addResponse = await ticketsAPI.addExtraTime(extraTimeTicket._id, {
        minutes: minutesValue,
        label: extraTimeForm.label || `${minutesValue} minutes`,
        notes: extraTimeForm.notes,
        amount: totalCharge
      });

      const updatedTicket = addResponse.data?.ticket;
      const entriesResponse = await ticketsAPI.getExtraTimeEntries(extraTimeTicket._id);
      setExtraTimeEntries(entriesResponse.data.entries || []);

      // Prepare print data
      const printData = {
        ticketNo: extraTimeTicket.ticketNo,
        name: extraTimeTicket.name,
        people: people,
        minutes: minutesValue,
        label: extraTimeForm.label || `${minutesValue} minutes`,
        charge: charge,
        discount: discount,
        totalCharge: totalCharge,
        notes: extraTimeForm.notes,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      };
      setExtraTimePrintData(printData);
      setShowExtraTimePrint(true);

      if (updatedTicket) {
        setExtraTimeTicket({
          ...updatedTicket,
          totalExtraMinutes: entriesResponse.data.totalExtraMinutes
        });
        setTickets(tickets.map(t => 
          t._id === updatedTicket._id ? { ...updatedTicket, totalExtraMinutes: entriesResponse.data.totalExtraMinutes } : t
        ));
      } else {
        setExtraTimeTicket({
          ...extraTimeTicket,
          totalExtraMinutes: entriesResponse.data.totalExtraMinutes,
          fee: (extraTimeTicket.fee || 0) + totalCharge
        });
        setTickets(tickets.map(t => 
          t._id === extraTimeTicket._id ? { ...t, totalExtraMinutes: entriesResponse.data.totalExtraMinutes, fee: (t.fee || 0) + totalCharge } : t
        ));
      }

      alert(`Extra time added successfully. रु ${totalCharge} charged.`);
    } catch (error) {
      console.error('Error adding extra time:', error);
      alert(error.response?.data?.message || 'Error adding extra time');
    }
  };

  const fetchExtraTimeReport = useCallback(async () => {
    try {
      setExtraTimeReportLoading(true);
      const response = await ticketsAPI.getExtraTimeReport();
      setExtraTimeReport(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching extra time report:', error);
      alert(error.response?.data?.message || 'Error fetching extra time report');
    } finally {
      setExtraTimeReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showExtraTimeModal) {
      fetchExtraTimeReport();
    } else {
      resetExtraTimeState();
    }
  }, [showExtraTimeModal, fetchExtraTimeReport, resetExtraTimeState]);

  const closeHistoryModal = () => {
    setShowHistory(false);
    setHistoryTickets([]);
    setHistoryPage(1);
    setHistoryTotalPages(1);
    setHistoryTotalCount(0);
  };

  // Handle quick add submission
  const handleQuickAddSubmit = async () => {
    if (!quickAddData.name.trim() && !quickAddData.playerNames.trim()) {
      alert('Please enter customer name or player names');
      return;
    }

    try {
      setLoading(true);
      
      const totalPeople = parseInt(quickAddData.numberOfPeople, 10);
      const peopleCount = Number.isNaN(totalPeople) ? 1 : Math.max(1, totalPeople);
      const perPersonFee = parseFloat(quickAddData.fee) || 100;
      // Parse discount properly - handle empty string, null, undefined
      let discountAmount = 0;
      if (quickAddData.discount !== undefined && quickAddData.discount !== null && quickAddData.discount !== '') {
        const parsedDiscount = parseFloat(quickAddData.discount);
        if (!isNaN(parsedDiscount) && parsedDiscount >= 0) {
          discountAmount = parsedDiscount;
        }
      }
      
      // Calculate total fee (backend will recalculate, but this is for preview)
      const totalFee = Math.max(0, (perPersonFee * peopleCount) - discountAmount);
      
      const ticketData = {
        name: quickAddData.name.trim() || 'Customer',
        contactNumber: quickAddData.contactNumber.trim() || undefined,
        playerNames: quickAddData.playerNames,
        ticketType: quickAddData.ticketType,
        fee: perPersonFee, // Send per person fee, let backend calculate total
        discount: discountAmount, // Always send discount (0 if none)
        remarks: quickAddData.remarks,
        numberOfPeople: peopleCount,
        groupInfo: {
          groupName: quickAddData.groupName || undefined,
          groupNumber: quickAddData.groupNumber || undefined,
          groupPrice: quickAddData.groupPrice ? parseFloat(quickAddData.groupPrice) : undefined
        }
      };

      const response = await ticketsAPI.quickCreate(ticketData);
      const newTicket = response.data.ticket;
      
      // Add to local state
      setTickets([newTicket, ...tickets]);
      if (showHistory) {
        setHistoryTickets(prev => [newTicket, ...prev]);
        setHistoryTotalCount(prev => prev + 1);
      }
      
      // Reset form but keep it open
      setQuickAddData({
        name: '',
        playerNames: '',
        contactNumber: '',
        ticketType: 'Adult',
        fee: '100',
        numberOfPeople: '1',
        remarks: '',
        groupName: '',
        groupNumber: '',
        groupPrice: ''
      });
      
      // Set for auto print
      setSelectedTicket(newTicket);
      setAutoPrint(true);
      setShowPrint(true);
      
      // Refocus on name input for next entry
      if (nameInputRef.current) {
        setTimeout(() => nameInputRef.current.focus(), 100);
      }
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle key events in quick add form
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAddSubmit();
    }
  };

  // Handle manual print
  // const handlePrint = async (ticket) => {
  //   setSelectedTicket(ticket);
  //   setShowPrint(true);
  //   setAutoPrint(false);
    
  //   try {
  //     await ticketsAPI.markPrinted(ticket._id);
  //     setTickets(tickets.map(t => 
  //       t._id === ticket._id ? { ...t, printed: true } : t
  //     ));
  //   } catch (error) {
  //     console.error('Error marking ticket as printed:', error);
  //   }
  // };

  // Handle refund
  const handleRefund = async (ticketId, reason) => {
    if (!reason) {
      alert('Please provide a refund reason');
      return;
    }

    if (window.confirm('Are you sure you want to refund this ticket?')) {
      try {
        await ticketsAPI.refund(ticketId, { refundReason: reason });
        setTickets(tickets.map(t => 
          t._id === ticketId ? { ...t, isRefunded: true, refundReason: reason } : t
        ));
        alert('Ticket refunded successfully');
      } catch (error) {
        console.error('Error refunding ticket:', error);
        alert('Error refunding ticket');
      }
    }
  };

  // Handle partial refund
  const handlePartialRefund = async (ticket) => {
    const refundablePlayers = ticket.playerNames.filter(
      (player, index) => index >= ticket.playerStatus.playedPlayers
    );
    
    if (refundablePlayers.length === 0) {
      alert('No players available for refund');
      return;
    }

    const selectedPlayers = [];
    const playerFee = ticket.fee / ticket.playerStatus.totalPlayers;
    
    refundablePlayers.forEach(player => {
      if (confirm(`Refund ${player}?`)) {
        selectedPlayers.push(player);
      }
    });

    if (selectedPlayers.length === 0) return;

    const refundAmount = selectedPlayers.length * playerFee;
    const reason = prompt('Enter refund reason:', 'Player did not play');

    if (!reason) return;

    if (window.confirm(`Refund रु ${refundAmount} for ${selectedPlayers.length} player(s)?`)) {
      try {
        await ticketsAPI.partialRefund(ticket._id, {
          refundReason: reason,
          refundedPlayers: selectedPlayers,
          refundAmount
        });

        const updatedTickets = tickets.map(t => 
          t._id === ticket._id 
            ? { 
                ...t, 
                refundedPlayers: [...(t.refundedPlayers || []), ...selectedPlayers],
                refundAmount: (t.refundAmount || 0) + refundAmount,
                playerStatus: {
                  ...t.playerStatus,
                  refundedPlayersCount: (t.playerStatus.refundedPlayersCount || 0) + selectedPlayers.length,
                  waitingPlayers: Math.max(0, t.playerStatus.waitingPlayers - selectedPlayers.length)
                }
              } 
            : t
        );
        setTickets(updatedTickets);
        alert(`Partial refund processed for ${selectedPlayers.length} player(s)`);
      } catch (error) {
        console.error('Error processing partial refund:', error);
        alert('Error processing refund');
      }
    }
  };

  // Update player status
  const updatePlayerStatus = async (ticket, newPlayedCount) => {
    try {
      await ticketsAPI.updatePlayerStatus(ticket._id, {
        playedPlayers: newPlayedCount
      });

      const updatedTickets = tickets.map(t => 
        t._id === ticket._id 
          ? { 
              ...t, 
              playerStatus: {
                ...t.playerStatus,
                playedPlayers: newPlayedCount,
                waitingPlayers: t.playerStatus.totalPlayers - newPlayedCount - (t.playerStatus.refundedPlayersCount || 0)
              },
              status: newPlayedCount > 0 ? 'playing' : t.status
            } 
          : t
      );
      setTickets(updatedTickets);
    } catch (error) {
      console.error('Error updating player status:', error);
      alert('Error updating player status');
    }
  };

  // Handle delete
  const handleDelete = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      try {
        await ticketsAPI.delete(ticketId);
        setTickets(tickets.filter(t => t._id !== ticketId));
        alert('Ticket deleted successfully');
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('Error deleting ticket');
      }
    }
  };

  const ticketTypes = {
    'Adult': { price: 100, label: 'Adult' },
    'Child': { price: 100, label: 'Child' },
    'Group': { price: 100, label: 'Group' },
    'Custom': { price: 0, label: 'Custom' }
  };

  const getPerPersonAmount = (ticket) => {
    if (!ticket) return 0;
    const people = ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1;
    const finalFee = ticket.fee || 0;
    // Calculate per person from final fee (after discount)
    if (people > 0) {
      return finalFee / people;
    }
    return finalFee;
  };

  if (loading && tickets.length === 0) {
    return <Loader text="Loading tickets..." />;
  }
// 🧾 Manual popup print for 80mm ticket
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


  return (
    <div>

      
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Ticket Management</h1>
        <div className="d-flex gap-2 align-center">
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <a 
              href="/sales" 
              className="btn btn-primary"
            >
              💰 Sales
            </a>
          )}
          <button 
            className="btn btn-warning"
            onClick={() => setShowRefundModal(true)}
          >
            🔁 Ticket Refund
          </button>
          <button 
            className="btn btn-success"
            onClick={() => setShowExtraTimeModal(true)}
          >
            ⏳ Extra Time
          </button>
          {user?.role === 'admin' && (
            <button 
              className="btn btn-info"
              onClick={() => setShowHistory(true)}
            >
              📜 Ticket History
            </button>
          )}
          <button 
            className="btn btn-sm btn-secondary"
            onClick={fetchTickets}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Quick Add Ticket Row */}
      {(user?.role === 'admin' || user?.role === 'staff') && (
        <div className="card mb-3" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
          <div className="card-body">
            <h5 className="card-title">Quick Ticket Entry</h5>
            <div className="grid grid-5 gap-2">
              <div>
                <label className="form-label">Customer Name *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  className="form-control"
                  value={quickAddData.name}
                  onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Player Names</label>
                <input
                  type="text"
                  className="form-control"
                  value={quickAddData.playerNames}
                  onChange={(e) => setQuickAddData({ ...quickAddData, playerNames: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="Rahul, Ritesh, Suresh"
                />
                <small className="text-muted">Separate with commas</small>
              </div>
              <div>
                <label className="form-label">Contact Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={quickAddData.contactNumber}
                  onChange={(e) => setQuickAddData({ ...quickAddData, contactNumber: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter contact number(s) for players"
                />
                <small className="text-muted">Enter contact numbers manually (can be multiple)</small>
              </div>
              <div>
                <label className="form-label">Ticket Type</label>
                <select
                  className="form-control"
                  value={quickAddData.ticketType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setQuickAddData({
                      ...quickAddData,
                      ticketType: type,
                      fee: ticketTypes[type].price.toString()
                    });
                  }}
                  onKeyPress={handleKeyPress}
                >
                  {Object.entries(ticketTypes).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Fee per Person (NPR) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={quickAddData.fee}
                  onChange={(e) => setQuickAddData({ ...quickAddData, fee: e.target.value })}
                  onKeyPress={handleKeyPress}
                  min="0"
                  step="1"
                  required
                />
                <small className="text-muted">
                  Total Amount: रु {totalCalculatedFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </small>
              </div>
              <div>
                <label className="form-label">Number of People</label>
                <input
                  type="number"
                  className="form-control"
                  value={quickAddData.numberOfPeople}
                  onChange={(e) => setQuickAddData({ ...quickAddData, numberOfPeople: e.target.value })}
                  onKeyPress={handleKeyPress}
                  min="1"
                  step="1"
                />
                <small className="text-muted">Default is 1 person</small>
              </div>
              <div>
                <label className="form-label">Discount (Optional)</label>
                <input
                  type="number"
                  className="form-control"
                  value={quickAddData.discount}
                  onChange={(e) => setQuickAddData({ ...quickAddData, discount: e.target.value })}
                  onKeyPress={handleKeyPress}
                  min="0"
                  step="1"
                  placeholder="0"
                />
                <small className="text-muted">discount amount in Rs</small>
              </div>
              <div>
                <label className="form-label">Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  value={quickAddData.remarks}
                  onChange={(e) => setQuickAddData({ ...quickAddData, remarks: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="Any remarks"
                />
              </div>
            </div>
            <div className="grid grid-3 gap-2 mt-3">
              <div>
                <label className="form-label">Group Name (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={quickAddData.groupName}
                  onChange={(e) => setQuickAddData({ ...quickAddData, groupName: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="E.g., School Tour"
                />
              </div>
              <div>
                <label className="form-label">Group Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={quickAddData.groupNumber}
                  onChange={(e) => setQuickAddData({ ...quickAddData, groupNumber: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="ID / Reference"
                />
              </div>
              <div>
                <label className="form-label">Group Price (NPR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={quickAddData.groupPrice}
                  onChange={(e) => setQuickAddData({ ...quickAddData, groupPrice: e.target.value })}
                  onKeyPress={handleKeyPress}
                  min="0"
                  step="1"
                  placeholder="Total group price"
                />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button 
                className="btn btn-success"
                onClick={handleQuickAddSubmit}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Add & Auto-Print (Enter)'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setQuickAddData({
                  name: '',
                  contactNumber: '',
                  playerNames: '',
                  ticketType: 'Adult',
                  fee: '100',
                  numberOfPeople: '1',
                  remarks: '',
                  groupName: '',
                  groupNumber: '',
                  groupPrice: ''
                })}
              >
                Clear
              </button>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                Press Enter to save and auto-print | Prints exactly as shown
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print content for auto-print */}
      {showPrint && selectedTicket && (
        <div ref={printContentRef} style={{ display: 'none' }}>
          <TicketPrint ticket={selectedTicket} />
        </div>
      )}

      {/* Manual Print Modal */}
      {showPrint && selectedTicket && !autoPrint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '370px', minWidth: '295px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Ticket Preview</h3>
              <button 
                className="close-button"
                onClick={() => setShowPrint(false)}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: '420px', overflow: 'auto', padding: '10px' }}>
              <TicketPrint ticket={selectedTicket} />
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPrint(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Ticket Refund</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setShowRefundModal(false);
                  resetRefundState();
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Ticket ID / Number</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={refundForm.ticketNo}
                    onChange={(e) => setRefundForm({ ...refundForm, ticketNo: e.target.value })}
                    placeholder="Enter ticket ID (e.g., 20241114-001)"
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={lookupRefundTicket}
                    disabled={refundLoading}
                  >
                    {refundLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <small className="text-muted">Ticket details auto-fill as soon as ID is found.</small>
              </div>

              {refundTicket && (
                <div className="card mb-3">
                  <h4>Ticket Details</h4>
                  <div className="grid grid-2">
                    <div>
                      <p><strong>Name:</strong> {refundTicket.name}</p>
                      <p><strong>People:</strong> {refundTicket.numberOfPeople || refundTicket.playerStatus?.totalPlayers || 1}</p>
                      <p><strong>Ticket Amount:</strong> रु {refundTicket.fee?.toLocaleString()}</p>
                      {refundTicket.groupInfo?.groupName && (
                        <p><strong>Group:</strong> {refundTicket.groupInfo.groupName} {refundTicket.groupInfo.groupNumber && `(${refundTicket.groupInfo.groupNumber})`}</p>
                      )}
                    </div>
                    <div>
                      <p><strong>Ticket Type:</strong> {refundTicket.ticketType}</p>
                      <p><strong>Date:</strong> {refundTicket.date?.nepaliDate} ({new Date(refundTicket.date?.englishDate).toLocaleDateString()})</p>
                      <p><strong>Time:</strong> {refundTicket.time}</p>
                      <p><strong>Extra Time:</strong> {refundTicket.totalExtraMinutes || 0} min</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Refund Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={refundForm.refundName}
                    onChange={(e) => setRefundForm({ ...refundForm, refundName: e.target.value })}
                    placeholder="Auto-filled from ticket"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Refund Amount (NPR)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={refundForm.refundAmount}
                    onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Refund Method</label>
                  <select
                    className="form-control"
                    value={refundForm.refundMethod}
                    onChange={(e) => setRefundForm({ ...refundForm, refundMethod: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="bank">Bank</option>
                    <option value="wallet">Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    value={refundForm.paymentReference}
                    onChange={(e) => setRefundForm({ ...refundForm, paymentReference: e.target.value })}
                    placeholder="Txn ID / Ref no."
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Refund Reason</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={refundForm.refundReason}
                  onChange={(e) => setRefundForm({ ...refundForm, refundReason: e.target.value })}
                  placeholder="Reason for refund"
                />
              </div>
              <div className="grid grid-3 gap-2">
                <div>
                  <label className="form-label">Group Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={refundForm.groupName}
                    onChange={(e) => setRefundForm({ ...refundForm, groupName: e.target.value })}
                    placeholder="Manual override"
                  />
                </div>
                <div>
                  <label className="form-label">Group Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={refundForm.groupNumber}
                    onChange={(e) => setRefundForm({ ...refundForm, groupNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Group Price (NPR)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={refundForm.groupPrice}
                    onChange={(e) => setRefundForm({ ...refundForm, groupPrice: e.target.value })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRefundModal(false);
                  resetRefundState();
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRefundSubmit}
                disabled={refundLoading || !refundTicket}
              >
                {refundLoading ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Time Modal */}
      {showExtraTimeModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Extra Time Ticket</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setShowExtraTimeModal(false);
                  resetExtraTimeState();
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Ticket ID / Contact Number</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={extraTimeForm.ticketNo}
                    onChange={(e) => setExtraTimeForm({ ...extraTimeForm, ticketNo: e.target.value })}
                    placeholder="Enter ticket ID or contact number"
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={lookupExtraTimeTicket}
                  >
                    Search
                  </button>
                </div>
                <small className="text-muted">Search by ticket ID or contact number. If multiple tickets found with same contact number, the most recent one will be selected.</small>
              </div>

              {extraTimeTicket && (
                <div className="card mb-3">
                  <h4>Current Ticket</h4>
                  <div className="grid grid-2">
                    <div>
                      <p><strong>Name:</strong> {extraTimeTicket.name}</p>
                      <p><strong>Ticket No:</strong> {extraTimeTicket.ticketNo}</p>
                      <p><strong>People:</strong> {extraTimeTicket.numberOfPeople || extraTimeTicket.playerStatus?.totalPlayers || 1}</p>
                    </div>
                    <div>
                      <p><strong>Ticket Type:</strong> {extraTimeTicket.ticketType}</p>
                      <p><strong>Total Extra Time:</strong> {extraTimeTicket.totalExtraMinutes || 0} min</p>
                      <p><strong>Amount:</strong> रु {extraTimeTicket.fee?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-2 gap-3">
                <div>
                  <label className="form-label">Extra Time (Minutes) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={extraTimeForm.minutes}
                    onChange={(e) => {
                      const minutes = e.target.value;
                      const minutesNum = parseInt(minutes, 10);
                      let label = '';
                      if (minutesNum >= 60) {
                        const hours = Math.floor(minutesNum / 60);
                        const remainingMinutes = minutesNum % 60;
                        if (remainingMinutes === 0) {
                          label = `${hours} hour${hours > 1 ? 's' : ''}`;
                        } else {
                          label = `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
                        }
                      } else if (minutesNum > 0) {
                        label = `${minutesNum} minute${minutesNum > 1 ? 's' : ''}`;
                      }
                      setExtraTimeForm({ ...extraTimeForm, minutes: minutes, label: label || `${minutes} minutes` });
                    }}
                    min="1"
                    step="1"
                    required
                    placeholder="Enter minutes (e.g., 60 for 1 hour)"
                  />
                  <small className="text-muted d-block mt-1">
                    {extraTimeForm.minutes && parseInt(extraTimeForm.minutes, 10) > 0 && (
                      <span>Duration: {extraTimeForm.label || `${extraTimeForm.minutes} minutes`}</span>
                    )}
                  </small>
                </div>
                <div>
                  <label className="form-label">Number of People *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={extraTimeForm.people}
                    onChange={(e) => setExtraTimeForm({ ...extraTimeForm, people: e.target.value })}
                    min="1"
                    step="1"
                    required
                    placeholder="1"
                  />
                  <small className="text-muted">Enter number of people for extra time</small>
                </div>
              </div>
              <div className="grid grid-2 gap-3">
                <div>
                  <label className="form-label">Charge (Rs) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={extraTimeForm.charge}
                    onChange={(e) => setExtraTimeForm({ ...extraTimeForm, charge: e.target.value })}
                    min="0"
                    step="0.01"
                    required
                    placeholder="Enter charge amount"
                  />
                  <small className="text-muted">Manually enter the charge amount</small>
                </div>
                <div>
                  <label className="form-label">Discount (Rs)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={extraTimeForm.discount}
                    onChange={(e) => setExtraTimeForm({ ...extraTimeForm, discount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                  <small className="text-muted">Optional discount amount</small>
                </div>
              </div>
              {extraTimeForm.charge && (
                <div className="alert alert-info">
                  <strong>Total Charge:</strong> रु {Math.max(0, (parseFloat(extraTimeForm.charge) || 0) - (parseFloat(extraTimeForm.discount) || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={extraTimeForm.notes}
                  onChange={(e) => setExtraTimeForm({ ...extraTimeForm, notes: e.target.value })}
                  placeholder="Reason or remarks for extra time"
                />
              </div>
              <button 
                className="btn btn-success"
                onClick={handleAddExtraTime}
                disabled={!extraTimeTicket}
              >
                Save Extra Time
              </button>

              {extraTimeEntries.length > 0 && (
                <div className="mt-4">
                  <h4>Extra Time History</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Minutes</th>
                        <th>Label</th>
                        <th>Notes</th>
                        <th>Added At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraTimeEntries.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.minutes}</td>
                          <td>{entry.label}</td>
                          <td>{entry.notes || '—'}</td>
                          <td>{new Date(entry.addedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4">
                <div className="d-flex justify-between align-center mb-2">
                  <h4>Extra Time Report</h4>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={fetchExtraTimeReport}
                  >
                    {extraTimeReportLoading ? 'Loading...' : 'Refresh Report'}
                  </button>
                </div>
                {extraTimeReport.length === 0 ? (
                  <p className="text-muted">No extra time records yet.</p>
                ) : (
                  <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ticket No</th>
                          <th>Name</th>
                          <th>Minutes</th>
                          <th>Label</th>
                          <th>Notes</th>
                          <th>Added At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraTimeReport.map((entry, idx) => (
                          <tr key={`${entry.ticketNo}-${idx}`}>
                            <td>{entry.ticketNo}</td>
                            <td>{entry.name}</td>
                            <td>{entry.minutes}</td>
                            <td>{entry.label}</td>
                            <td>{entry.notes || '—'}</td>
                            <td>{new Date(entry.addedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowExtraTimeModal(false);
                  resetExtraTimeState();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Time Print Modal */}
      {showExtraTimePrint && extraTimePrintData && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Extra Time Ticket</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setShowExtraTimePrint(false);
                  setExtraTimePrintData(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" id="extra-time-print-content">
              <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 'bold' }}>EXTRA TIME TICKET</h3>
                <div style={{ borderTop: '2px dashed #000', paddingTop: '10px', marginTop: '10px' }}>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Ticket No:</strong> {extraTimePrintData.ticketNo}</p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Name:</strong> {extraTimePrintData.name}</p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>People:</strong> {extraTimePrintData.people}</p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Extra Time:</strong> {extraTimePrintData.label}</p>
                  <div style={{ borderTop: '1px solid #000', margin: '10px 0', paddingTop: '10px' }}>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Charge:</strong> रु {extraTimePrintData.charge.toLocaleString()}</p>
                    {extraTimePrintData.discount > 0 && (
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Discount:</strong> रु {extraTimePrintData.discount.toLocaleString()}</p>
                    )}
                    <p style={{ margin: '10px 0', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '5px' }}>
                      <strong>Total:</strong> रु {extraTimePrintData.totalCharge.toLocaleString()}
                    </p>
                  </div>
                  {extraTimePrintData.notes && (
                    <p style={{ margin: '5px 0', fontSize: '12px', fontStyle: 'italic' }}><strong>Notes:</strong> {extraTimePrintData.notes}</p>
                  )}
                  <p style={{ margin: '10px 0', fontSize: '12px' }}><strong>Date:</strong> {extraTimePrintData.date}</p>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Time:</strong> {extraTimePrintData.time}</p>
                </div>
                <div style={{ borderTop: '2px dashed #000', marginTop: '10px', paddingTop: '10px' }}>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>Thank you!</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowExtraTimePrint(false);
                  setExtraTimePrintData(null);
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const printContent = document.getElementById('extra-time-print-content').innerHTML;
                  const printWindow = window.open('', '_blank', 'width=400,height=600');
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Extra Time Ticket</title>
                        <style>
                          @page {
                            size: 80mm auto;
                            margin: 0;
                          }
                          body {
                            margin: 0;
                            padding: 10px;
                            font-family: Arial, sans-serif;
                            font-size: 12px;
                          }
                          * {
                            box-sizing: border-box;
                          }
                        </style>
                      </head>
                      <body>
                        ${printContent}
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  setTimeout(() => {
                    printWindow.print();
                  }, 250);
                }}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {user?.role === 'admin' && (
        <div className="table-container" style={{ minHeight: '200px' }}>
          <div className="table-header">
            <h3 className="table-title">
              Recent Tickets ({tickets.length})
              {tickets.length > 0 && (
                <small className="text-muted ml-2">
                  Last updated: {new Date().toLocaleTimeString()}
                </small>
              )}
            </h3>
          </div>

          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No tickets found for today</p>
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <p className="text-muted">Use the quick entry form above to create tickets</p>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket No</th>
                  <th>Customer/Players</th>
                  <th>Type</th>
                  <th>Fee</th>
                  <th>Discount</th>
                  <th>Date/Time</th>
                  <th>Remarks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
  {tickets.map(ticket => (
    <React.Fragment key={ticket._id}>
      <tr className={ticket.isRefunded ? 'table-danger' : ''}>
        <td>
          <strong>{ticket.ticketNo}</strong>
          {!ticket.printed && <span className="text-warning"> *</span>}
        </td>
        <td>
          <div>
            <strong>{ticket.name}</strong>
            {ticket.playerNames && ticket.playerNames.length > 0 && (
              <div>
                <small className="text-muted">
                  Players: {ticket.playerNames.join(', ')}
                </small>
              </div>
            )}
            <div>
              <small className="text-muted">
                People: {ticket.numberOfPeople || ticket.playerStatus.totalPlayers || 1}
              </small>
            </div>
            {ticket.groupInfo?.groupName && (
              <div>
                <small className="text-muted">
                  Group: {ticket.groupInfo.groupName} {ticket.groupInfo.groupNumber ? `(${ticket.groupInfo.groupNumber})` : ''}
                </small>
              </div>
            )}
          </div>
        </td>
        <td>{ticket.ticketType}</td>
        <td>
          <div>
            <strong>रु {ticket.fee?.toLocaleString()}</strong>
            {ticket.discount > 0 && (
              <div>
                <small className="text-muted" style={{ textDecoration: 'line-through' }}>
                  रु {((ticket.fee || 0) + (ticket.discount || 0)).toLocaleString()}
                </small>
                <small className="text-success" style={{ marginLeft: '5px' }}>
                  -रु {ticket.discount.toLocaleString()}
                </small>
              </div>
            )}
          </div>
          <div>
            <small className="text-muted">
              Per Person: रु {getPerPersonAmount(ticket).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </small>
          </div>
        </td>
        <td>
          {ticket.discount > 0 ? (
            <span className="text-success">रु {ticket.discount.toLocaleString()}</span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td>
          <small>
            {new Date(ticket.date.englishDate).toLocaleDateString()}
            <br />
            {ticket.date.nepaliDate}
            <br />
            {ticket.time}
          </small>
        </td>
        <td>
          <small>{ticket.remarks}</small>
        </td>
        <td>
          {(() => {
  const created = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : new Date(ticket.createdAt);
  const now = new Date();
  const oneHourPassed = ((now - created) / 36e5) > 1;
  if (oneHourPassed && !ticket.isRefunded) {
    return <span className="badge badge-secondary">Deactivated</span>;
  }
  if (ticket.isRefunded) {
    return <span className="badge badge-danger">Refunded</span>;
  }
  return <span className="badge badge-warning">Playing</span>;
})()}
        </td>
        <td>
          <div className="d-flex gap-1">
            {/* 👁️ Ticket preview button */}
            <button 
              className="btn btn-sm btn-outline-primary"
              style={{ minWidth: 30 }}
              onClick={() => { setSelectedTicket(ticket); setShowPrint(true); setAutoPrint(false); }}
              title="Preview Ticket"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg>
            </button>
            {/* 🖨️ Print button (manual window/print) */}
            <button 
              className="btn btn-sm btn-info"
              onClick={() => openTicketPrintWindow(ticket)}
              title="Print Ticket"
            >
              🖨️
            </button>
            
            {!ticket.isRefunded && (user?.role === 'admin' || user?.role === 'staff') && (
              <>
                <button 
                  className="btn btn-sm btn-warning"
                  onClick={() => handlePartialRefund(ticket)}
                  title="Partial Refund"
                  disabled={ticket.playerStatus.playedPlayers >= ticket.playerStatus.totalPlayers}
                >
                  💰
                </button>
                
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    const reason = prompt('Enter full refund reason:');
                    if (reason) handleRefund(ticket._id, reason);
                  }}
                  title="Full Refund"
                >
                  🔄
                </button>
              </>
            )}
            
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
        </td>
      </tr>

      {/* 🧾 Hidden printable HTML for popup */}
      <div id={`ticket-print-${ticket._id}`} style={{ display: 'none' }}>
        <TicketPrint ticket={ticket} />
      </div>
    </React.Fragment>
  ))}
</tbody>

            {/* <tbody>
              {tickets.map(ticket => (
                <tr key={ticket._id} className={ticket.isRefunded ? 'table-danger' : ''}>
                  <td>
                    <strong>{ticket.ticketNo}</strong>
                    {!ticket.printed && <span className="text-warning"> *</span>}
                  </td>
                  <td>
                    <div>
                      <strong>{ticket.name}</strong>
                      {ticket.playerNames && ticket.playerNames.length > 0 && (
                        <div>
                          <small className="text-muted">
                            Players: {ticket.playerNames.join(', ')}
                          </small>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{ticket.ticketType}</td>
                  <td>रु {ticket.fee}</td>
                  <td>
                    <div className="player-status">
                      <div><small>Total: {ticket.playerStatus.totalPlayers}</small></div>
                      <div className="text-success"><small>Played: {ticket.playerStatus.playedPlayers}</small></div>
                      <div className="text-warning"><small>Waiting: {ticket.playerStatus.waitingPlayers}</small></div>
                      {ticket.playerStatus.refundedPlayersCount > 0 && (
                        <div className="text-danger"><small>Refunded: {ticket.playerStatus.refundedPlayersCount}</small></div>
                      )}
                      
                      {(user?.role === 'admin' || user?.role === 'staff') && !ticket.isRefunded && (
                        <div className="mt-1">
                          <select
                            className="form-control form-control-sm"
                            value={ticket.playerStatus.playedPlayers}
                            onChange={(e) => updatePlayerStatus(ticket, parseInt(e.target.value))}
                          >
                            {Array.from({ length: ticket.playerStatus.totalPlayers + 1 }, (_, i) => (
                              <option key={i} value={i}>
                                {i} played
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <small>
                      {new Date(ticket.date.englishDate).toLocaleDateString()}
                      <br />
                      {ticket.date.nepaliDate}
                      <br />
                      {ticket.time}
                    </small>
                  </td>
                  <td>
                    <small>{ticket.remarks}</small>
                  </td>
                  <td>
                    {ticket.isRefunded ? (
                      <span className="badge badge-danger">Refunded</span>
                    ) : (
                      <span className="badge badge-warning">Playing</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => handlePrint(ticket)}
                        title="Print Ticket"
                      >
                        🖨️
                      </button>
                      
                      {!ticket.isRefunded && (user?.role === 'admin' || user?.role === 'staff') && (
                        <>
                          <button 
                            className="btn btn-sm btn-warning"
                            onClick={() => handlePartialRefund(ticket)}
                            title="Partial Refund"
                            disabled={ticket.playerStatus.playedPlayers >= ticket.playerStatus.totalPlayers}
                          >
                            💰
                          </button>
                          
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              const reason = prompt('Enter full refund reason:');
                              if (reason) handleRefund(ticket._id, reason);
                            }}
                            title="Full Refund"
                          >
                            🔄
                          </button>
                        </>
                      )}
                      
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
                  </td>
                </tr>
              ))}
            </tbody> */}
          </table>
        )}
      </div>
      )}

      {/* Summary Stats */}
      {tickets.length > 0 && (
        <div className="card mt-3">
          <h3>Today's Summary</h3>
          <div className="grid grid-5">
            <div className="text-center">
              <div className="stat-number">{tickets.length}</div>
              <div className="stat-label">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-success">
                रु {tickets.reduce((sum, ticket) => sum + ticket.fee, 0).toLocaleString()}
              </div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="stat-number">
                {tickets.reduce((sum, ticket) => sum + (ticket.playerStatus.playedPlayers || 0), 0)}
              </div>
              <div className="stat-label">Players Played</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-warning">
                {tickets.reduce((sum, ticket) => sum + (ticket.playerStatus.waitingPlayers || 0), 0)}
              </div>
              <div className="stat-label">Waiting Players</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-info">
                {tickets.reduce((sum, ticket) => sum + (ticket.totalExtraMinutes || 0), 0)} min
              </div>
              <div className="stat-label">Extra Time Added</div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket History Modal */}
      {showHistory && user?.role === 'admin' && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">📜 Ticket History - All Records</h3>
              <button 
                className="close-button"
                onClick={closeHistoryModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {historyLoading && historyTickets.length === 0 ? (
                <Loader text="Loading ticket history..." />
              ) : (
                <>
                  <div className="d-flex justify-between align-center mb-3">
                    <div>
                      <strong>Total Tickets: {historyTotalCount}</strong>
                      {historyTickets.length > 0 && (
                        <small className="text-muted ml-2">
                          Showing {historyTickets.length} of {historyTotalCount}
                        </small>
                      )}
                    </div>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => fetchTicketHistory(1, false)}
                      disabled={historyLoading}
                    >
                      {historyLoading ? 'Refreshing...' : '🔄 Refresh'}
                    </button>
                  </div>

                  {historyTickets.length === 0 ? (
                    <div className="empty-state">
                      <p>No ticket history found</p>
                    </div>
                  ) : (
                    <>
                      <div className="table-container" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                        <table className="table">
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                            <tr>
                              <th>Ticket No</th>
                              <th>Customer/Players</th>
                              <th>Type</th>
                              <th>Fee</th>
                              <th>Discount</th>
                              <th>People</th>
                              <th>Extra Time</th>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Status</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyTickets.map(ticket => (
                              <tr key={ticket._id} className={ticket.isRefunded ? 'table-danger' : ''}>
                                <td><strong>{ticket.ticketNo}</strong></td>
                                <td>
                                  <div>
                                    <strong>{ticket.name}</strong>
                                    {ticket.playerNames && ticket.playerNames.length > 0 && (
                                      <div>
                                        <small className="text-muted">
                                          {ticket.playerNames.join(', ')}
                                        </small>
                                      </div>
                                    )}
                                    <div>
                                      <small className="text-muted">
                                        People: {ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1}
                                      </small>
                                    </div>
                                    {ticket.groupInfo?.groupName && (
                                      <div>
                                        <small className="text-muted">
                                          Group: {ticket.groupInfo.groupName} {ticket.groupInfo.groupNumber ? `(${ticket.groupInfo.groupNumber})` : ''}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>{ticket.ticketType}</td>
                                <td>
                                  <div>
                                    <strong>रु {ticket.fee?.toLocaleString()}</strong>
                                    {ticket.discount > 0 && (
                                      <div>
                                        <small className="text-muted" style={{ textDecoration: 'line-through' }}>
                                          रु {((ticket.fee || 0) + (ticket.discount || 0)).toLocaleString()}
                                        </small>
                                        <small className="text-success" style={{ marginLeft: '5px' }}>
                                          -रु {ticket.discount.toLocaleString()}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <small className="text-muted">
                                      Per Person: रु {getPerPersonAmount(ticket).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  {ticket.discount > 0 ? (
                                    <span className="text-success">रु {ticket.discount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td>{ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1}</td>
                                <td>{ticket.totalExtraMinutes || 0} min</td>
                                <td>
                                  <small>
                                    {ticket.date?.englishDate 
                                      ? new Date(ticket.date.englishDate).toLocaleDateString()
                                      : new Date(ticket.createdAt).toLocaleDateString()}
                                    <br />
                                    {ticket.date?.nepaliDate || '—'}
                                  </small>
                                </td>
                                <td>
                                  <small>{ticket.time || '—'}</small>
                                </td>
                                <td>
                                  {(() => {
                                    const created = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : new Date(ticket.createdAt);
                                    const now = new Date();
                                    const oneHourPassed = ((now - created) / 36e5) > 1;
                                    if (oneHourPassed && !ticket.isRefunded) {
                                      return <span className="badge badge-secondary">Deactivated</span>;
                                    }
                                    if (ticket.isRefunded) {
                                      return <span className="badge badge-danger">Refunded</span>;
                                    }
                                    return <span className="badge badge-warning">Playing</span>;
                                  })()}
                                </td>
                                <td>
                                  <small>{ticket.remarks || '—'}</small>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {historyPage < historyTotalPages && (
                        <div className="text-center mt-3">
                          <button 
                            className="btn btn-primary"
                            onClick={handleLoadMoreHistory}
                            disabled={historyLoading}
                          >
                            {historyLoading ? 'Loading...' : `Load More (${historyTotalPages - historyPage} pages remaining)`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={closeHistoryModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;