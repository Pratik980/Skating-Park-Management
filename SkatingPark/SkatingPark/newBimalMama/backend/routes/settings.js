import express from 'express';
import Settings from '../models/Settings.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get settings for branch
// @route   GET /api/settings/:branchId
// @access  Private
router.get('/:branchId', protect, async (req, res) => {
  try {
    const settings = await Settings.findOne({ branch: req.params.branchId })
      .populate('branch', 'branchName location');

    if (!settings) {
      // Create default settings if not exists
      const defaultSettings = await Settings.create({
        companyName: 'बेलका स्केट पार्क एण्ड गेमिङ जोन',
        companyAddress: 'बेलका न.पा.–९ (कुमारी बैंक छेउ) रामपुर',
        contactNumbers: ['9812345678', '9823456789'],
        regNo: '',
        defaultCurrency: 'NPR',
        defaultLanguage: 'en',
        conversionRate: 1.6,
        nepaliDateFormat: '2082-07-24',
        ticketRules: [
          'टिकट एकपटक मात्र मान्य हुन्छ।',
          'टिकट हराएमा पुनः प्राप्त हुँदैन।',
          'नियम उल्लङ्घन गरेमा टिकट रद्द हुनेछ।',
          'खेल्ने बेलामा सुरक्षा नियम पालना गर्नुहोस्।'
        ],
        country: 'Nepal',
        branch: req.params.branchId,
        createdBy: req.user.id
      });

      return res.json({
        success: true,
        settings: defaultSettings
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

// @desc    Update settings
// @route   PUT /api/settings/:branchId
// @access  Private/Admin
router.put('/:branchId', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      companyName,
      companyAddress,
      contactNumbers,
      email,
      panNumber,
      regNo,
      logo,
      defaultCurrency,
      defaultLanguage,
      conversionRate,
      nepaliDateFormat,
      ticketRules,
      country
    } = req.body;

    let settings = await Settings.findOne({ branch: req.params.branchId });

    if (!settings) {
      settings = await Settings.create({
        companyName,
        companyAddress,
        contactNumbers,
        email,
        panNumber,
        regNo,
        logo,
        defaultCurrency,
        defaultLanguage,
        conversionRate,
        nepaliDateFormat,
        ticketRules,
        country,
        branch: req.params.branchId,
        createdBy: req.user.id
      });
    } else {
      settings = await Settings.findOneAndUpdate(
        { branch: req.params.branchId },
        {
          companyName,
          companyAddress,
          contactNumbers,
          email,
          panNumber,
          regNo,
          logo,
          defaultCurrency,
          defaultLanguage,
          conversionRate,
          nepaliDateFormat,
          ticketRules,
          country
        },
        { new: true, runValidators: true }
      ).populate('branch', 'branchName location');
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
});

// @desc    Upload logo
// @route   POST /api/settings/upload-logo
// @access  Private/Admin
router.post('/upload-logo', protect, authorize('admin'), async (req, res) => {
  try {
    // In a real application, you would handle file upload here
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: '/uploads/logo.png' // placeholder
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading logo',
      error: error.message
    });
  }
});

export default router;