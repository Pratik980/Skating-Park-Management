const express = require('express');
const Ticket = require('../models/Ticket');
const { auth } = require('../middleware/auth');
const { parseQRCode } = require('../utils/qrGenerator');
const router = express.Router();

// Scan QR code
router.post('/scan', auth, async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    const parsedData = parseQRCode(qrData);
    
    const ticket = await Ticket.findOne({
      ticketId: parsedData.ticketId,
      branchId: parsedData.branchId
    }).populate('createdBy', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if ticket is active
    if (ticket.status !== 'active') {
      return res.status(400).json({ 
        message: `Ticket is ${ticket.status}`,
        ticket 
      });
    }

    const now = new Date();
    const remainingTime = Math.max(0, Math.floor((ticket.exitTime - now) / 60000));
    
    // Update ticket with scan info
    ticket.remainingTime = remainingTime;
    ticket.scans.push({
      scannedBy: req.user._id,
      scannedAt: now,
      remainingTime
    });

    await ticket.save();

    // Emit scan event
    req.io.to(req.user.branchId).emit('qr-scanned', {
      ticketId: ticket.ticketId,
      names: ticket.names,
      remainingTime,
      scannedBy: req.user.name,
      isExpired: remainingTime <= 0
    });

    res.json({
      ticket: {
        ...ticket.toObject(),
        createdBy: ticket.createdBy
      },
      remainingTime,
      isExpired: remainingTime <= 0,
      message: remainingTime <= 0 ? 'Time has expired' : `Time remaining: ${remainingTime} minutes`
    });
  } catch (error) {
    if (error.message === 'Invalid QR code data') {
      return res.status(400).json({ message: 'Invalid QR code' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get QR scan history
router.get('/history', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { branchId: req.user.branchId, 'scans.0': { $exists: true } };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query)
      .select('ticketId names type scans date')
      .populate('scans.scannedBy', 'name')
      .sort({ 'scans.scannedAt': -1 })
      .limit(50);

    const scanHistory = tickets.flatMap(ticket => 
      ticket.scans.map(scan => ({
        ticketId: ticket.ticketId,
        names: ticket.names,
        type: ticket.type,
        date: ticket.date,
        scannedBy: scan.scannedBy.name,
        scannedAt: scan.scannedAt,
        remainingTime: scan.remainingTime
      }))
    ).sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));

    res.json(scanHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;