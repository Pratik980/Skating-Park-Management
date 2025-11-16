import express from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import { protect, authorize } from '../middleware/auth.js';
import { generateQRCode, generateTicketQRData } from '../utils/qrGenerator.js';
import { getCurrentNepaliDate, getCurrentTime } from '../utils/nepaliDate.js';

const router = express.Router();

// Utility to deactivate tickets that exceed 1hr from creation
const deactivateExpiredTickets = async () => {
  const now = new Date();
  // Find tickets that are active
  const activeTickets = await Ticket.find({
    $or: [
      { status: 'booked' },
      { status: 'playing' }
    ]
  });
  for (const ticket of activeTickets) {
    let expiry;
    if (ticket.extraTimeEntries && ticket.extraTimeEntries.length > 0) {
      // Get the latest extra time entry
      const lastEntry = ticket.extraTimeEntries[ticket.extraTimeEntries.length - 1];
      expiry = new Date(new Date(lastEntry.addedAt).getTime() + lastEntry.minutes * 60000);
    } else {
      // Default: base 1 hour from creation
      expiry = new Date(new Date(ticket.date.englishDate).getTime() + 60 * 60000);
    }
    if (now > expiry) {
      ticket.status = 'deactivated';
      await ticket.save();
    }
  }
};

// Endpoint for manual trigger (or attach to a cron/interval job)
router.post('/deactivate-expired', protect, authorize('admin'), async (req, res) => {
  try {
    await deactivateExpiredTickets();
    res.json({ success: true, message: 'Expired tickets deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { date, staff, page = 1, limit = 100, range, startDate, endDate, isRefunded } = req.query;

    let branchId = req.user.branch;
    let query = { branch: branchId };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    if (range === 'history') {
      // no additional date filter
    } else if (range === 'custom' && startDate && endDate) {
      const customStart = new Date(startDate);
      const customEnd = new Date(endDate);
      customEnd.setDate(customEnd.getDate() + 1);
      query['date.englishDate'] = {
        $gte: customStart,
        $lt: customEnd
      };
    } else if (date) {
      const targetDate = new Date(date);
      const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);
      query['date.englishDate'] = {
        $gte: targetStart,
        $lt: targetEnd
      };
    } else if (isRefunded === 'true' || isRefunded === true) {
      // For refunds, don't filter by date - show all refunded tickets
      // no additional date filter
    } else {
      query['date.englishDate'] = {
        $gte: startOfToday,
        $lt: endOfToday
      };
    }

    // Filter by staff
    if (staff && staff !== 'all') {
      query.staff = staff;
    }

    // Filter by refund status
    if (isRefunded === 'true' || isRefunded === true) {
      query.isRefunded = true;
    } else if (isRefunded === 'false' || isRefunded === false) {
      query.isRefunded = false;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 100, 500);

    const tickets = await Ticket.find(query)
      .populate('branch', 'branchName location')
      .populate('staff', 'name email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      count: tickets.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
      error: error.message
    });
  }
});

// @desc    Get extra time report
// @route   GET /api/tickets/extra-time/report
// @access  Private
router.get('/extra-time/report', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const branchId = req.user.branch;

    const matchStage = {
      branch: branchId,
      extraTimeEntries: { $exists: true, $ne: [] }
    };

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$extraTimeEntries' }
    ];

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      pipeline.push({
        $match: {
          'extraTimeEntries.addedAt': {
            $gte: start,
            $lte: end
          }
        }
      });
    }

    pipeline.push({
      $project: {
        _id: '$_id',
        ticketNo: 1,
        name: 1,
        ticketType: 1,
        branch: 1,
        staff: 1,
        minutes: '$extraTimeEntries.minutes',
        label: '$extraTimeEntries.label',
        notes: '$extraTimeEntries.notes',
        addedAt: '$extraTimeEntries.addedAt',
        addedBy: '$extraTimeEntries.addedBy',
        totalExtraMinutes: '$totalExtraMinutes',
        time: '$time',
        date: '$date',
        isRefunded: '$isRefunded'
      }
    });

    pipeline.push({ $sort: { addedAt: -1 } });

    const entries = await Ticket.aggregate(pipeline);

    res.json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('Extra time report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching extra time report',
      error: error.message
    });
  }
});

