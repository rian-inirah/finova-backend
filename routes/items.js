const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/itemController"); // <-- singular

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// all routes require authentication
router.use(authenticateToken);

// get all items (user-specific)
router.get("/", getAllItems);

// create item
router.post("/", upload.single("image"), createItem);

// update item
router.put("/:id", upload.single("image"), updateItem);

// delete item
router.delete("/:id", deleteItem);

module.exports = router;
