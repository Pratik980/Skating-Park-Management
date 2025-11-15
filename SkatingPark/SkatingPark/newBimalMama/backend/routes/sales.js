import express from 'express';
import Sales from '../models/Sales.js';
import { protect, authorize } from '../middleware/auth.js';
import { getCurrentNepaliDate } from '../utils/nepaliDate.js';

const router = express.Router();

// Product-related routes
// @desc    Get all products
// @route   GET /api/sales/products
// @access  Private
router.get('/products', protect, async (req, res) => {
  try {
    const { branch, category, search, page = 1, limit = 50 } = req.query;
    
    let query = { branch: req.user.branch };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Sales.find(query)
      .sort({ productName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sales.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// @desc    Create product
// @route   POST /api/sales/products
// @access  Private (admin, inventory)
router.post('/products', protect, authorize('admin', 'inventory'), async (req, res) => {
  try {
    const {
      productName,
      category,
      size,
      costPrice,
      sellingPrice,
      stockQuantity,
      supplier,
      barcode,
      expiryDate,
      minStockLevel
    } = req.body;

    // Check if product with same name and branch already exists
    const existingProduct = await Sales.findOne({
      productName,
      branch: req.user.branch,
      isProduct: true
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }

    const productData = {
      productName,
      category,
      size,
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      stockQuantity: parseInt(stockQuantity),
      supplier,
      barcode,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      minStockLevel: parseInt(minStockLevel) || 5,
      branch: req.user.branch,
      staff: req.user.id,
      isProduct: true,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      }
    };

    const product = await Sales.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

// @desc    Update product
// @route   PUT /api/sales/products/:id
// @access  Private (admin, inventory)
router.put('/products/:id', protect, authorize('admin', 'inventory'), async (req, res) => {
  try {
    const {
      productName,
      category,
      size,
      costPrice,
      sellingPrice,
      stockQuantity,
      supplier,
      barcode,
      expiryDate,
      minStockLevel
    } = req.body;

    let product = await Sales.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isProduct) {
      return res.status(400).json({
        success: false,
        message: 'Record is not a product'
      });
    }

    const updateData = {
      productName,
      category,
      size,
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      stockQuantity: parseInt(stockQuantity),
      supplier,
      barcode,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      minStockLevel: parseInt(minStockLevel) || 5
    };

    product = await Sales.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/sales/products/:id
// @access  Private/Admin
router.delete('/products/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Sales.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isProduct) {
      return res.status(400).json({
        success: false,
        message: 'Record is not a product'
      });
    }

    await Sales.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
});

// Customer-related routes
// @desc    Get all customers
// @route   GET /api/sales/customers
// @access  Private
router.get('/customers', protect, async (req, res) => {
  try {
    const { branch, type, search, page = 1, limit = 50 } = req.query;
    
    let query = { branch: req.user.branch, isCustomer: true };
    
    if (type && type !== 'all') {
      query.customerType = type;
    }
    
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Sales.find(query)
      .sort({ customerName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sales.countDocuments(query);

    res.json({
      success: true,
      count: customers.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
});

// @desc    Create customer
// @route   POST /api/sales/customers
// @access  Private
router.post('/customers', protect, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      address,
      customerType
    } = req.body;

    // Check if customer with same phone and branch already exists
    const existingCustomer = await Sales.findOne({
      phone,
      branch: req.user.branch,
      isCustomer: true
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const customerData = {
      customerName,
      phone,
      email,
      address,
      customerType: customerType || 'Retail',
      branch: req.user.branch,
      staff: req.user.id,
      isCustomer: true,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      }
    };

    const customer = await Sales.create(customerData);
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
});

// Enhanced Sales routes with inventory management
// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { branch, date, staff, page = 1, limit = 10 } = req.query;

    let branchId = req.user.branch;
    let query = { branch: branchId, isSale: true };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query['date.englishDate'] = {
        $gte: startDate,
        $lt: endDate
      };
    }

    if (staff && staff !== 'all') {
      query.staff = staff;
    }

    const sales = await Sales.find(query)
      .populate('branch', 'branchName location')
      .populate('staff', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sales.countDocuments(query);

    res.json({
      success: true,
      count: sales.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      sales
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales',
      error: error.message
    });
  }
});

// @desc    Create sale with inventory update
// @route   POST /api/sales
// @access  Private (admin, sales staff)
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { customerName, items, paymentMethod, remarks, discount, branch } = req.body;
    
    const saleData = {
      customerName: customerName || '',
      items: items || [],
      paymentMethod: paymentMethod || 'Cash',
      remarks: remarks || '',
      discount: parseFloat(discount) || 0,
      isSale: true,
      branch: branch || req.user.branch,
      staff: req.user.id,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      }
    };

    const sale = await Sales.create(saleData);
    
    // Ensure the sale is saved and all hooks have run
    await sale.save();
    
    // Fetch the complete sale with all computed fields (saleNo, totalAmount, etc.)
    // Use lean(false) to get a Mongoose document, then populate
    const populatedSale = await Sales.findById(sale._id)
      .populate('staff', 'name email')
      .populate('branch', 'branchName location')
      .lean(false);
    
    // Convert to plain object to ensure all fields are included
    const saleObject = populatedSale.toObject();
    
    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      sale: saleObject
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording sale',
      error: error.message
    });
  }
});

// @desc    Delete sale record by ID
// @route   DELETE /api/sales/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale || !sale.isSale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found'
      });
    }
    await Sales.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Sale record deleted successfully'
    });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sale record',
      error: error.message
    });
  }
});

// @desc    Get low stock alerts
// @route   GET /api/sales/alerts/low-stock
// @access  Private
router.get('/alerts/low-stock', protect, async (req, res) => {
  try {
    const lowStockProducts = await Sales.find({
      branch: req.user.branch,
      isProduct: true,
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
    }).sort({ stockQuantity: 1 });

    res.json({
      success: true,
      count: lowStockProducts.length,
      alerts: lowStockProducts
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock alerts',
      error: error.message
    });
  }
});

// @desc    Get sales statistics with product analytics
// @route   GET /api/sales/stats/:branchId
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
      isSale: true,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Basic sales stats
    const totalSales = await Sales.countDocuments(query);
    
    const revenueStats = await Sales.aggregate([
      { $match: query },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalDiscount: { $sum: '$discount' } } }
    ]);
    
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
    const totalDiscount = revenueStats.length > 0 ? revenueStats[0].totalDiscount : 0;

    // Product-wise sales
    const productSales = await Sales.aggregate([
      { $match: query },
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.itemName',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        } 
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Payment method distribution
    const paymentDistribution = await Sales.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Inventory stats
    const inventoryStats = await Sales.aggregate([
      { 
        $match: { 
          branch: branchId, 
          isProduct: true 
        } 
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lte: ['$stockQuantity', '$minStockLevel'] },
                1,
                0
              ]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [
                { $eq: ['$stockQuantity', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalSales,
        totalRevenue,
        totalDiscount,
        productSales,
        paymentDistribution,
        inventoryStats: inventoryStats[0] || {
          totalProducts: 0,
          totalStock: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        },
        period
      }
    });
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: error.message
    });
  }
});

export default router;