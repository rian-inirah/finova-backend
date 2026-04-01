const db = require('./models');
const bcrypt = require('bcryptjs');

async function createOrUpdateAdmin() {
  try {
    await db.sequelize.sync(); // ensure DB is ready

    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Find admin user including soft-deleted ones
    let adminUser = await db.User.findOne({
      where: { username: 'admin' },
      paranoid: false // include soft-deleted users
    });

    if (!adminUser) {
      // Admin does not exist, create new
      await db.User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log('Admin user created successfully!');
    } else {
      // Admin exists, update password and reactivate
      await db.User.update(
        { password: hashedPassword, isActive: true, deletedAt: null },
        { where: { id: adminUser.id }, paranoid: false }
      );
      console.log('Admin user updated successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating/updating admin:', err);
    process.exit(1);
  }
}

createOrUpdateAdmin();
