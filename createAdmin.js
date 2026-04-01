const db = require('./models');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    await db.sequelize.sync(); // ensure DB is ready

    const adminExists = await db.User.findOne({ where: { username: 'admin' } });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    console.log('Admin user created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