// @desc    Get ticket by ticket number or contact number
// @route   GET /api/tickets/lookup/:ticketNo
// @access  Private
router.get('/lookup/:ticketNo', protect, async (req, res) => {
  try {
    const identifier = req.params.ticketNo;
    const branchMatch = { branch: req.user.branch };

    // First try to find by ticket number
    let ticket = await Ticket.findOne({
      ...branchMatch,
      ticketNo: identifier
    })
      .populate('branch', 'branchName location contactNumber')
      .populate('staff', 'name email');

    // If not found and identifier is a valid ObjectId, try by _id
    if (!ticket && mongoose.Types.ObjectId.isValid(identifier)) {
      ticket = await Ticket.findOne({
        ...branchMatch,
        _id: identifier
      })
        .populate('branch', 'branchName location contactNumber')
        .populate('staff', 'name email');
    }

    // If still not found, try searching by contact number (get the most recent ticket)
    if (!ticket) {
      ticket = await Ticket.findOne({
        ...branchMatch,
        contactNumber: identifier
      })
        .sort({ createdAt: -1 }) // Get the most recent ticket with this contact number
        .populate('branch', 'branchName location contactNumber')
        .populate('staff', 'name email');
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Lookup ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket details',
      error: error.message
    });
  }
});

// @desc    Add extra time entry to ticket
// @route   POST /api/tickets/:ticketId/extra-time
// @access  Private (admin, staff)
router.post('/:ticketId/extra-time', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { minutes, label, notes, amount } = req.body;
    const minutesValue = Number(minutes);
    const amountValue = Number(amount) || 0;

    if (!minutesValue || minutesValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide minutes greater than zero'
      });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.ticketId,
      branch: req.user.branch
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.extraTimeEntries = ticket.extraTimeEntries || [];
    ticket.extraTimeEntries.push({
      minutes: minutesValue,
      amount: amountValue,
      label: label || `${minutesValue} minutes`,
      notes: notes || '',
      addedBy: req.user.id
    });
    ticket.totalExtraMinutes = (ticket.totalExtraMinutes || 0) + minutesValue;
    if (amountValue > 0) {
      ticket.fee = (ticket.fee || 0) + amountValue;
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Extra time added successfully',
      ticket
    });
  } catch (error) {
    console.error('Add extra time error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding extra time',
      error: error.message
    });
  }
});

// @desc    Get extra time entries for ticket
// @route   GET /api/tickets/:ticketId/extra-time
// @access  Private
router.get('/:ticketId/extra-time', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.ticketId,
      branch: req.user.branch
    }).populate('extraTimeEntries.addedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      totalExtraMinutes: ticket.totalExtraMinutes || 0,
      entries: ticket.extraTimeEntries || []
    });
  } catch (error) {
    console.error('Get extra time entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching extra time entries',
      error: error.message
    });
  }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('branch', 'branchName location contactNumber')
      .populate('staff', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket',
      error: error.message
    });
  }
});

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private (admin, ticket staff)
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { 
      name, 
      playerNames, 
      ticketType, 
      fee, 
      remarks, 
      branch,
      numberOfPeople,
      groupInfo 
    } = req.body;

    // Parse player names
    const parsedPlayerNames = playerNames 
      ? playerNames.split(',').map(name => name.trim()).filter(name => name.length > 0)
      : [name.trim()];

    const requestedPeople = Number(numberOfPeople);
    const totalPlayers = requestedPeople > 0 
      ? requestedPeople 
      : (parsedPlayerNames.length || 1);

    const perPersonFee = parseFloat(fee) || 100;
    const totalFee = perPersonFee * totalPlayers;

    const ticketData = {
      name: name.trim(),
      playerNames: parsedPlayerNames,
      ticketType: ticketType || 'Adult',
      fee: totalFee,
      perPersonFee,
      remarks: remarks || '',
      branch: branch || req.user.branch,
      staff: req.user.id,
      numberOfPeople: totalPlayers,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      },
      time: getCurrentTime(),
      playerStatus: {
        totalPlayers: totalPlayers,
        playedPlayers: 0,
        waitingPlayers: totalPlayers,
        refundedPlayersCount: 0
      }
    };

    if (groupInfo && (groupInfo.groupName || groupInfo.groupNumber || groupInfo.groupPrice)) {
      ticketData.groupInfo = {
        groupName: groupInfo.groupName || '',
        groupNumber: groupInfo.groupNumber || '',
        groupPrice: Number(groupInfo.groupPrice) || 0,
        totalMembers: groupInfo.totalMembers || totalPlayers
      };
    }

    // Retry logic for duplicate key errors
    let ticket;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        ticket = await Ticket.create(ticketData);
        break; // Success, exit retry loop
      } catch (error) {
        // Check if it's a duplicate key error
        if (error.code === 11000 && error.keyPattern) {
          retries++;
          // Detect which field failed
          const duplicateField = Object.keys(error.keyPattern)[0];
          // Remove the field to force regeneration
          delete ticketData[duplicateField];
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        } else {
          // Not a duplicate key error, throw it
          throw error;
        }
      }
    }

    // Generate QR code
    const qrData = generateTicketQRData(ticket);
    const qrCode = await generateQRCode(qrData);
    
    ticket.qrCode = qrCode;
    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('branch', 'branchName location contactNumber')
      .populate('staff', 'name email');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ticket',
      error: error.message
    });
  }
});

