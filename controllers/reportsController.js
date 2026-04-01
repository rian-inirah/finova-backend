// controllers/reportsController.js
const db = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment = require('moment');

// --------------------
// GET /reports/orders
// --------------------
const getOrderReports = async (req, res) => {
  try {
    const { fromDate, toDate, paymentType, page = 1, limit = 50 } = req.query;
    const from = fromDate ? moment(fromDate).startOf('day') : moment().startOf('day');
    const to = toDate ? moment(toDate).endOf('day') : moment().endOf('day');

    const whereClause = {
      userId: req.user.id,
      status: 'completed',
      createdAt: { [Op.between]: [from.toDate(), to.toDate()] }
    };
    if (paymentType && paymentType !== 'all') whereClause.paymentMethod = paymentType;

    const offset = (page - 1) * limit;

    const orders = await db.Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.OrderItem,
          as: 'orderItems',
          include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const summary = await db.Order.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalOrders'],
        [Sequelize.fn('SUM', Sequelize.col('grandTotal')), 'totalAmount'],
        [Sequelize.fn('SUM', Sequelize.col('gstAmount')), 'totalGST'],
        [Sequelize.fn('SUM', Sequelize.col('subtotal')), 'totalSubtotal']
      ],
      raw: true
    });

    const paymentBreakdown = await db.Order.findAll({
      where: whereClause,
      attributes: [
        'paymentMethod',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('grandTotal')), 'amount']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    res.json({
      orders: orders.rows,
      pagination: {
        totalCount: orders.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(orders.count / limit),
        hasNext: offset + parseInt(limit) < orders.count,
        hasPrev: page > 1
      },
      summary: summary[0] || { totalOrders: 0, totalAmount: 0, totalGST: 0, totalSubtotal: 0 },
      paymentBreakdown,
      dateRange: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }
    });
  } catch (error) {
    console.error('Get order reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --------------------
// GET /reports/items
// --------------------
const getItemReports = async (req, res) => {
  try {
    const { fromDate, toDate, itemId, page = 1, limit = 50 } = req.query;
    const from = fromDate ? moment(fromDate).startOf('day') : moment().startOf('day');
    const to = toDate ? moment(toDate).endOf('day') : moment().endOf('day');

    // Fetch grouped item reports
    const itemReports = await db.OrderItem.findAll({
      attributes: [
        'itemId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalAmount'],
        [Sequelize.fn('AVG', Sequelize.col('unitPrice')), 'averagePrice'],
        [Sequelize.fn('COUNT', Sequelize.col('orderId')), 'orderCount']
      ],
      include: [
        {
          model: db.Item,
          as: 'item',
          attributes: ['id', 'name'],
          where: itemId ? { id: itemId } : undefined
        },
        {
          model: db.Order,
          as: 'order',
          attributes: [],
          where: {
            userId: req.user.id,
            status: 'completed',
            createdAt: { [Op.between]: [from.toDate(), to.toDate()] }
          }
        }
      ],
      group: ['itemId', 'item.id', 'item.name'],
      order: [[Sequelize.literal('totalQuantity'), 'DESC']],
      raw: false
    });

    // Manual pagination
    const totalCount = itemReports.length;
    const offset = (page - 1) * limit;
    const paginatedReports = itemReports.slice(offset, offset + limit);

    // Format data for response
    const formattedReports = paginatedReports.map(row => ({
      itemId: row.item.id,
      itemName: row.item.name,
      totalQuantity: parseInt(row.getDataValue('totalQuantity')) || 0,
      totalAmount: parseFloat(row.getDataValue('totalAmount')) || 0,
      averagePrice: parseFloat(row.getDataValue('averagePrice')) || 0,
      orderCount: parseInt(row.getDataValue('orderCount')) || 0
    }));

    const totalQuantity = formattedReports.reduce((sum, i) => sum + i.totalQuantity, 0);
    const totalAmount = formattedReports.reduce((sum, i) => sum + i.totalAmount, 0);

    res.json({
      itemReports: formattedReports,
      summary: { totalItems: formattedReports.length, totalQuantity, totalAmount },
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + parseInt(limit) < totalCount,
        hasPrev: page > 1
      },
      dateRange: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }
    });
  } catch (error) {
    console.error('Get item reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --------------------
// GET /reports/daily
// --------------------
const getDailyReports = async (req, res) => {
  try {
    const { fromDate, toDate, groupBy = 'day' } = req.query;
    const from = fromDate ? moment(fromDate) : moment().subtract(30, 'days');
    const to = toDate ? moment(toDate) : moment();

    const whereClause = {
      userId: req.user.id,
      status: 'completed',
      createdAt: { [Op.between]: [from.startOf('day').toDate(), to.endOf('day').toDate()] }
    };

    const dateFormat = groupBy === 'week' ? '%Y-%u' :
                       groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const dailyReports = await db.Order.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orderCount'],
        [Sequelize.fn('SUM', Sequelize.col('grandTotal')), 'totalAmount'],
        [Sequelize.fn('SUM', Sequelize.col('subtotal')), 'subtotal'],
        [Sequelize.fn('SUM', Sequelize.col('gstAmount')), 'gstAmount'],
        [Sequelize.fn('AVG', Sequelize.col('grandTotal')), 'averageOrderValue']
      ],
      group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat)],
      order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'ASC']],
      raw: true
    });

    res.json({
      dailyReports,
      dateRange: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') },
      groupBy
    });

  } catch (error) {
    console.error('Get daily reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --------------------
// GET /reports/top-items
// --------------------
const getTopSellingItems = async (req, res) => {
  try {
    const { fromDate, toDate, limit = 10 } = req.query;
    const from = fromDate ? moment(fromDate).startOf('day') : moment().subtract(30, 'days').startOf('day');
    const to = toDate ? moment(toDate).endOf('day') : moment().endOf('day');

    const topItems = await db.OrderItem.findAll({
      attributes: [
        'itemId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalAmount']
      ],
      include: [
        { model: db.Item, as: 'item', attributes: ['id', 'name'] },
        { model: db.Order, as: 'order', attributes: [], where: { 
          userId: req.user.id,
          status: 'completed',
          createdAt: { [Op.between]: [from.toDate(), to.toDate()] }
        } }
      ],
      group: ['itemId', 'item.id', 'item.name'],
      order: [[Sequelize.literal('totalQuantity'), 'DESC']],
      limit: parseInt(limit),
      raw: false,
      subQuery: false
    });

    const formattedTopItems = topItems.map(row => ({
      itemId: row.item.id,
      itemName: row.item.name,
      totalQuantity: parseInt(row.getDataValue('totalQuantity')) || 0,
      totalAmount: parseFloat(row.getDataValue('totalAmount')) || 0
    }));

    res.json({
      topItems: formattedTopItems,
      dateRange: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }
    });

  } catch (error) {
    console.error('Get top selling items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getOrderReports,
  getItemReports,
  getDailyReports,
  getTopSellingItems
};
