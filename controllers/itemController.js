const { Item } = require("../models");
const { Op } = require("sequelize");

// GET all items for the logged-in user
exports.getAllItems = async (req, res) => {
  try {
    const search = req.query.search || "";

    const items = await Item.findAll({
      where: {
        userId: req.user.id,
        name: { [Op.like]: `%${search}%` }, // MySQL-compatible search
        isActive: true,                     // only active items
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({ items });
  } catch (err) {
    console.error("getAllItems error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

// CREATE a new item
exports.createItem = async (req, res) => {
  try {
    const { name, price } = req.body;
    const image = req.file ? req.file.path : null;

    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const item = await Item.create({
      userId: req.user.id,
      name,
      price,
      image,
      isActive: true,
    });

    res.status(201).json({ item });
  } catch (err) {
    console.error("createItem error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
};

// UPDATE an existing item
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    const { name, price } = req.body;
    const image = req.file ? req.file.path : item.image;

    await item.update({ name, price, image });
    res.json({ item });
  } catch (err) {
    console.error("updateItem error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
};

// DELETE an item (soft delete)
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    // Soft delete: mark item as inactive instead of destroying
    await item.update({ isActive: false });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("deleteItem error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
};
