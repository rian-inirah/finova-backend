const db = require('../models');
const moment = require('moment');

const generateOrderNumber = async () => {
  const today = moment().format('YYYYMMDD');
  const prefix = `FN-${today}-`;
  
  try {
    const lastOrder = await db.Order.findOne({
      where: {
        orderNumber: {
          [db.Sequelize.Op.like]: `${prefix}%`
        }
      },
      order: [['orderNumber', 'DESC']],
      attributes: ['orderNumber']
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
};

module.exports = { generateOrderNumber };
