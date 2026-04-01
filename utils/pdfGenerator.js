const puppeteer = require('puppeteer');

const generateBillPDF = async (order, businessDetails) => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const html = generateBillHTML(order, businessDetails);
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    width: '58mm',
    height: 'auto',
    printBackground: true,
    margin: { top: '5mm', right: '3mm', bottom: '5mm', left: '3mm' }
  });

  await browser.close();
  return pdfBuffer;
};

const generateBillHTML = (order, businessDetails) => {
  const items = order.items || [];
  const moment = require('moment');

  return `
    <html>
      <head>
        <style>
          body { font-family: monospace; font-size: 10px; width: 58mm; }
          .header, .footer { text-align: center; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table td, .items-table th { padding: 2px; }
          .totals { margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>${businessDetails.businessName || 'Finova'}</div>
          ${businessDetails.businessAddress || ''}
        </div>

        <div>
          <p>Order #: ${order.orderNumber}</p>
          <p>Date: ${moment(order.createdAt).format('DD/MM/YYYY')}</p>
        </div>

        <table class="items-table">
          <tr>
            <th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th>
          </tr>
          ${items.map(i => `
            <tr>
              <td>${i.item?.name || ''}</td>
              <td>${i.quantity}</td>
              <td>₹${i.unitPrice.toFixed(2)}</td>
              <td>₹${i.totalPrice.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        <div class="totals">
          <p>Grand Total: ₹${order.grandTotal}</p>
        </div>

        <div class="footer">
          <p>Thank you for visiting!</p>
        </div>
      </body>
    </html>
  `;
};

module.exports = { generateBillPDF, generateBillHTML };
