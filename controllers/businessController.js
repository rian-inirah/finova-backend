// controllers/businessController.js
const db = require('../models');
const fs = require('fs');
const path = require('path');

// --------------------
// GET /api/business — Fetch business details
// --------------------
const getBusinessDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const businessDetails = await db.BusinessDetails.findOne({ where: { userId } });
    if (!businessDetails) return res.status(404).json({ error: 'Business details not found' });

    return res.json({ success: true, businessDetails: businessDetails.toJSON() });
  } catch (err) {
    console.error('getBusinessDetails error:', err);
    return res.status(500).json({ error: 'Failed to fetch business details' });
  }
};

// --------------------
// POST /api/business — Create or Update business details
// --------------------
const createOrUpdateBusinessDetails = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = req.user?.id;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const businessName = req.body.businessName?.trim();
    if (!businessName) {
      await t.rollback();
      return res.status(400).json({ error: 'Business name is required' });
    }

    const { businessCategory, businessAddress, phoneNumber, gstinNumber, gstSlab, gstPercentage, fssaiNumber } = req.body;

    let businessDetails = await db.BusinessDetails.findOne({ where: { userId }, transaction: t, lock: t.LOCK.UPDATE });

    if (businessDetails) {
      await businessDetails.update({
        businessName,
        businessCategory,
        businessAddress,
        phoneNumber,
        gstinNumber,
        gstSlab,
        gstPercentage,
        fssaiNumber,
      }, { transaction: t });
    } else {
      businessDetails = await db.BusinessDetails.create({
        userId,
        businessName,
        businessCategory,
        businessAddress,
        phoneNumber,
        gstinNumber,
        gstSlab,
        gstPercentage,
        fssaiNumber,
      }, { transaction: t });
    }

    // Handle logo upload
    if (req.file) {
      try {
        if (businessDetails.businessLogo) {
          const oldPath = path.join(process.cwd(), businessDetails.businessLogo.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.warn('Failed to remove old logo:', e);
      }

      businessDetails.businessLogo = `/uploads/${req.file.filename}`;
      await businessDetails.save({ transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      message: 'Business details saved successfully',
      businessDetails: businessDetails.toJSON()
    });

  } catch (err) {
    await t.rollback();
    console.error('createOrUpdateBusinessDetails error:', err);
    return res.status(500).json({ error: 'Failed to save business details' });
  }
};

// --------------------
// Middleware: Validate Business Name
// --------------------
const businessValidation = (req, res, next) => {
  if (!req.body.businessName || req.body.businessName.trim() === '') {
    return res.status(400).json({ error: 'Business name is required' });
  }
  next();
};

// --------------------
// PIN verification removed — handled completely on frontend
// --------------------

module.exports = {
  getBusinessDetails,
  createOrUpdateBusinessDetails,
  businessValidation,
};
