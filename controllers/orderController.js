// server/controllers/orderController.js
const { body, validationResult } = require('express-validator');
const db = require('../models');
const { generateOrderNumber } = require('../utils/orderNumberGenerator');

// ----------------------------
// Validation middleware (exported)
const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isInt({ min: 1 }).withMessage('Invalid item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customerPhone').optional().isMobilePhone().withMessage('Invalid phone number format'),
  body('paymentMethod').optional().isIn(['cash', 'online']).withMessage('Payment method must be either cash or online'),
  body('status').optional().isIn(['draft', 'completed']).withMessage('Status must be either draft or completed'),
  body('psgMarked').optional().isBoolean().withMessage('PSG marked must be a boolean')
];

// ----------------------------
// Helpers
const fetchItemsMap = async (itemIds, userId) => {
  const userItems = await db.Item.findAll({
    where: { id: itemIds, userId, isActive: true },
    attributes: ['id', 'name', 'price']
  });

  const itemMap = {};
  userItems.forEach(item => {
    // Use string keys to avoid subtle mismatches
    itemMap[String(item.id)] = { ...item.get(), price: parseFloat(item.price) };
  });

  return { itemMap, userItems };
};

// ----------------------------
// Create Order
const createOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { items, customerPhone, paymentMethod, status = 'draft', psgMarked = false } = req.body;

    if (status === 'completed' && !paymentMethod) {
      await t.rollback();
      return res.status(400).json({ error: 'Payment method is required for completed orders' });
    }

    const itemIds = items.map(i => Number(i.itemId));
    const { itemMap, userItems } = await fetchItemsMap(itemIds, req.user.id);

    if (userItems.length !== itemIds.length) {
      await t.rollback();
      return res.status(400).json({ error: 'One or more items not found or inactive' });
    }

    // Totals
    let subtotal = 0;
    const orderItems = items.map(i => {
      const key = String(i.itemId);
      const dbItem = itemMap[key];
      const quantity = Number(i.quantity);
      const unitPrice = Number(dbItem.price);
      const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));
      subtotal += totalPrice;
      return { itemId: Number(i.itemId), quantity, unitPrice, totalPrice };
    });
    subtotal = parseFloat(subtotal.toFixed(2));

    // GST lookup and calculation (defensive)
    const businessDetails = await db.BusinessDetails.findOne({ where: { userId: req.user.id } });
    let gstRate = 0;
    if (businessDetails) {
      // allow either gstPercentage (number) or gstSlab (string/number)
      if (businessDetails.gstPercentage) gstRate = Number(businessDetails.gstPercentage);
      else if (businessDetails.gstSlab) gstRate = Number(businessDetails.gstSlab);
    }
    gstRate = Number.isFinite(gstRate) ? gstRate : 0;

    let gstAmount = 0, cgst = 0, sgst = 0, grandTotal = subtotal;
    if (gstRate > 0) {
      gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
      cgst = parseFloat((gstAmount / 2).toFixed(2));
      sgst = parseFloat((gstAmount / 2).toFixed(2));
      grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    }

    // Order number (ensure generator exists)
    const orderNumber = (typeof generateOrderNumber === 'function')
      ? await generateOrderNumber()
      : `ORD-${Date.now()}`;

    // Save order
    const order = await db.Order.create({
      userId: req.user.id,
      orderNumber,
      customerPhone: customerPhone || null,
      status,
      paymentMethod: paymentMethod || null,
      subtotal,
      gstAmount,
      cgst,
      sgst,
      grandTotal,
      psgMarked,
      printed: false
    }, { transaction: t });

    // Save items (OrderItem model)
    const orderItemsWithOrderId = orderItems.map(oi => ({ ...oi, orderId: order.id }));
    await db.OrderItem.bulkCreate(orderItemsWithOrderId, { transaction: t });

    await t.commit();

    // Fetch full order with items
    const completeOrder = await db.Order.findByPk(order.id, {
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }]
    });

    return res.status(201).json({ success: true, message: 'Order created successfully', order: completeOrder });
  } catch (error) {
    await t.rollback();
    console.error('Create order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// Update Order
const updateOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { id } = req.params;
    const { items, customerPhone, paymentMethod, status, psgMarked } = req.body;

    const order = await db.Order.findOne({ where: { id, userId: req.user.id } });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    if (status === 'completed' && !paymentMethod) {
      await t.rollback();
      return res.status(400).json({ error: 'Payment method is required for completed orders' });
    }

    let subtotal = order.subtotal || 0;
    let gstAmount = order.gstAmount || 0;
    let cgst = order.cgst || 0;
    let sgst = order.sgst || 0;
    let grandTotal = order.grandTotal || subtotal;

    if (items && items.length > 0) {
      // Recalculate totals
      subtotal = 0;
      const itemIds = items.map(i => Number(i.itemId));
      const { itemMap, userItems } = await fetchItemsMap(itemIds, req.user.id);

      if (userItems.length !== itemIds.length) {
        await t.rollback();
        return res.status(400).json({ error: 'One or more items not found or inactive' });
      }

      const orderItems = items.map(i => {
        const key = String(i.itemId);
        const dbItem = itemMap[key];
        const quantity = Number(i.quantity);
        const unitPrice = Number(dbItem.price);
        const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));
        subtotal += totalPrice;
        return { itemId: Number(i.itemId), quantity, unitPrice, totalPrice };
      });
      subtotal = parseFloat(subtotal.toFixed(2));

      // Recalculate GST
      const businessDetails = await db.BusinessDetails.findOne({ where: { userId: req.user.id } });
      let gstRate = 0;
      if (businessDetails) {
        if (businessDetails.gstPercentage) gstRate = Number(businessDetails.gstPercentage);
        else if (businessDetails.gstSlab) gstRate = Number(businessDetails.gstSlab);
      }
      gstRate = Number.isFinite(gstRate) ? gstRate : 0;

      if (gstRate > 0) {
        gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
        cgst = parseFloat((gstAmount / 2).toFixed(2));
        sgst = parseFloat((gstAmount / 2).toFixed(2));
      } else {
        gstAmount = cgst = sgst = 0;
      }
      grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

      // Persist recalculated totals and items
      await order.update({ subtotal, gstAmount, cgst, sgst, grandTotal }, { transaction: t });

      await db.OrderItem.destroy({ where: { orderId: order.id }, transaction: t });
      const orderItemsWithOrderId = orderItems.map(oi => ({ ...oi, orderId: order.id }));
      await db.OrderItem.bulkCreate(orderItemsWithOrderId, { transaction: t });
    }

    const updateData = {};
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (status !== undefined) updateData.status = status;
    if (psgMarked !== undefined) updateData.psgMarked = psgMarked;
    if (Object.keys(updateData).length > 0) await order.update(updateData, { transaction: t });

    await t.commit();

    const updatedOrder = await db.Order.findByPk(order.id, {
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }]
    });

    return res.json({ success: true, message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    await t.rollback();
    console.error('Update order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// Delete draft order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.Order.findOne({ where: { id, userId: req.user.id, status: 'draft' } });
    if (!order) return res.status(404).json({ error: 'Order not found or cannot be deleted' });

    await db.OrderItem.destroy({ where: { orderId: order.id } });
    await order.destroy();

    return res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// Mark printed
const markOrderPrinted = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.Order.findOne({ where: { id, userId: req.user.id, status: 'completed' } });
    if (!order) return res.status(404).json({ error: 'Completed order not found' });

    await order.update({ printed: true, printedAt: new Date() });
    return res.json({ success: true, message: 'Order marked as printed successfully' });
  } catch (error) {
    console.error('Mark order printed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// Get orders (paginated)
const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };
    if (status) whereClause.status = status;

    const orders = await db.Order.findAndCountAll({
      where: whereClause,
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    return res.json({
      success: true,
      orders: orders.rows,
      totalCount: orders.count,
      currentPage: Number(page),
      totalPages: Math.ceil(orders.count / limit)
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.Order.findOne({
      where: { id, userId: req.user.id },
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }]
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    return res.json({ success: true, order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createOrder,
  updateOrder,
  deleteOrder,
  markOrderPrinted,
  getOrders,
  getOrderById,
  orderValidation
};
