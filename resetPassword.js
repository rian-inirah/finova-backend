const bcrypt = require('bcryptjs');
const db = require('./models');

async function resetPassword() {
  try {
    const newPassword = 'admin123'; // 👈 set new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // update admin user
    await db.User.update(
      { password: hashed },
      { where: { username: 'admin' } }
    );

    console.log('✅ Password reset to "admin123" for user: admin');
    process.exit();
  } catch (err) {
    console.error('❌ Error resetting password:', err);
    process.exit(1);
  }
}

resetPassword();