// @desc    Quick create ticket
// @route   POST /api/tickets/quick
// @access  Private (admin, ticket staff)
router.post('/quick', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { name, playerNames, contactNumber, ticketType, fee, discount, remarks, numberOfPeople, groupInfo } = req.body;

    if (!name && !playerNames) {
      return res.status(400).json({
        success: false,
        message: 'Please enter customer name or player names'
      });
    }

    // Parse player names
    const parsedPlayerNames = playerNames 
      ? playerNames.split(',').map(name => name.trim()).filter(name => name.length > 0)
      : [name.trim()];

    const requestedPeople = Number(numberOfPeople);
    // Ensure totalPlayers is always at least 1
    let totalPlayers = requestedPeople > 0 
      ? requestedPeople 
      : (parsedPlayerNames.length || 1);
    // Safety check: ensure totalPlayers is never 0
    if (totalPlayers <= 0) {
      totalPlayers = 1;
    }
    const customerName = name.trim() || (parsedPlayerNames.length > 0 ? parsedPlayerNames[0] : 'Customer');

    // Parse per person fee - must be a valid positive number
    const perPersonFeeQuick = parseFloat(fee);
    if (isNaN(perPersonFeeQuick) || perPersonFeeQuick <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid per person fee. Please provide a valid positive number.'
      });
    }
    
    // Handle discount: convert to number, ensure it's not NaN, and is >= 0
    let discountAmount = 0;
    if (discount !== undefined && discount !== null && discount !== '') {
      const parsedDiscount = parseFloat(discount);
      if (!isNaN(parsedDiscount) && parsedDiscount >= 0) {
        discountAmount = parsedDiscount;
      }
    }
    
    // Calculate subtotal (before discount): per person fee × number of people
    const subtotal = perPersonFeeQuick * totalPlayers;
    // Calculate final fee (after discount): subtotal - discount
    const totalFeeQuick = Math.max(0, subtotal - discountAmount);
    
    // Debug logging (can be removed in production)
    console.log('Ticket Fee Calculation:', {
      receivedFee: fee,
      receivedDiscount: discount,
      receivedNumberOfPeople: numberOfPeople,
      perPersonFee: perPersonFeeQuick,
      numberOfPeople: totalPlayers,
      subtotal,
      discount: discountAmount,
      finalFee: totalFeeQuick
    });
    
    // Validation: ensure final fee is not 0 when it shouldn't be
    if (totalFeeQuick <= 0 && subtotal > 0) {
      console.warn('Warning: Final fee is 0 but subtotal is positive. This might indicate discount >= subtotal.');
    }

    // Final validation: ensure fee is not 0 when it shouldn't be
    if (totalFeeQuick <= 0 && subtotal > discountAmount) {
      console.error('ERROR: Calculated fee is 0 but should be positive!', {
        perPersonFee: perPersonFeeQuick,
        numberOfPeople: totalPlayers,
        subtotal,
        discount: discountAmount,
        calculatedFee: totalFeeQuick
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid fee calculation. Please check your inputs.'
      });
    }

    const ticketData = {
      name: customerName,
      contactNumber: contactNumber ? contactNumber.trim() : undefined,
      playerNames: parsedPlayerNames,
      ticketType: ticketType || 'Adult',
      fee: totalFeeQuick,
      discount: discountAmount,
      perPersonFee: perPersonFeeQuick,
      remarks: remarks || '',
      branch: req.user.branch,
      staff: req.user.id,
      numberOfPeople: totalPlayers,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      },
      time: getCurrentTime(),
      playerStatus: {
        totalPlayers: totalPlayers,
        playedPlayers: 0,
        waitingPlayers: totalPlayers,
        refundedPlayersCount: 0
      }
    };

    if (groupInfo && (groupInfo.groupName || groupInfo.groupNumber || groupInfo.groupPrice)) {
      ticketData.groupInfo = {
        groupName: groupInfo.groupName || '',
        groupNumber: groupInfo.groupNumber || '',
        groupPrice: Number(groupInfo.groupPrice) || 0,
        totalMembers: groupInfo.totalMembers || totalPlayers
      };
    }

    // Log ticket data before creation
    console.log('Ticket Data Before Creation:', {
      fee: ticketData.fee,
      discount: ticketData.discount,
      perPersonFee: ticketData.perPersonFee,
      numberOfPeople: ticketData.numberOfPeople
    });

    // Retry logic for duplicate key errors
    let ticket;
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        ticket = await Ticket.create(ticketData);
        break; // Success, exit retry loop
      } catch (error) {
        // Check if it's a duplicate key error
        if (error.code === 11000 && error.keyPattern) {
          retries++;
          // Detect which field failed
          const duplicateField = Object.keys(error.keyPattern)[0];
          
          // If it's ticketNo and we've retried, use timestamp-based fallback
          if (duplicateField === 'ticketNo' && retries >= 2) {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const timestamp = Date.now().toString().slice(-8);
            ticketData.ticketNo = `${dateStr}-${timestamp}`;
          } else {
            // Remove the field to force regeneration in pre-save hook
            delete ticketData[duplicateField];
          }
          
          if (retries < maxRetries) {
            // Increase delay with each retry
            await new Promise(resolve => setTimeout(resolve, 50 * retries));
          }
        } else {
          // Not a duplicate key error, throw it
          throw error;
        }
      }
    }

    if (!ticket) {
      // Final fallback: use timestamp-based ticket number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now().toString().slice(-8);
      ticketData.ticketNo = `${dateStr}-${timestamp}`;
      ticket = await Ticket.create(ticketData);
    }

    // Log ticket after creation
    console.log('Ticket After Creation:', {
      fee: ticket.fee,
      discount: ticket.discount,
      perPersonFee: ticket.perPersonFee,
      numberOfPeople: ticket.numberOfPeople
    });

    // Generate QR code
    const qrData = generateTicketQRData(ticket);
    const qrCode = await generateQRCode(qrData);
    
    ticket.qrCode = qrCode;
    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('branch', 'branchName location contactNumber')
      .populate('staff', 'name email');

    // Log populated ticket before sending
    console.log('Populated Ticket Before Response:', {
      fee: populatedTicket.fee,
      discount: populatedTicket.discount,
      perPersonFee: populatedTicket.perPersonFee,
      numberOfPeople: populatedTicket.numberOfPeople
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Quick create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ticket',
      error: error.message
    });
  }
});

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private (admin, ticket staff)
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { name, playerNames, ticketType, fee, remarks, playerStatus } = req.body;

    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user has permission to update this ticket
    if (req.user.role !== 'admin' && ticket.staff.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ticket'
      });
    }

    const updateData = { 
      name, 
      playerNames, 
      ticketType, 
      fee: parseFloat(fee), 
      remarks 
    };

    if (playerStatus) {
      updateData.playerStatus = playerStatus;
    }

    ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('branch', 'branchName location contactNumber')
     .populate('staff', 'name email');

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket',
      error: error.message
    });
  }
});

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Validate ObjectId format
    if (!ticketId || ticketId === 'undefined' || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await Ticket.findByIdAndDelete(ticketId);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ticket',
      error: error.message
    });
  }
});

