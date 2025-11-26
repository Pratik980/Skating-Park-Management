import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ticketsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import TicketPrint from '../components/TicketPrint';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';


const EXTRA_TIME_DURATION_MINUTES = 60;
const EXTRA_TIME_RATE_PER_HOUR = 100;

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
  // Get UTC time in milliseconds
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  // Nepal is UTC+5:45 (5 hours 45 minutes = 345 minutes)
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

// Utility to format date and time without timezone issues
function formatDateTime(dateValue) {
  if (!dateValue) return '—';
  
  let date;
  if (typeof dateValue === 'string') {
    // If it's an ISO string, parse it properly
    if (dateValue.includes('T')) {
      date = new Date(dateValue);
    } else {
      // Just a date string YYYY-MM-DD
      const [year, month, day] = dateValue.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date(dateValue);
  }
  
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Utility to get end time as HH:mm - always use Nepal time
function getEndTime(startTimeStr, dateObj, extraMinutes=0, isRefunded=false) {
  if (!dateObj) return '';
  
  // Get Nepal time from englishDate
  const nepalTime = getNepalTime(dateObj);
  if (!nepalTime) return '';
  
  // Use Nepal time hours and minutes
  const start = new Date(dateObj);
  // Set hours/minutes in Nepal timezone
  const utcTime = start.getTime() + (start.getTimezoneOffset() * 60000);
  const nepalOffset = 5 * 60 + 45;
  const nepalDate = new Date(utcTime + (nepalOffset * 60000));
  
  const startHours = parseInt(nepalTime.hours);
  const startMinutes = parseInt(nepalTime.minutes);
  
  let minsToAdd = isRefunded ? extraMinutes : 60 + (extraMinutes || 0);
  const totalMinutes = startHours * 60 + startMinutes + minsToAdd;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showControlMenu, setShowControlMenu] = useState(false);
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
    groupPrice: '',
    cancellationFee: '',
    refundedPlayersCount: ''
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
  const [recentRefunds, setRecentRefunds] = useState([]);
  const [recentRefundsLoading, setRecentRefundsLoading] = useState(false);
  const printContentRef = useRef(null);
  const nameInputRef = useRef(null);
  const { currentBranch, user } = useApp();
  const navigate = useNavigate();
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [historySearch, setHistorySearch] = useState('');
  const isAdmin = user?.role === 'admin';
  const canManageTickets = isAdmin || user?.role === 'staff';
  const grossRevenue = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (ticket.fee || 0), 0),
    [tickets]
  );
  const todaysRefundedAmount = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (ticket.refundAmount || 0), 0),
    [tickets]
  );
  const todaysRevenue = useMemo(
    () => Math.max(0, grossRevenue - todaysRefundedAmount),
    [grossRevenue, todaysRefundedAmount]
  );
  const playingTickets = useMemo(
    () => tickets.filter(ticket => !ticket.isRefunded).length,
    [tickets]
  );
  const refundedToday = useMemo(
    () => tickets.filter(ticket => ticket.isRefunded).length,
    [tickets]
  );
  const totalExtraMinutes = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (ticket.totalExtraMinutes || 0), 0),
    [tickets]
  );

  // Helpers for refund calculations
  const getTotalPlayers = (ticket) => {
    if (!ticket) return 0;
    return (
      ticket.numberOfPeople ||
      ticket.playerStatus?.totalPlayers ||
      ticket.playerNames?.length ||
      ticket.groupInfo?.totalMembers ||
      1
    );
  };

  const calculateRefundAmount = (ticket, refundedPeopleCount = null, cancellationFee = 0) => {
    if (!ticket) return 0;
    
    const amountPaid = ticket.fee || 0;
    const totalPeople = getTotalPlayers(ticket);

    let refundAmount = amountPaid;

    if (refundedPeopleCount !== null && refundedPeopleCount > 0 && totalPeople > 0) {
      const safeCount = Math.min(refundedPeopleCount, totalPeople);
      const perPersonAmountPaid = amountPaid / totalPeople;
      refundAmount = perPersonAmountPaid * safeCount;
    }

    if (cancellationFee > 0) {
      refundAmount = Math.max(0, refundAmount - cancellationFee);
    }

    return Math.round(refundAmount * 100) / 100;
  };

  const playersToRefundCount = (() => {
    const parsed = parseInt(refundForm.refundedPlayersCount, 10);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const totalPlayersForRefund = refundTicket ? getTotalPlayers(refundTicket) : 0;
  const perPlayerRefundValue = refundTicket
    ? (totalPlayersForRefund
        ? Math.round(((refundTicket.fee || 0) / totalPlayersForRefund + Number.EPSILON) * 100) / 100
        : refundTicket.fee || 0)
    : 0;
  const refundPreviewAmount = refundTicket
    ? calculateRefundAmount(
        refundTicket,
        playersToRefundCount,
        parseFloat(refundForm.cancellationFee) || 0
      )
    : 0;

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

  // Auto print functionality (browser only)
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !autoPrint ||
      !selectedTicket ||
      !printContentRef.current
    ) {
      return;
    }

    const printContent = printContentRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Ticket</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
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
      groupPrice: '',
      cancellationFee: '',
      refundedPlayersCount: ''
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
      const totalPlayers = getTotalPlayers(ticket);
      const cancellationFee = parseFloat(refundForm.cancellationFee) || 0;
      const defaultPlayersToRefund = totalPlayers || null;
      
      // Calculate refund amount automatically based on actual amount paid
      const calculatedRefund = calculateRefundAmount(
        ticket,
        defaultPlayersToRefund,
        cancellationFee
      );
      
      setRefundForm((prev) => ({
        ...prev,
        refundName: ticket.name,
        refundAmount: calculatedRefund.toString(),
        refundReason: prev.refundReason,
        refundMethod: 'cash',
        groupName: ticket.groupInfo?.groupName || '',
        groupNumber: ticket.groupInfo?.groupNumber || '',
        groupPrice: ticket.groupInfo?.groupPrice?.toString() || '',
        cancellationFee: prev.cancellationFee || '',
        refundedPlayersCount: defaultPlayersToRefund ? defaultPlayersToRefund.toString() : ''
      }));
    } catch (error) {
      console.error('Error fetching ticket for refund:', error);
      alert(error.response?.data?.message || 'Ticket not found');
      setRefundTicket(null);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleRefundPlayersChange = (value) => {
    if (!refundTicket) return;
    const totalPlayers = getTotalPlayers(refundTicket);
    let parsedValue = value === '' ? '' : parseInt(value, 10);

    if (parsedValue !== '' && isNaN(parsedValue)) {
      parsedValue = '';
    } else if (parsedValue !== '') {
      parsedValue = Math.max(0, Math.min(parsedValue, totalPlayers));
    }

    const cancellationFee = parseFloat(refundForm.cancellationFee) || 0;
    const playersForCalc = parsedValue === '' ? null : parsedValue;
    const recalculatedRefund = calculateRefundAmount(
      refundTicket,
      playersForCalc,
      cancellationFee
    );

    setRefundForm((prev) => ({
      ...prev,
      refundedPlayersCount: parsedValue === '' ? '' : parsedValue.toString(),
      refundAmount: recalculatedRefund.toString()
    }));
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

    const totalPlayers = getTotalPlayers(refundTicket);
    const playersToRefund = playersToRefundCount;
    const cancellationFee = parseFloat(refundForm.cancellationFee) || 0;
    const standardizedRefundAmount = calculateRefundAmount(
      refundTicket,
      typeof playersToRefund === 'number' ? playersToRefund : null,
      cancellationFee
    );

    const refundedPlayersList =
      typeof playersToRefund === 'number' && playersToRefund > 0
        ? (refundTicket.playerNames && refundTicket.playerNames.length >= playersToRefund
            ? refundTicket.playerNames.slice(0, playersToRefund)
            : Array.from({ length: playersToRefund }, (_, idx) => `Player ${idx + 1}`))
        : [];

    try {
      setRefundLoading(true);
      await ticketsAPI.refund(refundTicket._id, {
        refundReason: refundForm.refundReason,
        refundAmount: standardizedRefundAmount || parseFloat(refundForm.refundAmount) || refundTicket.fee,
        refundName: refundForm.refundName || refundTicket.name,
        refundMethod: refundForm.refundMethod,
        paymentReference: refundForm.paymentReference,
        groupInfo: {
          groupName: refundForm.groupName,
          groupNumber: refundForm.groupNumber,
          groupPrice: refundForm.groupPrice ? parseFloat(refundForm.groupPrice) : undefined
        },
        refundedPlayers: refundedPlayersList
      });

      setTickets(tickets.map(t => 
        t._id === refundTicket._id ? { ...t, isRefunded: true, refundReason: refundForm.refundReason } : t
      ));
      // Refresh recent refunds list
      await fetchRecentRefunds();
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
        time: new Date().toLocaleTimeString(),
        ticketTime: extraTimeTicket.time,
        ticketDate: extraTimeTicket.date,
        totalExtraMinutes: entriesResponse.data.totalExtraMinutes || extraTimeTicket.totalExtraMinutes || 0,
        isRefunded: extraTimeTicket.isRefunded || false
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

  const fetchRecentRefunds = useCallback(async () => {
    if (!currentBranch) return;
    try {
      setRecentRefundsLoading(true);
      const response = await ticketsAPI.getAll({
        limit: 100,
        isRefunded: true
      });
      setRecentRefunds(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching recent refunds:', error);
      alert(error.response?.data?.message || 'Error fetching recent refunds');
    } finally {
      setRecentRefundsLoading(false);
    }
  }, [currentBranch]);

  useEffect(() => {
    if (showExtraTimeModal) {
      fetchExtraTimeReport();
    } else {
      resetExtraTimeState();
    }
  }, [showExtraTimeModal, fetchExtraTimeReport, resetExtraTimeState]);

  useEffect(() => {
    if (showRefundModal) {
      fetchRecentRefunds();
    } else {
      resetRefundState();
    }
  }, [showRefundModal, fetchRecentRefunds]);

  // Refs for quick-add input fields so Enter can move focus
  const quickAddRefs = useRef([]);

  const setQuickAddRef = (el, idx) => {
    quickAddRefs.current = quickAddRefs.current || [];
    quickAddRefs.current[idx] = el;
  };

  const handleQuickAddEnter = (e, idx) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const next = quickAddRefs.current && quickAddRefs.current[idx + 1];
      if (next && typeof next.focus === 'function') {
        next.focus();
      } else {
        // If no next field, submit the quick add form
        handleQuickAddSubmit();
      }
    }
  };

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

      console.log('🎫 Creating ticket with data:', ticketData);
      console.log('🔗 API Base URL:', import.meta.env.VITE_API_BASE_URL);
      
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
      console.error('❌ Error creating ticket:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL
      });
      
      let errorMessage = 'Error creating ticket: ';
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage += 'Cannot connect to server. Please check if the backend is running and VITE_API_BASE_URL is set correctly.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage += 'Unauthorized. Please login again.';
      } else if (error.response?.status === 404) {
        errorMessage += `Route not found. API URL: ${error.config?.url}`;
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
    // Try to find ticket in current tickets list, or in history tickets
    const ticket = tickets.find(t => t._id === ticketId) || historyTickets.find(t => t._id === ticketId);
    if (!ticket) {
      alert('Ticket not found');
      return;
    }
    
    // Calculate refund amount based on actual amount paid
    const calculatedRefund = calculateRefundAmount(ticket, null, 0);
    
    if (window.confirm(`Refund रु ${calculatedRefund.toFixed(2)} for this ticket?`)) {
      try {
        await ticketsAPI.refund(ticketId, { refundReason: reason, refundAmount: calculatedRefund });
        // Update current tickets list if ticket exists there
        if (tickets.find(t => t._id === ticketId)) {
          setTickets(tickets.map(t => 
            t._id === ticketId ? { ...t, isRefunded: true, refundReason: reason, refundAmount: calculatedRefund } : t
          ));
        }
        // Update history tickets list if ticket exists there
        if (historyTickets.find(t => t._id === ticketId)) {
          setHistoryTickets(historyTickets.map(t => 
            t._id === ticketId ? { ...t, isRefunded: true, refundReason: reason, refundAmount: calculatedRefund } : t
          ));
        }
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
    
    refundablePlayers.forEach(player => {
      if (confirm(`Refund ${player}?`)) {
        selectedPlayers.push(player);
      }
    });

    if (selectedPlayers.length === 0) return;

    // Calculate refund based on actual amount paid per person
    // Use the new calculation method: (Amount Actually Paid / Total People) * Refunded People
    const refundAmount = calculateRefundAmount(ticket, selectedPlayers.length, 0);
    const reason = prompt('Enter refund reason:', 'Player did not play');

    if (!reason) return;

    if (window.confirm(`Refund रु ${refundAmount.toFixed(2)} for ${selectedPlayers.length} player(s)?`)) {
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
        // Remove from current tickets list
        setTickets(tickets.filter(t => t._id !== ticketId));
        // Remove from history tickets list
        setHistoryTickets(historyTickets.filter(t => t._id !== ticketId));
        alert('Ticket deleted successfully');
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('Error deleting ticket');
      }
    }
  };

  const ticketTypes = {
    'Adult': { price: 100, label: 'Adult' }
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

  // 1. Bulk Print function (helper for both lists)
  const printMultipleTickets = (ticketsToPrint) => {
    if (!ticketsToPrint?.length) return;
    // Collect all the HTML blocks
    const allHtml = ticketsToPrint.map(ticket => {
      const el = document.getElementById(`ticket-print-${ticket._id}`);
      return el ? el.innerHTML : '';
    }).filter(Boolean).join('<div style="page-break-after:always;"></div>');
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Tickets</title><style>@media print {@page {size:80mm auto;margin:0;}body{font-family:'Courier New',monospace;background:white;width:80mm;margin:0;padding:0;font-size:10px;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;} .ticket-print{width:76mm;padding:2mm;box-sizing:border-box;}}</style></head><body>${allHtml}<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000);}</script></body></html>`);
    printWindow.document.close();
  };

  // Print all as a tabular report (PDF/table-like)
  const printTicketsTableReport = (ticketsToPrint, title = 'Ticket List Report') => {
    if (!ticketsToPrint?.length) return;
    const htmlRows = ticketsToPrint.map(t => {
      const orig = (t.fee || 0) + (t.discount || 0);
      const final = t.isRefunded ? 0 : (t.fee || 0);
      const showDiscount = (t.discount && t.discount > 0 && !t.isRefunded);
      const people = t.numberOfPeople || t.playerStatus?.totalPlayers || 1;
      return `<tr${t.isRefunded ? ' style="background:#ffd6d6"' : ''}>
      <td>${t.ticketNo}</td>
      <td>${t.name || ''}</td>
      <td>${t.ticketType}</td>
      <td style="white-space:nowrap;text-align:right;">
        <div><b>रु ${final.toLocaleString()}</b></div>
        ${showDiscount ? `<div><span style='text-decoration:line-through;color:#888;'>रु ${orig.toLocaleString()}</span> -<span style='color:#1a7e1a;'>रु ${t.discount.toLocaleString()}</span></div><div>= <b>रु ${final.toLocaleString()}</b></div>` : ''}
        ${t.isRefunded ? '<div style="color:#d00;font-weight:bold;">Refunded</div>' : ''}
      </td>
      <td>${people}</td>
      <td>${t.totalExtraMinutes || 0} min</td>
      <td><strong>${formatNepaliDate(t.date?.nepaliDate || '')}</strong><br>${formatDate(t.date?.englishDate || t.createdAt)}</td>
      <td><strong>${formatTime(t.time || '—', t.date?.englishDate || t.createdAt)}</strong>${(() => {
        if (!t.time) return '';
        const dateObj = t.date?.englishDate ? new Date(t.date.englishDate) : null;
        if (!dateObj) return '';
        const endTime = getEndTime(t.time, dateObj, t.totalExtraMinutes || 0, t.isRefunded || false);
        return endTime ? ' - ' + endTime : '';
      })()}</td>
      <td>${t.isRefunded ? 'Yes' : ''}</td>
      <td>${t.remarks || ''}</td>
    </tr>`;
    }).join('');
    const win = window.open('', '_blank', 'width=1000,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#222;}
  h1{text-align:center;margin:4px;}
  table{width:100%;border-collapse:collapse;margin-top:10px;}
  th,td{border:1px solid #999;padding:3px 6px;font-size:12px;}
  th{background:#e5e5e5;}
  tr:nth-child(even){background:#f9f9f9;}
  @media print{body{margin:0;} table{page-break-inside:auto;} tr{page-break-inside:avoid;page-break-after:auto;}}
</style>
</head><body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>
        <th>Ticket No</th>
        <th>Name</th>
        <th>Type</th>
        <th>Fee</th>
        <th>People</th>
        <th>Extra Time</th>
        <th>Date (BS & AD)</th>
        <th>Time</th>
        <th>Refund</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>${htmlRows}</tbody>
  </table>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`);
    win.document.close();
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

