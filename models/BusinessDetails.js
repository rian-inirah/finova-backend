// models/BusinessDetails.js
module.exports = (sequelize, DataTypes) => {
  const BusinessDetails = sequelize.define('BusinessDetails', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },

    businessName: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },

    businessCategory: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    businessAddress: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },

    phoneNumber: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    gstinNumber: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    gstSlab: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    gstPercentage: { 
      type: DataTypes.FLOAT, 
      allowNull: true 
    },

    fssaiNumber: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    businessLogo: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    // --- Reports PIN (Generated when business details are created) ---
    reportsPin: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: '4-digit PIN used for accessing the Reports section'
    }
  }, {
    tableName: 'business_details',
    timestamps: true
  });

  BusinessDetails.associate = (models) => {
    BusinessDetails.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return BusinessDetails;
};
