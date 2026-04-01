const bcrypt = require('bcryptjs');
const db = require('../models');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      await db.OrderItem.destroy({ where: {} });
      await db.Order.destroy({ where: {} });
      await db.Item.destroy({ where: {} });
      await db.BusinessDetails.destroy({ where: {} });
      await db.User.destroy({ where: {} });
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const adminUser = await db.User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    // Create Modern user (for PSG features)
    console.log('👤 Creating Modern user...');
    const modernUser = await db.User.create({
      username: 'Modern',
      password: hashedPassword,
      role: 'operator',
      isActive: true
    });

    // Create business details for admin
    console.log('🏢 Creating business details...');
    const adminBusinessDetails = await db.BusinessDetails.create({
      userId: adminUser.id,
      businessCategory: 'Restaurant',
      fssaiNumber: 'FSSAI123456789',
      businessName: 'Finova Demo Restaurant',
      phoneNumber: '+91 8870305577',
      businessAddress: '123 Main Street, City, State - 123456',
      gstinNumber: '12ABCDE1234F1Z5',
      gstSlab: 12,
      gstPercentage: 12.00,
      reportsPinHash: await bcrypt.hash('1234', 10)
    });

    // Create business details for Modern user
    const modernBusinessDetails = await db.BusinessDetails.create({
      userId: modernUser.id,
      businessCategory: 'Restaurant',
      fssaiNumber: 'FSSAI987654321',
      businessName: 'Modern Restaurant',
      phoneNumber: '+91 9876543210',
      businessAddress: '456 Tech Street, City, State - 654321',
      gstinNumber: '34FGHIJ5678K9L2',
      gstSlab: 5,
      gstPercentage: 5.00,
      reportsPinHash: await bcrypt.hash('5678', 10)
    });

    // Create sample items for admin
    console.log('🍽️ Creating sample items...');
    const sampleItems = [
      { name: 'Idli', price: 25.00 },
      { name: 'Dosa', price: 45.00 },
      { name: 'Chicken Rice', price: 120.00 },
      { name: 'Apple Juice', price: 35.00 },
      { name: 'Masala Dosa', price: 55.00 },
      { name: 'Sambar Rice', price: 40.00 },
      { name: 'Tea', price: 15.00 },
      { name: 'Coffee', price: 20.00 },
      { name: 'Vada', price: 30.00 },
      { name: 'Pongal', price: 35.00 }
    ];

    const createdItems = [];
    for (const itemData of sampleItems) {
      const item = await db.Item.create({
        userId: adminUser.id,
        name: itemData.name,
        price: itemData.price,
        isActive: true
      });
      createdItems.push(item);
    }

    // Create sample items for Modern user
    const modernItems = [
      { name: 'Pizza Margherita', price: 200.00 },
      { name: 'Burger Deluxe', price: 150.00 },
      { name: 'French Fries', price: 80.00 },
      { name: 'Coca Cola', price: 40.00 }
    ];

    for (const itemData of modernItems) {
      await db.Item.create({
        userId: modernUser.id,
        name: itemData.name,
        price: itemData.price,
        isActive: true
      });
    }

    // Create sample orders for admin
    console.log('📋 Creating sample orders...');
    
    // Sample completed order 1
    const order1 = await db.Order.create({
      userId: adminUser.id,
      orderNumber: 'FN-20241201-000001',
      customerPhone: '+91 9876543210',
      status: 'completed',
      paymentMethod: 'cash',
      subtotal: 140.00,
      gstAmount: 16.80,
      cgst: 8.40,
      sgst: 8.40,
      grandTotal: 156.80,
      psgMarked: false,
      printed: true,
      printedAt: new Date()
    });

    // Add order items for order 1
    await db.OrderItem.bulkCreate([
      {
        orderId: order1.id,
        itemId: createdItems[0].id, // Idli
        quantity: 2,
        unitPrice: 25.00,
        totalPrice: 50.00
      },
      {
        orderId: order1.id,
        itemId: createdItems[1].id, // Dosa
        quantity: 2,
        unitPrice: 45.00,
        totalPrice: 90.00
      }
    ]);

    // Sample completed order 2 (PSG marked)
    const order2 = await db.Order.create({
      userId: adminUser.id,
      orderNumber: 'FN-20241201-000002',
      customerPhone: '+91 8765432109',
      status: 'completed',
      paymentMethod: 'online',
      subtotal: 155.00,
      gstAmount: 18.60,
      cgst: 9.30,
      sgst: 9.30,
      grandTotal: 173.60,
      psgMarked: true,
      printed: true,
      printedAt: new Date()
    });

    // Add order items for order 2
    await db.OrderItem.bulkCreate([
      {
        orderId: order2.id,
        itemId: createdItems[2].id, // Chicken Rice
        quantity: 1,
        unitPrice: 120.00,
        totalPrice: 120.00
      },
      {
        orderId: order2.id,
        itemId: createdItems[3].id, // Apple Juice
        quantity: 1,
        unitPrice: 35.00,
        totalPrice: 35.00
      }
    ]);

    // Sample draft order
    const draftOrder = await db.Order.create({
      userId: adminUser.id,
      orderNumber: 'FN-20241201-000003',
      status: 'draft',
      subtotal: 70.00,
      gstAmount: 8.40,
      cgst: 4.20,
      sgst: 4.20,
      grandTotal: 78.40,
      psgMarked: false,
      printed: false
    });

    // Add order items for draft order
    await db.OrderItem.bulkCreate([
      {
        orderId: draftOrder.id,
        itemId: createdItems[6].id, // Tea
        quantity: 2,
        unitPrice: 15.00,
        totalPrice: 30.00
      },
      {
        orderId: draftOrder.id,
        itemId: createdItems[7].id, // Coffee
        quantity: 2,
        unitPrice: 20.00,
        totalPrice: 40.00
      }
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Data Created:');
    console.log('👤 Users:');
    console.log('   - Username: admin, Password: Admin@123 (Admin role)');
    console.log('   - Username: Modern, Password: Admin@123 (Operator role)');
    console.log('🏢 Business Details: Created for both users');
    console.log('🍽️ Items: 10 items for admin, 4 items for Modern user');
    console.log('📋 Orders: 2 completed orders, 1 draft order');
    console.log('🔐 Reports PIN: 1234 for admin, 5678 for Modern user');
    console.log('\n🎯 PSG Feature: Only visible for "Modern" user');
    console.log('📊 Reports: PIN protected (1234 for admin, 5678 for Modern)');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