// 🖨️ Print all tickets in one view
const printAllTicketsOneByOne = (ticketsToPrint) => {
  if (!ticketsToPrint?.length) return;
  
  // Collect all ticket HTML from hidden divs
  const ticketsHtml = ticketsToPrint.map((ticket, index) => {
    const ticketElement = document.getElementById(`ticket-print-${ticket._id}`);
    if (!ticketElement) return '';
    
    const ticketContent = ticketElement.innerHTML;
    // Add page break after each ticket except the last one
    const pageBreak = index < ticketsToPrint.length - 1 
      ? '<div style="page-break-after: always;"></div>' 
      : '';
    return ticketContent + pageBreak;
  }).filter(html => html.trim() !== '').join('');
  
  if (!ticketsHtml) {
    alert('No tickets found to print.');
    return;
  }
  
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print All Tickets (${ticketsToPrint.length} tickets)</title>
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
            margin: 0 auto;
          }
          @media print {
            .ticket-print {
              page-break-after: always;
            }
            .ticket-print:last-of-type {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${ticketsHtml}
        <script>
          window.onload = function() {
            // Show all tickets, then auto-open print dialog after a short delay
            setTimeout(() => {
              window.print();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=800');
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
};


  return (
    <div className="tickets-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 55%, #ffffff 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        /* Override content-area for Tickets page to be full width - scoped to this page only */
        .tickets-page-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        /* Ensure main-content positioning is preserved */
        .main-content {
          margin-left: 250px !important;
          width: calc(100% - 250px) !important;
        }
        /* Override content-area constraints for Tickets page */
        .main-content .content-area {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        /* Mobile override */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .main-content .content-area { max-width: 720px !important; width: auto !important; margin: 12px auto !important; padding: 18px !important; background-color: white !important; border-radius: 10px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        }
      `}</style>
      <NotificationContainer />

      {/* Control Center Menu at top-right above stats */}
      <style>{`
        .control-center-trigger-row {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          margin-bottom: 6px;
        }
        .control-center-menu {
          position: absolute;
          right: 0; top: 100%;
          min-width: 145px;
          background: white;
          box-shadow: 0 6px 22px 0 rgba(0,0,0,0.11);
          border-radius: 8px;
          padding: 6px 0 4px 0;
          z-index: 3;
          opacity: 0;
          pointer-events: none;
          transform: translateY(-14px) scale(0.98);
          transition: opacity 0.23s, transform 0.23s;
        }
        .control-center-menu.open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .hamburger-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 5px 12px 5px 7px;
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
          border: none;
          border-radius: 18px 8px 8px 18px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.21s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 1px 5px rgba(39,174,96,0.14);
          min-height: 26px;
          position: relative;
        }
        .hamburger-btn:hover {
          background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
          transform: translateY(-1px);
        }
        .hamburger-btn .hamburger-icon {
          display: flex;
          flex-direction: column;
          gap: 3px;
          width: 15px; height: 12px;
        }
        .hamburger-btn .hamburger-icon span {
          display: block;
          width: 100%; height: 2px;
          background: white;
          border-radius: 2px;
          transition: all 0.3s;
        }
        .hamburger-btn.open .hamburger-icon span:nth-child(1) {
          transform: rotate(45deg) translate(3px, 4px);
        }
        .hamburger-btn.open .hamburger-icon span:nth-child(2) {
          opacity: 0;
        }
        .hamburger-btn.open .hamburger-icon span:nth-child(3) {
          transform: rotate(-45deg) translate(4px, -3px);
        }
        .quick-menu-btn-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 10px;
        }
      `}</style>
      <div className="control-center-trigger-row" style={{ position: 'relative' }}>
        <button
          className={`hamburger-btn${showControlMenu ? ' open' : ''}`}
          onClick={() => setShowControlMenu(v => !v)}
        >
          <div className="hamburger-icon">
            <span></span><span></span><span></span>
          </div>
          <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>Menu</span>
        </button>
        <div className={`control-center-menu${showControlMenu ? ' open' : ''}`}>
          <div className="quick-menu-btn-list">
            {canManageTickets && (
              <GradientButton
                color="#5b21b6"
                onClick={() => { setShowControlMenu(false); navigate('/sales'); }}
                style={{ fontSize: '0.7rem', padding: '4.5px 10px', borderRadius: '6px', fontWeight: 600, minHeight: '26px', justifyContent: 'flex-start' }}
              >
                💰 Sales
              </GradientButton>
            )}
            <GradientButton
              color="#f97316"
              onClick={() => { setShowControlMenu(false); setShowRefundModal(true); }}
              style={{ fontSize: '0.7rem', padding: '4.5px 10px', borderRadius: '6px', fontWeight: 600, minHeight: '26px', justifyContent: 'flex-start' }}
            >
              🔁 Refund
            </GradientButton>
            <GradientButton
              color="#1d4ed8"
              onClick={() => { setShowControlMenu(false); setShowExtraTimeModal(true); }}
              style={{ fontSize: '0.7rem', padding: '4.5px 10px', borderRadius: '6px', fontWeight: 600, minHeight: '26px', justifyContent: 'flex-start' }}
            >
              ⏳ Extra Time
            </GradientButton>
            {isAdmin && (
              <GradientButton
                color="#0ea5e9"
                onClick={() => { setShowControlMenu(false); setShowHistory(true); }}
                style={{ fontSize: '0.7rem', padding: '4.5px 10px', borderRadius: '6px', fontWeight: 600, minHeight: '26px', justifyContent: 'flex-start' }}
              >
                📜 History
              </GradientButton>
            )}
            <GradientButton
              color="#475569"
              onClick={() => { setShowControlMenu(false); fetchTickets(); }}
              disabled={loading}
              style={{ fontSize: '0.7rem', padding: '4.5px 10px', borderRadius: '6px', fontWeight: 600, minHeight: '26px', justifyContent: 'flex-start' }}
            >
              {loading ? '⏳' : '🔄'} {loading ? 'Loading' : 'Refresh'}
            </GradientButton>
          </div>
        </div>
      </div>

      {/* Right Side - ModernStat Components (Admin only) */}
      {user?.role === 'admin' && (
        <div style={{ animation: 'slideInFromRight 0.8s cubic-bezier(.19,.94,.62,1.17)', marginBottom: '18px', minHeight: '1px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <ModernStat value={tickets.length} label="Today's Tickets" color="#8b5cf6" icon="🎟️" animationDirection="right" />
            <ModernStat value={playingTickets} label="Active / Playing" color="#10b981" icon="⚡" animationDirection="right" />
            <ModernStat value={refundedToday} label="Refunded Today" color="#f43f5e" icon="↺" animationDirection="right" />
            <ModernStat value={todaysRevenue} label="Net Revenue (रु)" color="#f59e0b" icon="₨" animationDirection="right" />
            <ModernStat value={totalExtraMinutes} label="Extra Minutes" color="#0ea5e9" icon="⏱️" animationDirection="right" />
          </div>
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'staff') && (
        <SectionCard title="Quick Ticket Entry" icon="⚡" accentColor="#27ae60">
          <style>{`
            .quick-ticket-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 18px;
            }
            @media (max-width: 700px) {
              .quick-ticket-grid {
                grid-template-columns: 1fr;
                gap: 8px;
              }
            }
            .quick-ticket-extra-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px 18px;
              margin-top: 6px;
            }
            @media (max-width: 800px) {
              .quick-ticket-extra-grid {
                grid-template-columns: 1fr;
              }
            }
            .quick-ticket-compact-actions {
              display: flex;
              gap: 10px;
              margin-top: 14px;
              margin-bottom: 0;
            }
          `}</style>
          <div className="quick-ticket-grid">
              <div>
                <label className="form-label">Customer Name *</label>
                <input
                  ref={el => setQuickAddRef(el, 0)}
                  type="text"
                  className="form-control"
                  value={quickAddData.name}
                  onChange={e => setQuickAddData({...quickAddData, name: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 0)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Player Names</label>
                <input
                  ref={el => setQuickAddRef(el, 1)}
                  type="text"
                  className="form-control"
                  value={quickAddData.playerNames}
                  onChange={e => setQuickAddData({...quickAddData, playerNames: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 1)}
                  placeholder="Rahul, Ritesh, Suresh"
                />
                <small className="text-muted">Separate with commas</small>
              </div>
              <div>
                <label className="form-label">Contact Number</label>
                <input
                  ref={el => setQuickAddRef(el, 2)}
                  type="text"
                  className="form-control"
                  value={quickAddData.contactNumber}
                  onChange={e => setQuickAddData({...quickAddData, contactNumber: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 2)}
                  placeholder="Enter contact number(s) for players"
                />
                <small className="text-muted">Enter contact numbers manually (can be multiple)</small>
              </div>
              <div>
                <label className="form-label">Ticket Type</label>
                <select
                  ref={el => setQuickAddRef(el, 3)}
                  className="form-control"
                  value={quickAddData.ticketType}
                  onChange={e => {
                    const type = e.target.value;
                    setQuickAddData({
                      ...quickAddData,
                      ticketType: type,
                      fee: ticketTypes[type].price.toString()
                    });
                  }}
                  onKeyDown={e => handleQuickAddEnter(e, 3)}
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
                  ref={el => setQuickAddRef(el, 4)}
                  type="number"
                  className="form-control"
                  value={quickAddData.fee}
                  onChange={e => setQuickAddData({...quickAddData, fee: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 4)}
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
                  ref={el => setQuickAddRef(el, 5)}
                  type="number"
                  className="form-control"
                  value={quickAddData.numberOfPeople}
                  onChange={e => setQuickAddData({...quickAddData, numberOfPeople: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 5)}
                  min="1"
                  step="1"
                />
                <small className="text-muted">Default is 1 person</small>
              </div>
              <div>
                <label className="form-label">Discount (Optional)</label>
                <input
                  ref={el => setQuickAddRef(el, 6)}
                  type="number"
                  className="form-control"
                  value={quickAddData.discount}
                  onChange={e => setQuickAddData({...quickAddData, discount: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 6)}
                  min="0"
                  step="1"
                  placeholder="0"
                />
                <small className="text-muted">discount amount in Rs</small>
              </div>
              <div>
                <label className="form-label">Remarks</label>
                <input
                  ref={el => setQuickAddRef(el, 7)}
                  type="text"
                  className="form-control"
                  value={quickAddData.remarks}
                  onChange={e => setQuickAddData({...quickAddData, remarks: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 7)}
                  placeholder="Any remarks"
                />
              </div>
          </div>
          <div className="quick-ticket-extra-grid">
              <div>
                <label className="form-label">Group Name (optional)</label>
                <input
                  ref={el => setQuickAddRef(el, 8)}
                  type="text"
                  className="form-control"
                  value={quickAddData.groupName}
                  onChange={e => setQuickAddData({...quickAddData, groupName: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 8)}
                  placeholder="E.g., School Tour"
                />
              </div>
              <div>
                <label className="form-label">Group Number</label>
                <input
                  ref={el => setQuickAddRef(el, 9)}
                  type="text"
                  className="form-control"
                  value={quickAddData.groupNumber}
                  onChange={e => setQuickAddData({...quickAddData, groupNumber: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 9)}
                  placeholder="ID / Reference"
                />
              </div>
              <div>
                <label className="form-label">Group Price (NPR)</label>
                <input
                  ref={el => setQuickAddRef(el, 10)}
                  type="number"
                  className="form-control"
                  value={quickAddData.groupPrice}
                  onChange={e => setQuickAddData({...quickAddData, groupPrice: e.target.value })}
                  onKeyDown={e => handleQuickAddEnter(e, 10)}
                  min="0"
                  step="1"
                  placeholder="Total group price"
                />
              </div>
          </div>
          <div className="quick-ticket-compact-actions">
            <GradientButton 
              color="#10b981"
              onClick={handleQuickAddSubmit}
              disabled={loading}
              style={{ fontSize: '0.78rem', padding: '6px 16px', minHeight: '32px', borderRadius: '8px' }}
            >
              {loading ? 'Creating...' : 'Add & Auto-Print (Enter)'}
            </GradientButton>
          </div>
        </SectionCard>
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
          <div className="modal-content" style={{ maxWidth: '95%', width: '1200px', maxHeight: '90vh', overflow: 'auto', background: 'transparent' }}>
            <SectionCard
              title="Ticket Refund"
              icon="🔁"
              accentColor="#27ae60"
              style={{ padding: '28px 28px 24px' }}
              headerActions={
                <>
                  {recentRefunds.length > 0 && (
                    <GradientButton color="#0ea5e9" style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                      onClick={() => printAllTicketsOneByOne(recentRefunds)}
                      title="Print All Refunded Tickets"
                    >
                      🖨️ Print All
                    </GradientButton>
                  )}
                  <GradientButton color="#6366f1" style={{ fontSize: '0.9rem', padding: '8px 16px' }} onClick={fetchRecentRefunds}>
                    {recentRefundsLoading ? 'Loading...' : 'Refresh'}
                  </GradientButton>
                  <GradientButton color="#d32f2f" style={{ minWidth: '50px' }} onClick={() => {
                    setShowRefundModal(false);
                    resetRefundState();
                  }}>Close</GradientButton>
                </>
              }
            >
              {/* Ticket Search & Details Card */}
              <SectionCard title="Search & Refund Ticket" icon="🔎" accentColor="#27ae60" style={{ marginBottom: 18 }}>
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
                    <GradientButton color="#1976d2" style={{ minWidth: '120px' }} onClick={lookupRefundTicket} disabled={refundLoading}>{refundLoading ? 'Searching...' : 'Search'}</GradientButton>
                  </div>
                  <small className="text-muted">Ticket details auto-fill as soon as ID is found.</small>
                </div>
                {/* Ticket Details */}
                {!!refundTicket && (
                  <SectionCard title="Ticket Details" icon="🎟️" accentColor="#27ae60" style={{ marginTop: 16 }}>
                    {(() => {
                      const discount = refundTicket.discount || 0;
                      const amountPaid = refundTicket.fee || 0;
                      const originalPrice = amountPaid + discount;
                      const cancellationFee = parseFloat(refundForm.cancellationFee) || 0;
                      const totalPlayersForTicket = totalPlayersForRefund || 1;
                      const calculatedRefund = refundPreviewAmount;
                      const perPlayerAmount = perPlayerRefundValue || amountPaid;

                      return (
                        <>
                          <div className="grid grid-2">
                            <div>
                              <p><strong>Name:</strong> {refundTicket.name}</p>
                              <p><strong>Total Players:</strong> {totalPlayersForTicket}</p>
                              {discount > 0 ? (
                                <>
                                  <p><strong>Original Price:</strong> रु {originalPrice.toLocaleString()}</p>
                                  <p><strong>Discount:</strong> <span style={{ color: '#d32f2f' }}>- रु {discount.toLocaleString()}</span></p>
                                  <p><strong>Amount Paid:</strong> <strong>रु {amountPaid.toLocaleString()}</strong></p>
                                </>
                              ) : (
                                <p><strong>Ticket Amount:</strong> रु {amountPaid.toLocaleString()}</p>
                              )}
                              {refundTicket.groupInfo?.groupName && (
                                <p><strong>Group:</strong> {refundTicket.groupInfo.groupName} {refundTicket.groupInfo.groupNumber && `(${refundTicket.groupInfo.groupNumber})`}</p>
                              )}
                            </div>
                            <div>
                              <p><strong>Ticket Type:</strong> {refundTicket.ticketType}</p>
                              <p><strong>Date:</strong> <strong>{formatNepaliDate(refundTicket.date?.nepaliDate)}</strong> ({formatDate(refundTicket.date?.englishDate)})</p>
                              <p><strong>Time:</strong> {(() => {
                                if (!refundTicket.time) return '—';
                                const dateObj = refundTicket.date?.englishDate ? new Date(refundTicket.date.englishDate) : null;
                                if (!dateObj) return refundTicket.time;
                                const endTime = getEndTime(refundTicket.time, dateObj, refundTicket.totalExtraMinutes || 0, refundTicket.isRefunded);
                                return endTime ? `${refundTicket.time} - ${endTime}` : refundTicket.time;
                              })()}</p>
                              <p><strong>Extra Time:</strong> {refundTicket.totalExtraMinutes || 0} min</p>
                            </div>
                          </div>
                          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px', border: '1px solid #007bff' }}>
                            <h5 style={{ marginBottom: '8px' }}>Refund Calculation:</h5>
                            <p style={{ margin: '4px 0' }}>Amount Paid: <strong>रु {amountPaid.toLocaleString()}</strong></p>
                            <p style={{ margin: '4px 0' }}>
                              Per Player Share: <strong>रु {perPlayerAmount.toLocaleString()}</strong> (after discount)
                            </p>
                            {cancellationFee > 0 && (
                              <p style={{ margin: '4px 0', color: '#d32f2f' }}>Cancellation Fee: <strong>- रु {cancellationFee.toLocaleString()}</strong></p>
                            )}
                            <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#1a7e1a' }}>
                              Refund Amount: <strong>रु {calculatedRefund.toLocaleString()}</strong>
                            </p>
                            <small className="text-muted">
                              Rule: (Amount Paid ÷ Players) × Players Refunded {cancellationFee > 0 ? ' - Cancellation Fee' : ''}
                            </small>
                          </div>
                        </>
                      );
                    })()}
                  </SectionCard>
                )}
              </SectionCard>
              {/* Refund Form Card */}
              {!!refundTicket && (
                <SectionCard title="Refund Details" icon="💸" accentColor="#27ae60" style={{ marginBottom: 18 }}>
                  <div className="grid grid-3 gap-3">
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
                      <label className="form-label">Cancellation Fee (Optional)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={refundForm.cancellationFee}
                        onChange={(e) => {
                          const fee = parseFloat(e.target.value) || 0;
                          const newRefund = calculateRefundAmount(
                            refundTicket,
                            typeof playersToRefundCount === 'number' ? playersToRefundCount : null,
                            fee
                          );
                          setRefundForm({ ...refundForm, cancellationFee: e.target.value, refundAmount: newRefund.toString() });
                        }}
                        min="0"
                        step="1"
                        placeholder="0"
                      />
                      <small className="text-muted">Deduct this amount from refund (if applicable)</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Players To Refund</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max={totalPlayersForRefund || 1}
                        value={refundForm.refundedPlayersCount}
                        onChange={(e) => handleRefundPlayersChange(e.target.value)}
                        placeholder="e.g. 2"
                      />
                      <small className="text-muted">
                        Auto splits रु {(perPlayerRefundValue || 0).toLocaleString()} per player (after discount)
                      </small>
                      <small className="text-muted">
                        Example: Pay रु 300, discount रु 50 ⇒ रु 250 net. For 3 players, प्रति व्यक्ति रु 83.33.
                        Refunding 2 players automatically returns रु 166.67.
                      </small>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Refund Amount (NPR) - Auto-calculated</label>
                    <input
                      type="number"
                      className="form-control"
                      value={refundForm.refundAmount}
                      onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                      min="0"
                      step="0.01"
                      style={{ backgroundColor: '#f0f8ff', fontWeight: 'bold' }}
                    />
                    <small className="text-muted">This is calculated automatically. You can adjust if needed.</small>
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
                  <GradientButton
                    color="#f97316"
                    style={{ marginTop: 16 }}
                    onClick={handleRefundSubmit}
                    disabled={refundLoading || !refundTicket}
                  >
                    {refundLoading ? 'Processing...' : 'Process Refund'}
                  </GradientButton>
                </SectionCard>
              )}
              {/* ---- Recent Refunds ---- */}
              <SectionCard title="Recent Refunds" icon="📋" accentColor="#27ae60">
                {recentRefunds.length === 0 ? (
                  <p className="text-muted">No refund records yet.</p>
                ) : (
                  <div style={{ maxHeight: '260px', overflow: 'auto', width: '100%' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ticket No</th>
                          <th>Name</th>
                          <th>Time</th>
                          <th>Refund Amount</th>
                          <th>Method</th>
                          <th>Reason</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRefunds.map((ticket) => {
                          const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
                          const endTime = ticket.time && dateObj ? getEndTime(ticket.time, dateObj, ticket.totalExtraMinutes || 0, ticket.isRefunded || false) : null;

                          return (
                            <tr key={ticket._id}>
                              <td>{ticket.ticketNo}</td>
                              <td>{ticket.name}</td>
                              <td>
                                <strong>{formatTime(ticket.time, ticket.date?.englishDate || ticket.createdAt)}</strong>
                                {(() => {
                                  if (!ticket.time || !dateObj) return '';
                                  return endTime ? ` - ${endTime}` : '';
                                })()}
                              </td>
                              <td>रु {(ticket.refundAmount || ticket.fee || 0).toLocaleString()}</td>
                              <td>{ticket.refundDetails?.refundMethod || 'cash'}</td>
                              <td><small>{ticket.refundReason || '—'}</small></td>
                              <td>
                                <small>
                                  <strong>{formatNepaliDate(ticket.date?.nepaliDate)}</strong><br/>
                                  <span style={{ color: '#666', fontSize: '0.85em' }}>
                                    {formatDate(ticket.date?.englishDate || ticket.createdAt)}
                                  </span>
                                </small>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    style={{ minWidth: 30 }}
                                    onClick={() => { setSelectedTicket(ticket); setShowPrint(true); setAutoPrint(false); }}
                                    title="Preview Ticket"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-info"
                                    onClick={() => openTicketPrintWindow(ticket)}
                                    title="Print Ticket"
                                  >
                                    🖨️
                                  </button>
                                  {user?.role === 'admin' && (
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete ticket ${ticket.ticketNo}?`)) {
                                          await handleDelete(ticket._id);
                                          fetchRecentRefunds();
                                        }
                                      }}
                                      title="Delete Ticket"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Extra Time Modal */}
      {showExtraTimeModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '95%', width: '1200px', maxHeight: '90vh', overflow: 'auto', background: 'transparent' }}>
            <SectionCard
              title="Extra Time Ticket"
              icon="⏳"
              accentColor="#27ae60"
              style={{ padding: '28px 28px 24px' }}
              headerActions={
                <>
                  {extraTimeReport.length > 0 && (
                    <GradientButton color="#0ea5e9" style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                      onClick={async () => {
                        // Fetch full ticket data for all entries in the report
                        const ticketsToPrint = [];
                        for (const entry of extraTimeReport) {
                          try {
                            const response = await ticketsAPI.lookup(entry.ticketNo);
                            if (response.data.ticket) {
                              ticketsToPrint.push(response.data.ticket);
                            }
                          } catch (err) {
                            console.error(`Error fetching ticket ${entry.ticketNo}:`, err);
                          }
                        }
                        if (ticketsToPrint.length > 0) {
                          printAllTicketsOneByOne(ticketsToPrint);
                        } else {
                          alert('No tickets found to print');
                        }
                      }}
                      title="Print All Extra Time Tickets"
                    >
                      🖨️ Print All
                    </GradientButton>
                  )}
                  <GradientButton color="#64748b" style={{ fontSize: '0.9rem', padding: '8px 16px' }} onClick={fetchExtraTimeReport}>
                    {extraTimeReportLoading ? 'Loading...' : 'Refresh Report'}
                  </GradientButton>
                  <GradientButton color="#d32f2f" style={{ minWidth: '50px' }} onClick={() => {
                    setShowExtraTimeModal(false);
                    resetExtraTimeState();
                  }}>Close</GradientButton>
                </>
              }
            > 
              {/* Ticket Search & Entry */}
              <SectionCard title="Search Ticket" icon="🔍" accentColor="#27ae60" style={{ marginBottom: 18 }}>
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
                    <GradientButton color="#1976d2" style={{ minWidth: '120px' }} onClick={lookupExtraTimeTicket}>Search</GradientButton>
                  </div>
                  <small className="text-muted">Search by ticket ID or contact number. If multiple tickets found with same contact number, the most recent one will be selected.</small>
                </div>
                {extraTimeTicket && (
                  <SectionCard title="Current Ticket" icon="🎟️" accentColor="#27ae60" style={{ marginTop: 16 }}>
                    <div className="grid grid-2">
                      <div>
                        <p><strong>Name:</strong> {extraTimeTicket.name}</p>
                        <p><strong>Ticket No:</strong> {extraTimeTicket.ticketNo}</p>
                        <p><strong>People:</strong> {extraTimeTicket.numberOfPeople || extraTimeTicket.playerStatus?.totalPlayers || 1}</p>
                        <p><strong>Time:</strong> {(() => {
                          if (!extraTimeTicket.time) return '—';
                          const dateObj = extraTimeTicket.date?.englishDate ? new Date(extraTimeTicket.date.englishDate) : null;
                          if (!dateObj) return extraTimeTicket.time;
                          const endTime = getEndTime(extraTimeTicket.time, dateObj, extraTimeTicket.totalExtraMinutes || 0, extraTimeTicket.isRefunded);
                          return endTime ? `${extraTimeTicket.time} - ${endTime}` : extraTimeTicket.time;
                        })()}</p>
                      </div>
                      <div>
                        <p><strong>Ticket Type:</strong> {extraTimeTicket.ticketType}</p>
                        <p><strong>Total Extra Time:</strong> {extraTimeTicket.totalExtraMinutes || 0} min</p>
                        <p><strong>Amount:</strong> रु {extraTimeTicket.fee?.toLocaleString()}</p>
                      </div>
                    </div>
                  </SectionCard>
                )}
              </SectionCard>
              {/* ---- Add Extra Time ---- */}
              <SectionCard title="Add Extra Time" icon="⏲️" accentColor="#27ae60" style={{ marginBottom: 18 }}>
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
                  <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 12 }}>
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
                <GradientButton color="#16a34a" style={{ marginTop: 12 }} onClick={handleAddExtraTime} disabled={!extraTimeTicket}>Save Extra Time</GradientButton>
              </SectionCard>
              {/* ---- Extra Time History ---- */}
              <SectionCard title="Extra Time History" icon="📋" accentColor="#27ae60" style={{ marginBottom: 18 }}>
                {extraTimeEntries.length === 0 ? (
                  <p className="text-muted">No extra time records for this ticket yet.</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
                    <table className="table" style={{ width: '100%', tableLayout: 'fixed', fontSize: '0.98em', margin: 0 }}>
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
                            <td>{formatDateTime(entry.addedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
              {/* ---- Extra Time Report ---- */}
              <SectionCard title="Extra Time Report" icon="📅" accentColor="#27ae60">
                {extraTimeReport.length === 0 ? (
                  <p className="text-muted">No extra time records yet.</p>
                ) : (
                  <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto', width: '100%' }}>
                    <table className="table" style={{ width: '100%', tableLayout: 'fixed', fontSize: '0.8em', margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '7%', padding: '4px 2px', fontSize: '0.75em' }}>Ticket</th>
                          <th style={{ width: '10%', padding: '4px 2px', fontSize: '0.75em' }}>Name</th>
                          <th style={{ width: '11%', padding: '4px 2px', fontSize: '0.75em' }}>Time</th>
                          <th style={{ width: '5%', padding: '4px 2px', fontSize: '0.75em', textAlign: 'center' }}>Min</th>
                          <th style={{ width: '8%', padding: '4px 2px', fontSize: '0.75em' }}>Label</th>
                          <th style={{ width: '12%', padding: '4px 2px', fontSize: '0.75em' }}>Notes</th>
                          <th style={{ width: '12%', padding: '4px 2px', fontSize: '0.75em' }}>Added At</th>
                          <th style={{ width: '35%', padding: '4px 2px', fontSize: '0.75em', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraTimeReport.map((entry, idx) => {
                          const dateObj = entry.date?.englishDate ? new Date(entry.date.englishDate) : null;
                          const endTime = entry.time && dateObj ? getEndTime(entry.time, dateObj, entry.totalExtraMinutes || 0, entry.isRefunded || false) : null;

                          const handleExtraTimeAction = async (action) => {
                            try {
                              let fullTicket = null;

                              try {
                                const response = await ticketsAPI.lookup(entry.ticketNo);
                                fullTicket = response.data.ticket;
                              } catch (err) {
                                if (entry._id && entry._id !== 'undefined' && entry._id.toString().length === 24) {
                                  try {
                                    const response = await ticketsAPI.getById(entry._id);
                                    fullTicket = response.data;
                                  } catch (err2) {
                                    console.error('Error fetching ticket:', err2);
                                    alert('Ticket not found');
                                    return;
                                  }
                                } else {
                                  alert('Ticket not found');
                                  return;
                                }
                              }

                              if (!fullTicket || !fullTicket._id) {
                                alert('Ticket not found or invalid');
                                return;
                              }

                              const ticketId = fullTicket._id;

                              if (action === 'preview') {
                                setSelectedTicket(fullTicket);
                                setShowPrint(true);
                                setAutoPrint(false);
                              } else if (action === 'print') {
                                openTicketPrintWindow(fullTicket);
                              } else if (action === 'delete') {
                                if (window.confirm(`Are you sure you want to delete ticket ${fullTicket.ticketNo}?`)) {
                                  await handleDelete(ticketId);
                                  fetchExtraTimeReport();
                                }
                              } else if (action === 'refund') {
                                const reason = prompt('Enter refund reason:');
                                if (reason) {
                                  await handleRefund(ticketId, reason);
                                  fetchExtraTimeReport();
                                }
                              }
                            } catch (error) {
                              console.error('Error handling action:', error);
                              alert('Error: ' + (error.response?.data?.message || error.message || 'Unknown error'));
                            }
                          };

                          return (
                            <tr key={`${entry.ticketNo}-${idx}`} style={{ lineHeight: '1.2' }}>
                              <td style={{ fontSize: '0.75em', padding: '3px 2px' }}><strong>{entry.ticketNo}</strong></td>
                              <td style={{ fontSize: '0.75em', padding: '3px 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>{entry.name}</td>
                              <td style={{ fontSize: '0.7em', padding: '3px 2px', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  if (!entry.time) return '—';
                                  if (!dateObj) return entry.time;
                                  return endTime ? `${entry.time}-${endTime}` : entry.time;
                                })()}
                              </td>
                              <td style={{ fontSize: '0.75em', padding: '3px 2px', textAlign: 'center' }}>{entry.minutes}</td>
                              <td style={{ fontSize: '0.7em', padding: '3px 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.label}>{entry.label}</td>
                              <td style={{ fontSize: '0.7em', padding: '3px 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.notes || ''}>{entry.notes || '—'}</td>
                              <td style={{ fontSize: '0.7em', padding: '3px 2px' }}>
                                <div>{formatDate(entry.addedAt)}</div>
                                <div style={{ color: '#666', fontSize: '0.65em' }}>{new Date(entry.addedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td style={{ textAlign: 'center', padding: '2px' }}>
                                <div className="d-flex gap-1" style={{ justifyContent: 'center', flexWrap: 'nowrap' }}>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    style={{ minWidth: '24px', width: '24px', height: '24px', padding: '1px', fontSize: '10px', lineHeight: '1' }}
                                    onClick={() => handleExtraTimeAction('preview')}
                                    title="Preview"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-info"
                                    style={{ minWidth: '24px', width: '24px', height: '24px', padding: '1px', fontSize: '10px', lineHeight: '1' }}
                                    onClick={() => handleExtraTimeAction('print')}
                                    title="Print"
                                  >
                                    🖨️
                                  </button>
                                  {!entry.isRefunded && (user?.role === 'admin' || user?.role === 'staff') && (
                                    <button
                                      className="btn btn-sm btn-danger"
                                      style={{ minWidth: '24px', width: '24px', height: '24px', padding: '1px', fontSize: '10px', lineHeight: '1' }}
                                      onClick={() => handleExtraTimeAction('refund')}
                                      title="Refund"
                                    >
                                      🔄
                                    </button>
                                  )}
                                  {user?.role === 'admin' && (
                                    <button
                                      className="btn btn-sm btn-danger"
                                      style={{ minWidth: '24px', width: '24px', height: '24px', padding: '1px', fontSize: '10px', lineHeight: '1' }}
                                      onClick={() => handleExtraTimeAction('delete')}
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </SectionCard>
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
                  {extraTimePrintData.ticketTime && extraTimePrintData.ticketDate && (
                    <p style={{ margin: '5px 0', fontSize: '12px' }}>
                      <strong>Ticket Time:</strong> {(() => {
                        const dateObj = extraTimePrintData.ticketDate?.englishDate ? new Date(extraTimePrintData.ticketDate.englishDate) : null;
                        if (!dateObj) return extraTimePrintData.ticketTime;
                        const endTime = getEndTime(extraTimePrintData.ticketTime, dateObj, extraTimePrintData.totalExtraMinutes || 0, extraTimePrintData.isRefunded || false);
                        return endTime ? `${extraTimePrintData.ticketTime} - ${endTime}` : extraTimePrintData.ticketTime;
                      })()}
                    </p>
                  )}
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
        <SectionCard
          title={`Recent Tickets (${tickets.length})`}
          icon="🕒"
          accentColor="#14532d"
          headerActions={
            tickets.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <small style={{ color: '#64748b' }}>Last updated: {new Date().toLocaleTimeString()}</small>
                <GradientButton
                  color="#0ea5e9"
                  style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                  onClick={() => printAllTicketsOneByOne(tickets)}
                  title="Print All Tickets One by One"
                >
                  🖨️ Print All
                </GradientButton>
              </div>
            )
          }
        >
          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No tickets found for today</p>
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <p className="text-muted">Use the quick entry form above to create tickets</p>
              )}
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <table
                className="table"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72em', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '6%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Ticket</th>
                    <th style={{ width: '14%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Customer/Players</th>
                    <th style={{ width: '7%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Type</th>
                    <th style={{ width: '14%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Fee</th>
                    <th style={{ width: '6%', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>People</th>
                    <th style={{ width: '6%', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Extra</th>
                    <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Time</th>
                    <th style={{ width: '7%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Refund</th>
                    <th style={{ width: '7%', padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Remarks</th>
                    <th style={{ width: '6%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr className={ticket.isRefunded ? 'table-danger' : ''} key={ticket._id}>
                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}><strong>{ticket.ticketNo}</strong>{!ticket.printed && <span className="text-warning"> *</span>}</td>
                      <td style={{ padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div>
                          <strong>{ticket.name}</strong>
                          {ticket.playerNames && ticket.playerNames.length > 0 && (
                            <div>
                              <small className="text-muted" style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.playerNames.join(', ')}</small>
                            </div>
                          )}
                          {ticket.groupInfo?.groupName && (
                            <div>
                              <small className="text-muted">Group: {ticket.groupInfo.groupName} {ticket.groupInfo.groupNumber ? `(${ticket.groupInfo.groupNumber})` : ''}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}>{ticket.ticketType}</td>
                      <td style={{ minWidth: '135px', width: '135px', padding: '4px 3px' }}>
                        <div style={{ fontSize: '0.82em', lineHeight: '1.35' }}>
                          {/* Actual, Disc, Refund, Total like the compact history table */}
                          <div style={{ marginBottom: '2px' }}><strong>Actual:</strong> रु {(ticket.perPersonFee && ticket.perPersonFee > 0
                            ? ticket.perPersonFee * (ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1)
                            : (ticket.discount || 0) > 0
                              ? (ticket.fee || 0) + (ticket.discount || 0)
                              : (ticket.fee || 0)).toLocaleString()}</div>
                          {(ticket.discount || 0) > 0 ? (
                            <div style={{ marginBottom: '2px' }}><strong>Disc.:</strong> -रु {(ticket.discount || 0).toLocaleString()}</div>
                          ) : (
                            <div style={{ marginBottom: '2px' }}><strong>Disc.:</strong> रु 0</div>
                          )}
                          <div className={ticket.refundAmount > 0 ? 'text-danger' : ''} style={{ marginBottom: '2px' }}>
                            <strong>Refund:</strong> रु {(ticket.refundAmount || (ticket.isRefunded ? (ticket.fee || 0) : 0)).toLocaleString()}
                          </div>
                          <div><strong>Total:</strong> रु {(ticket.fee || 0).toLocaleString()}</div>
                        </div>
                      </td>
                      <td style={{ padding: '4px 3px', textAlign: 'center' }}>{ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>{ticket.totalExtraMinutes || 0} min</td>
                      <td style={{ padding: '4px 3px' }}><small><strong>{formatNepaliDate(ticket.date?.nepaliDate)}</strong><br /><span style={{ color: '#666', fontSize: '0.85em' }}>{formatDate(ticket.date?.englishDate || ticket.createdAt)}</span></small></td>
                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}>
                        <small>
                          <strong>{formatTime(ticket.time, ticket.date?.englishDate || ticket.createdAt)} </strong>
                          {(() => {
                            if (!ticket.time) return '';
                            const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
                            if (!dateObj) return '';
                            const endTime = getEndTime(ticket.time, dateObj, ticket.totalExtraMinutes || 0, ticket.isRefunded);
                            return endTime ? `- ${endTime}` : '';
                          })()}
                        </small>
                      </td>
                      <td style={{ padding: '4px 3px' }}>{(() => {const created = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : new Date(ticket.createdAt);const now = new Date();const oneHourPassed = ((now - created) / 36e5) > 1;if (oneHourPassed && !ticket.isRefunded) {return <span className="badge badge-secondary">Deactivated</span>;}if (ticket.isRefunded) {return <span className="badge badge-danger">Refunded</span>;}return <span className="badge badge-warning">Playing</span>;})()}</td>
                      <td style={{ padding: '4px 3px' }}>{(() => {const refundAmt = ticket.refundAmount || (ticket.isRefunded ? (ticket.fee || 0) : 0);if (refundAmt > 0) {return (<div style={{ fontSize: '0.85em' }}><div className="text-danger"><strong>रु {refundAmt.toLocaleString()}</strong></div>{ticket.refundReason && (<div className="text-muted" style={{ fontSize: '0.75em' }}>{ticket.refundReason}</div>)}{ticket.refundDetails?.refundMethod && (<div className="text-muted" style={{ fontSize: '0.75em' }}>({ticket.refundDetails.refundMethod})</div>)}</div>);}return <span>रु 0</span>;})()}</td>
                      <td style={{ padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><small>{ticket.remarks || '—'}</small></td>
                      <td style={{ padding: '4px 3px' }}><div className="d-flex gap-1" style={{ flexWrap: 'wrap' }}><button className="btn btn-sm btn-outline-primary" style={{ minWidth: 22, width: 22, height: 22, padding: 0 }} onClick={() => { setSelectedTicket(ticket); setShowPrint(true); setAutoPrint(false); }} title="Preview Ticket"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg></button><button className="btn btn-sm btn-info" style={{ minWidth: 22, width: 22, height: 22, padding: 0 }} onClick={() => openTicketPrintWindow(ticket)} title="Print Ticket">🖨️</button>{!ticket.isRefunded && (user?.role === 'admin' || user?.role === 'staff') && (<><button className="btn btn-sm btn-warning" style={{ minWidth: 22, width: 22, height: 22, padding: 0 }} onClick={() => handlePartialRefund(ticket)} title="Partial Refund" disabled={ticket.playerStatus.playedPlayers >= ticket.playerStatus.totalPlayers}>💰</button><button className="btn btn-sm btn-danger" style={{ minWidth: 22, width: 22, height: 22, padding: 0 }} onClick={() => { const reason = prompt('Enter full refund reason:'); if (reason) handleRefund(ticket._id, reason); }} title="Full Refund">🔄</button></>)}{user?.role === 'admin' && (<button className="btn btn-sm btn-danger" style={{ minWidth: 22, width: 22, height: 22, padding: 0 }} onClick={() => handleDelete(ticket._id)} title="Delete Ticket">🗑️</button>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Ticket History Modal */}
      {showHistory && user?.role === 'admin' && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '95%', width: '1400px', maxHeight: '90vh', overflow: 'auto', background: 'transparent' }}>
            <SectionCard
              title="Ticket History"
              icon="📜"
              accentColor="#27ae60"
              style={{ padding: '28px 28px 24px' }}
              headerActions={
                <>
                  <GradientButton color="#2ecc71" style={{ fontSize: '0.9rem', padding: '8px 16px' }} onClick={() => fetchTicketHistory(1, false)} disabled={historyLoading}>
                    {historyLoading ? 'Refreshing...' : '🔄 Refresh'}
                  </GradientButton>
                  <GradientButton
                    color="#0ea5e9"
                    style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                    onClick={() => printTicketsTableReport(historyTickets, historySearch ? `Ticket History Report - Search: ${historySearch}` : 'Ticket History Report')}
                    disabled={!historyTickets.length}
                  >
                    🖨️ Print All
                  </GradientButton>
                  <input
                    type="text"
                    placeholder="Search history..."
                    className="form-control form-control-sm d-inline-block"
                    style={{ width: 200 }}
                    value={historySearch ?? ''}
                    onChange={e => setHistorySearch(e.target.value)}
                  />
                  <GradientButton color="#d32f2f" style={{ marginLeft: 15, minWidth: 50 }} onClick={() => setShowHistory(false)}>
                    Close
                  </GradientButton>
                </>
              }
            >
              <div style={{ display: 'flex', gap: '18px', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '10px', marginTop: 0 }}>
                <ModernStat value={historyTickets.length} label="Tickets" color="#6366f1" icon="🎟️" animationDirection="right" />
                <ModernStat value={historyTickets.filter(t => t.isRefunded).length} label="Refunded" color="#ef4444" icon="↩️" animationDirection="right" />
                <ModernStat value={historyTotalCount} label="Total Records" color="#14b8a6" icon="📚" animationDirection="right" />
              </div>

              {historyLoading && historyTickets.length === 0 ? (
                <Loader text="Loading ticket history..." />
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Total Tickets: {historyTotalCount}</strong>
                    {historyTickets.length > 0 && (
                      <small className="text-muted" style={{ marginLeft: 8 }}>
                        Showing {historyTickets.length} of {historyTotalCount}
                      </small>
                    )}
                  </div>

                  {(() => {
                    const searchTerm = (historySearch || '').toLowerCase().trim();
                    const filteredTickets = searchTerm
                      ? historyTickets.filter(ticket => {
                          const ticketNo = (ticket.ticketNo || '').toLowerCase();
                          const name = (ticket.name || '').toLowerCase();
                          const contactNumber = (ticket.contactNumber || '').toLowerCase();
                          const playerNames = (ticket.playerNames || []).join(' ').toLowerCase();
                          const remarks = (ticket.remarks || '').toLowerCase();
                          const refundReason = (ticket.refundReason || '').toLowerCase();
                          const ticketType = (ticket.ticketType || '').toLowerCase();
                          const nepaliDate = (ticket.date?.nepaliDate || '').toLowerCase();

                          return ticketNo.includes(searchTerm) ||
                                 name.includes(searchTerm) ||
                                 contactNumber.includes(searchTerm) ||
                                 playerNames.includes(searchTerm) ||
                                 remarks.includes(searchTerm) ||
                                 refundReason.includes(searchTerm) ||
                                 ticketType.includes(searchTerm) ||
                                 nepaliDate.includes(searchTerm);
                        })
                      : historyTickets;

                    if (filteredTickets.length === 0) {
                      return (
                        <div className="empty-state">
                          <p>{searchTerm ? `No tickets found matching \"${historySearch}\"` : 'No ticket history found'}</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {searchTerm && (
                          <div className="alert alert-info mb-2">
                            Showing {filteredTickets.length} of {historyTickets.length} tickets matching "{historySearch}"
                          </div>
                        )}
                        <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
                          <table
                            className="table"
                            style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72em', tableLayout: 'fixed' }}
                          >
                            <thead>
                              <tr>
                                <th style={{ width: '6%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Ticket</th>
                                <th style={{ width: '14%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Customer/Players</th>
                                <th style={{ width: '7%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Type</th>
                                <th style={{ width: '14%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Fee</th>
                                <th style={{ width: '6%', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>People</th>
                                <th style={{ width: '6%', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>Extra</th>
                                <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Time</th>
                                <th style={{ width: '7%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Status</th>
                                <th style={{ width: '9%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Refund</th>
                                <th style={{ width: '7%', padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Remarks</th>
                                <th style={{ width: '6%', padding: '4px 3px', whiteSpace: 'nowrap' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTickets.map(ticket => {
                                const people = ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1;
                                const discountAmount = ticket.discount || 0;
                                const priceAfterDiscount = ticket.fee || 0;

                                let actualPrice;
                                if (ticket.perPersonFee && ticket.perPersonFee > 0) {
                                  actualPrice = ticket.perPersonFee * people;
                                } else if (discountAmount > 0) {
                                  actualPrice = priceAfterDiscount + discountAmount;
                                } else {
                                  actualPrice = priceAfterDiscount;
                                }

                                const refundAmount = ticket.refundAmount || (ticket.isRefunded ? priceAfterDiscount : 0);

                                return (
                                  <React.Fragment key={ticket._id}>
                                    <tr className={ticket.isRefunded ? 'table-danger' : ''}>
                                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}><strong>{ticket.ticketNo}</strong></td>
                                      <td style={{ padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <div>
                                          <strong>{ticket.name}</strong>
                                          {ticket.playerNames && ticket.playerNames.length > 0 && (
                                            <div>
                                              <small className="text-muted" style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {ticket.playerNames.join(', ')}
                                              </small>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}>{ticket.ticketType}</td>
                                      <td style={{ minWidth: '135px', width: '135px', padding: '4px 3px' }}>
                                        <div style={{ fontSize: '0.82em', lineHeight: '1.35' }}>
                                          <div style={{ marginBottom: '2px' }}><strong>Actual:</strong> रु {actualPrice.toLocaleString()}</div>
                                          {discountAmount > 0 ? (
                                            <div style={{ marginBottom: '2px' }}>
                                              <strong>Disc.:</strong> -रु {discountAmount.toLocaleString()}
                                            </div>
                                          ) : (
                                            <div style={{ marginBottom: '2px' }}><strong>Disc.:</strong> रु 0</div>
                                          )}
                                          <div className={refundAmount > 0 ? 'text-danger' : ''} style={{ marginBottom: '2px' }}>
                                            <strong>Refund:</strong> रु {refundAmount.toLocaleString()}
                                          </div>
                                          <div><strong>Total:</strong> रु {priceAfterDiscount.toLocaleString()}</div>
                                        </div>
                                      </td>
                                      <td style={{ padding: '4px 3px', textAlign: 'center' }}>{people}</td>
                                      <td style={{ padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>{ticket.totalExtraMinutes || 0} min</td>
                                      <td style={{ padding: '4px 3px' }}>
                                        <small>
                                          <strong>{formatNepaliDate(ticket.date?.nepaliDate)}</strong>
                                          <br />
                                          <span style={{ color: '#666', fontSize: '0.85em' }}>
                                            {formatDate(ticket.date?.englishDate || ticket.createdAt)}
                                          </span>
                                        </small>
                                      </td>
                                      <td style={{ padding: '4px 3px', whiteSpace: 'nowrap' }}>
                                        <small>
                                          <strong>{formatTime(ticket.time, ticket.date?.englishDate || ticket.createdAt)}</strong>
                                          {(() => {
                                            if (!ticket.time) return '';
                                            const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
                                            if (!dateObj) return '';
                                            const endTime = getEndTime(ticket.time, dateObj, ticket.totalExtraMinutes || 0, ticket.isRefunded);
                                            return endTime ? ` - ${endTime}` : '';
                                          })()}
                                        </small>
                                      </td>
                                      <td style={{ padding: '4px 3px' }}>
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
                                      <td style={{ padding: '4px 3px' }}>
                                        {(() => {
                                          const refundAmt = ticket.refundAmount || (ticket.isRefunded ? priceAfterDiscount : 0);
                                          if (refundAmt > 0) {
                                            return (
                                              <div style={{ fontSize: '0.85em' }}>
                                                <div className="text-danger"><strong>रु {refundAmt.toLocaleString()}</strong></div>
                                                {ticket.refundReason && (
                                                  <div className="text-muted" style={{ fontSize: '0.75em' }}>{ticket.refundReason}</div>
                                                )}
                                                {ticket.refundDetails?.refundMethod && (
                                                  <div className="text-muted" style={{ fontSize: '0.75em' }}>({ticket.refundDetails.refundMethod})</div>
                                                )}
                                              </div>
                                            );
                                          }
                                          return <span>रु 0</span>;
                                        })()}
                                      </td>
                                      <td style={{ padding: '4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <small>{ticket.remarks || '—'}</small>
                                      </td>
                                      <td style={{ padding: '4px 3px' }}>
                                        <div className="d-flex gap-1" style={{ flexWrap: 'wrap' }}>
                                          <button
                                            className="btn btn-sm btn-outline-primary"
                                            style={{ minWidth: 22, width: 22, height: 22, padding: 0 }}
                                            onClick={() => { setSelectedTicket(ticket); setShowPrint(true); setAutoPrint(false); }}
                                            title="Preview Ticket"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="#1976d2" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="#1976d2" strokeWidth="1.4"/></svg>
                                          </button>
                                          <button
                                            className="btn btn-sm btn-info"
                                            style={{ minWidth: 22, width: 22, height: 22, padding: 0 }}
                                            onClick={() => openTicketPrintWindow(ticket)}
                                            title="Print Ticket"
                                          >
                                            🖨️
                                          </button>
                                          {!ticket.isRefunded && (user?.role === 'admin' || user?.role === 'staff') && (
                                            <>
                                              <button
                                                className="btn btn-sm btn-warning"
                                                style={{ minWidth: 22, width: 22, height: 22, padding: 0 }}
                                                onClick={() => handlePartialRefund(ticket)}
                                                title="Partial Refund"
                                                disabled={ticket.playerStatus.playedPlayers >= ticket.playerStatus.totalPlayers}
                                              >
                                                💰
                                              </button>

                                              <button
                                                className="btn btn-sm btn-danger"
                                                style={{ minWidth: 22, width: 22, height: 22, padding: 0 }}
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
                                              style={{ minWidth: 22, width: 22, height: 22, padding: 0 }}
                                              onClick={() => handleDelete(ticket._id)}
                                              title="Delete Ticket"
                                            >
                                              🗑️
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </SectionCard>
          </div>
        </div>
      )}
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Tickets;