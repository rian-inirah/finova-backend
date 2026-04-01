const { sequelize } = require('../models');

// Setup test database
beforeAll(async () => {
  // Sync database for tests
  await sequelize.sync({ force: true });
});

// Cleanup after tests
afterAll(async () => {
  await sequelize.close();
});
