// controllers/billingController.js
const db = require('../models');
const { jsPDF } = require('jspdf'); // lightweight PDF generator (if installed)
const fs = require('fs');
const path = require('path');

//
// 🔹 Generate Bill Preview (HTML for frontend)
//
exports.generateBillPreview = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.Order.findOne({
      where: { id, userId: req.user.id },
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }]
    });

    if (!order) {
      return res.status(404).send('<h2>Order not found</h2>');
    }

    // Create a simple HTML preview
    let html = `
      <html>
        <head>
          <title>Bill Preview - ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>Bill Preview</h1>
          <p><strong>Order No:</strong> ${order.orderNumber}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod || 'N/A'}</p>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
    `;

    order.orderItems.forEach(item => {
      html += `
        <tr>
          <td>${item.item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.unitPrice}</td>
          <td>${item.totalPrice}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>

          <h3>Subtotal: ₹${order.subtotal}</h3>
          <h3>GST: ₹${order.gstAmount} (CGST ₹${order.cgst} + SGST ₹${order.sgst})</h3>
          <h2>Grand Total: ₹${order.grandTotal}</h2>
        </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (error) {
    console.error('Error generating bill preview:', error);
    res.status(500).send('<h3>Failed to generate bill preview</h3>');
  }
};

//
// 🔹 Generate Bill PDF (for download)
//
exports.generateBillPDFFile = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.Order.findOne({
      where: { id, userId: req.user.id },
      include: [{
        model: db.OrderItem,
        as: 'orderItems',
        include: [{ model: db.Item, as: 'item', attributes: ['id', 'name', 'price'] }]
      }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Generate a PDF using jsPDF (text only for simplicity)
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Invoice - ${order.orderNumber}`, 10, 10);
    doc.text(`Customer Phone: ${order.customerPhone || 'N/A'}`, 10, 20);
    doc.text(`Payment: ${order.paymentMethod || 'N/A'}`, 10, 30);
    doc.text(`----------------------------------------`, 10, 40);

    let y = 50;
    order.orderItems.forEach(item => {
      doc.text(`${item.item.name} x${item.quantity}  ₹${item.totalPrice}`, 10, y);
      y += 10;
    });

    y += 10;
    doc.text(`Subtotal: ₹${order.subtotal}`, 10, y); y += 10;
    doc.text(`GST: ₹${order.gstAmount}`, 10, y); y += 10;
    doc.text(`Grand Total: ₹${order.grandTotal}`, 10, y);

    // Save to temp folder
    const filePath = path.join(__dirname, `../../bills/bill_${order.orderNumber}.pdf`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    doc.save(filePath);

    // Send file
    res.download(filePath, `Bill_${order.orderNumber}.pdf`, (err) => {
      if (err) console.error('Error sending PDF:', err);
      fs.unlink(filePath, () => {}); // delete temp file
    });

  } catch (error) {
    console.error('Error generating bill PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

//
// 🔹 Mark Bill as Printed
//
exports.printBill = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.Order.findOne({ where: { id, userId: req.user.id, status: 'completed' } });
    if (!order) return res.status(404).json({ error: 'Completed order not found' });

    await order.update({ printed: true, printedAt: new Date() });

    res.json({ message: `Bill marked as printed for order ${order.orderNumber}` });
  } catch (error) {
    console.error('Error marking bill printed:', error);
    res.status(500).json({ error: 'Failed to mark bill as printed' });
  }
};
