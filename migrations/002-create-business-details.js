'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      businessCategory: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      fssaiNumber: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      businessName: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      phoneNumber: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      businessAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      gstinNumber: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      gstSlab: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      gstPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      businessLogo: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      reportsPinHash: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('business_details', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('business_details');
  }
};