// @desc    Refund ticket
// @route   PUT /api/tickets/:id/refund
// @access  Private (admin, ticket staff)
router.put('/:id/refund', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { 
      refundReason, 
      refundAmount, 
      refundedPlayers,
      refundName,
      refundMethod,
      paymentReference,
      groupInfo 
    } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.isRefunded) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already refunded'
      });
    }

    ticket.isRefunded = true;
    ticket.refundReason = refundReason;
    ticket.refundAmount = refundAmount || ticket.fee || 0;
    ticket.refundedPlayers = refundedPlayers || [];
    ticket.refundDetails = {
      refundName: refundName || ticket.name,
      refundMethod: refundMethod || 'cash',
      refundedBy: req.user.id,
      paymentReference: paymentReference || ''
    };
    
    if (refundedPlayers && refundedPlayers.length > 0) {
      ticket.playerStatus.refundedPlayersCount = refundedPlayers.length;
      ticket.playerStatus.waitingPlayers = Math.max(0, ticket.playerStatus.waitingPlayers - refundedPlayers.length);
    } else {
      ticket.playerStatus.refundedPlayersCount = ticket.playerStatus.totalPlayers;
      ticket.playerStatus.waitingPlayers = 0;
    }

    if (groupInfo && (groupInfo.groupName || groupInfo.groupNumber || groupInfo.groupPrice)) {
      ticket.groupInfo = {
        ...ticket.groupInfo,
        groupName: groupInfo.groupName || ticket.groupInfo?.groupName,
        groupNumber: groupInfo.groupNumber || ticket.groupInfo?.groupNumber,
        groupPrice: groupInfo.groupPrice !== undefined ? Number(groupInfo.groupPrice) : (ticket.groupInfo?.groupPrice || 0),
        totalMembers: groupInfo.totalMembers || ticket.groupInfo?.totalMembers || ticket.numberOfPeople
      };
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket refunded successfully',
      ticket
    });
  } catch (error) {
    console.error('Refund ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refunding ticket',
      error: error.message
    });
  }
});

