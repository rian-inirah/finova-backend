const bcrypt = require('bcryptjs');
const db = require('./models');

(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.User.update(
    { password: hashedPassword, isActive: true },
    { where: { username: 'admin' } }
  );
  console.log('Admin password reset successfully');
  process.exit();
})();
