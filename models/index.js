const { Sequelize, DataTypes } = require('sequelize');

// Use DATABASE_URL in production (Render)
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize('your_db', 'your_user', 'your_password', {
      host: 'localhost',
      dialect: 'postgres',
    });

// Initialize DB object
const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Import models
db.User = require('./User')(sequelize, DataTypes);
db.BusinessDetails = require('./BusinessDetails')(sequelize, DataTypes);
db.Item = require('./Item')(sequelize, DataTypes);
db.Order = require('./Order')(sequelize, DataTypes);
db.OrderItem = require('./OrderItem')(sequelize, DataTypes);

// Associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;