// @desc    Partial refund for players
// @route   PUT /api/tickets/:id/partial-refund
// @access  Private (admin, ticket staff)
router.put('/:id/partial-refund', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { refundReason, refundedPlayers, refundAmount } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const playerFee = ticket.fee / ticket.playerStatus.totalPlayers;
    const calculatedRefundAmount = refundAmount || (refundedPlayers.length * playerFee);

    ticket.refundedPlayers = [...(ticket.refundedPlayers || []), ...refundedPlayers];
    ticket.refundAmount = (ticket.refundAmount || 0) + calculatedRefundAmount;
    ticket.playerStatus.refundedPlayersCount = ticket.refundedPlayers.length;
    ticket.playerStatus.waitingPlayers = Math.max(0, ticket.playerStatus.waitingPlayers - refundedPlayers.length);

    if (ticket.playerStatus.refundedPlayersCount === ticket.playerStatus.totalPlayers) {
      ticket.isRefunded = true;
      ticket.refundReason = refundReason;
    }

    await ticket.save();

    res.json({
      success: true,
      message: `Partial refund processed for ${refundedPlayers.length} player(s)`,
      ticket
    });
  } catch (error) {
    console.error('Partial refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing partial refund',
      error: error.message
    });
  }
});

// @desc    Update player status
// @route   PUT /api/tickets/:id/player-status
// @access  Private (admin, ticket staff)
router.put('/:id/player-status', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { playedPlayers, waitingPlayers, status } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (playedPlayers !== undefined) {
      ticket.playerStatus.playedPlayers = playedPlayers;
      ticket.playerStatus.waitingPlayers = ticket.playerStatus.totalPlayers - playedPlayers - ticket.playerStatus.refundedPlayersCount;
    }

    if (waitingPlayers !== undefined) {
      ticket.playerStatus.waitingPlayers = waitingPlayers;
    }

    if (status) {
      ticket.status = status;
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Player status updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update player status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating player status',
      error: error.message
    });
  }
});

// @desc    Mark ticket as printed
// @route   PUT /api/tickets/:id/print
// @access  Private (admin, ticket staff)
router.put('/:id/print', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.printed = true;
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket marked as printed',
      ticket
    });
  } catch (error) {
    console.error('Print ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating print status',
      error: error.message
    });
  }
});

// @desc    Get ticket statistics
// @route   GET /api/tickets/stats/:branchId
// @access  Private
router.get('/stats/:branchId', protect, async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const branchId = req.params.branchId;
    
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    const query = {
      branch: branchId,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    };

    const totalTickets = await Ticket.countDocuments(query);
    const totalRevenue = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Ticket type distribution
    const typeDistribution = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$ticketType', count: { $sum: 1 } } }
    ]);

    // Player statistics
    const playerStats = await Ticket.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: null,
          totalPlayers: { $sum: '$playerStatus.totalPlayers' },
          playedPlayers: { $sum: '$playerStatus.playedPlayers' },
          waitingPlayers: { $sum: '$playerStatus.waitingPlayers' },
          refundedPlayers: { $sum: '$playerStatus.refundedPlayersCount' }
        } 
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalTickets,
        totalRevenue: revenue,
        typeDistribution,
        playerStats: playerStats.length > 0 ? playerStats[0] : {
          totalPlayers: 0,
          playedPlayers: 0,
          waitingPlayers: 0,
          refundedPlayers: 0
        },
        period
      }
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket statistics',
      error: error.message
    });
  }
});

export default router;