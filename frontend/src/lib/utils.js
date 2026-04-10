export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const formatCurrency = (amount, currency = 'AED') => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'status-draft',
    pending: 'status-pending',
    approved: 'status-active',
    posted: 'status-posted',
    cancelled: 'status-cancelled',
    active: 'status-active',
    completed: 'status-posted',
    first_weight: 'status-pending',
    second_weight: 'status-pending',
  };
  return colors[status] || 'status-draft';
};

export const toISODateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Print utility function
export const printDocument = (content, title = 'Document') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for printing');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          color: #1a1a1a;
          font-size: 12px;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px solid #f97316;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .print-header h1 {
          font-size: 24px;
          color: #1e293b;
          margin-bottom: 5px;
        }
        .print-header p {
          color: #64748b;
        }
        .doc-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 4px;
        }
        .doc-info-left, .doc-info-right {
          width: 48%;
        }
        .doc-info h3 {
          font-size: 14px;
          color: #1e293b;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 5px;
        }
        .doc-info p {
          margin: 4px 0;
          color: #475569;
        }
        .doc-info strong {
          color: #1e293b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #f97316;
          color: white;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        .text-right { text-align: right; }
        .totals {
          margin-top: 20px;
          padding: 15px;
          background: #fef3c7;
          border-radius: 4px;
          text-align: right;
        }
        .totals p {
          margin: 5px 0;
        }
        .totals .grand-total {
          font-size: 18px;
          font-weight: bold;
          color: #1e293b;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #f97316;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
        }
        .signature-line {
          width: 200px;
          text-align: center;
        }
        .signature-line hr {
          border: none;
          border-top: 1px solid #1e293b;
          margin-bottom: 5px;
        }
        .signature-line p {
          color: #64748b;
          font-size: 11px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-draft { background: #e2e8f0; color: #475569; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-posted { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// Generate Purchase Order HTML for printing
export const generatePOPrintHTML = (po, company = null) => {
  const companyName = company?.name || po.company_name || 'ScrapOS Trading LLC';
  const companyLogo = company?.logo || po.company_logo || '';
  const companySlogan = company?.slogan || po.company_slogan || '';
  const companyAddress = company?.address || po.company_address || '';
  const companyPhone = company?.phone || po.company_phone || '';
  const companyEmail = company?.email || po.company_email || '';
  const companyVat = company?.vat_number || po.company_vat || '';
  
  const statusClass = po.status === 'posted' ? 'status-posted' : 
                      po.status === 'cancelled' ? 'status-cancelled' :
                      po.status === 'pending' ? 'status-pending' : 'status-draft';
  
  const linesHTML = (po.lines || []).map((line, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${line.item_name || '-'}</td>
      <td class="text-right">${formatNumber(line.quantity, 3)}</td>
      <td>${line.unit || 'MT'}</td>
      <td class="text-right">${formatCurrency(line.unit_price, po.currency)}</td>
      <td class="text-right">${line.vat_rate || 0}%</td>
      <td class="text-right">${formatCurrency(line.vat_amount, po.currency)}</td>
      <td class="text-right">${formatCurrency(line.line_total, po.currency)}</td>
    </tr>
  `).join('');

  const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:80px;max-width:200px;object-fit:contain;margin-bottom:10px;" />` : '';

  return `
    <div class="print-header">
      ${logoHTML}
      <h1>${companyName}</h1>
      ${companySlogan ? `<p style="font-style:italic;color:#64748b;margin-top:5px;">${companySlogan}</p>` : ''}
      ${companyAddress ? `<p style="font-size:11px;color:#64748b;margin-top:5px;">${companyAddress}</p>` : ''}
      ${companyPhone || companyEmail ? `<p style="font-size:11px;color:#64748b;">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</p>` : ''}
      ${companyVat ? `<p style="font-size:11px;color:#64748b;">VAT: ${companyVat}</p>` : ''}
      <p style="margin-top:10px;font-weight:600;font-size:16px;">PURCHASE ORDER</p>
    </div>
    
    <div class="doc-info">
      <div class="doc-info-left">
        <h3>Order Details</h3>
        <p><strong>PO Number:</strong> ${po.order_number || '-'}</p>
        <p><strong>Order Date:</strong> ${formatDate(po.order_date)}</p>
        <p><strong>Expected Date:</strong> ${po.expected_date ? formatDate(po.expected_date) : '-'}</p>
        <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${po.status || 'draft'}</span></p>
      </div>
      <div class="doc-info-right">
        <h3>Supplier Details</h3>
        <p><strong>Name:</strong> ${po.supplier_name || '-'}</p>
        <p><strong>Currency:</strong> ${po.currency || 'AED'}</p>
        ${po.broker_id ? `<p><strong>Broker Commission:</strong> ${formatCurrency(po.broker_commission, po.currency)}</p>` : ''}
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th>Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">VAT %</th>
          <th class="text-right">VAT Amount</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHTML || '<tr><td colspan="8" style="text-align:center;">No items</td></tr>'}
      </tbody>
    </table>
    
    <div class="totals">
      <p><strong>Subtotal:</strong> ${formatCurrency(po.subtotal, po.currency)}</p>
      <p><strong>VAT Amount:</strong> ${formatCurrency(po.vat_amount, po.currency)}</p>
      ${po.broker_commission > 0 ? `<p><strong>Broker Commission:</strong> ${formatCurrency(po.broker_commission, po.currency)}</p>` : ''}
      <p class="grand-total">Grand Total: ${formatCurrency(po.total_amount, po.currency)}</p>
    </div>
    
    ${po.notes ? `<div style="margin-top:20px;"><strong>Notes:</strong> ${po.notes}</div>` : ''}
    
    ${po.status === 'cancelled' && po.cancellation_reason ? `
    <div style="margin-top:20px;padding:15px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;">
      <p style="color:#dc2626;font-weight:600;margin:0 0 5px 0;">CANCELLED</p>
      <p style="margin:0;color:#991b1b;"><strong>Reason:</strong> ${po.cancellation_reason}</p>
      ${po.cancelled_by ? `<p style="margin:5px 0 0 0;font-size:11px;color:#991b1b;">Cancelled by: ${po.cancelled_by} on ${formatDate(po.cancelled_at)}</p>` : ''}
    </div>
    ` : ''}
    
    ${po.edit_history && po.edit_history.length > 0 ? `
    <div style="margin-top:20px;padding:15px;background:#fef9c3;border:1px solid #fde047;border-radius:4px;">
      <p style="color:#a16207;font-weight:600;margin:0 0 10px 0;">EDIT HISTORY (Post-Posting Modifications)</p>
      ${po.edit_history.map(edit => `
        <p style="margin:5px 0;font-size:11px;color:#a16207;">
          <strong>${formatDate(edit.edited_at)}</strong> by ${edit.edited_by}: ${edit.reason}
        </p>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="signature-line">
        <hr />
        <p>Prepared By</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Approved By</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Received By</p>
      </div>
    </div>
  `;
};

// Generate Sales Order HTML for printing
export const generateSOPrintHTML = (so, company = null) => {
  const companyName = company?.name || so.company_name || 'ScrapOS Trading LLC';
  const companyLogo = company?.logo || so.company_logo || '';
  const companySlogan = company?.slogan || so.company_slogan || '';
  const companyAddress = company?.address || so.company_address || '';
  const companyPhone = company?.phone || so.company_phone || '';
  const companyEmail = company?.email || so.company_email || '';
  const companyVat = company?.vat_number || so.company_vat || '';
  
  const statusClass = so.status === 'posted' ? 'status-posted' : 
                      so.status === 'cancelled' ? 'status-cancelled' :
                      so.status === 'pending' ? 'status-pending' : 'status-draft';
  
  const linesHTML = (so.lines || []).map((line, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${line.item_name || '-'}</td>
      <td class="text-right">${formatNumber(line.quantity, 3)}</td>
      <td>${line.unit || 'MT'}</td>
      <td class="text-right">${formatCurrency(line.unit_price, so.currency)}</td>
      <td class="text-right">${line.vat_rate || 0}%</td>
      <td class="text-right">${formatCurrency(line.vat_amount, so.currency)}</td>
      <td class="text-right">${formatCurrency(line.line_total, so.currency)}</td>
    </tr>
  `).join('');

  const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:80px;max-width:200px;object-fit:contain;margin-bottom:10px;" />` : '';

  return `
    <div class="print-header">
      ${logoHTML}
      <h1>${companyName}</h1>
      ${companySlogan ? `<p style="font-style:italic;color:#64748b;margin-top:5px;">${companySlogan}</p>` : ''}
      ${companyAddress ? `<p style="font-size:11px;color:#64748b;margin-top:5px;">${companyAddress}</p>` : ''}
      ${companyPhone || companyEmail ? `<p style="font-size:11px;color:#64748b;">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</p>` : ''}
      ${companyVat ? `<p style="font-size:11px;color:#64748b;">VAT: ${companyVat}</p>` : ''}
      <p style="margin-top:10px;font-weight:600;font-size:16px;">SALES ORDER</p>
    </div>
    
    <div class="doc-info">
      <div class="doc-info-left">
        <h3>Order Details</h3>
        <p><strong>SO Number:</strong> ${so.order_number || '-'}</p>
        <p><strong>Order Date:</strong> ${formatDate(so.order_date)}</p>
        <p><strong>Delivery Date:</strong> ${so.delivery_date ? formatDate(so.delivery_date) : '-'}</p>
        <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${so.status || 'draft'}</span></p>
      </div>
      <div class="doc-info-right">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${so.customer_name || '-'}</p>
        <p><strong>Currency:</strong> ${so.currency || 'AED'}</p>
        ${so.broker_id ? `<p><strong>Broker Commission:</strong> ${formatCurrency(so.broker_commission, so.currency)}</p>` : ''}
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th>Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">VAT %</th>
          <th class="text-right">VAT Amount</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHTML || '<tr><td colspan="8" style="text-align:center;">No items</td></tr>'}
      </tbody>
    </table>
    
    <div class="totals">
      <p><strong>Subtotal:</strong> ${formatCurrency(so.subtotal, so.currency)}</p>
      <p><strong>VAT Amount:</strong> ${formatCurrency(so.vat_amount, so.currency)}</p>
      ${so.broker_commission > 0 ? `<p><strong>Broker Commission:</strong> ${formatCurrency(so.broker_commission, so.currency)}</p>` : ''}
      <p class="grand-total">Grand Total: ${formatCurrency(so.total_amount, so.currency)}</p>
    </div>
    
    ${so.notes ? `<div style="margin-top:20px;"><strong>Notes:</strong> ${so.notes}</div>` : ''}
    
    ${so.status === 'cancelled' && so.cancellation_reason ? `
    <div style="margin-top:20px;padding:15px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;">
      <p style="color:#dc2626;font-weight:600;margin:0 0 5px 0;">CANCELLED</p>
      <p style="margin:0;color:#991b1b;"><strong>Reason:</strong> ${so.cancellation_reason}</p>
      ${so.cancelled_by ? `<p style="margin:5px 0 0 0;font-size:11px;color:#991b1b;">Cancelled by: ${so.cancelled_by} on ${formatDate(so.cancelled_at)}</p>` : ''}
    </div>
    ` : ''}
    
    ${so.edit_history && so.edit_history.length > 0 ? `
    <div style="margin-top:20px;padding:15px;background:#fef9c3;border:1px solid #fde047;border-radius:4px;">
      <p style="color:#a16207;font-weight:600;margin:0 0 10px 0;">EDIT HISTORY (Post-Posting Modifications)</p>
      ${so.edit_history.map(edit => `
        <p style="margin:5px 0;font-size:11px;color:#a16207;">
          <strong>${formatDate(edit.edited_at)}</strong> by ${edit.edited_by}: ${edit.reason}
        </p>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="signature-line">
        <hr />
        <p>Prepared By</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Approved By</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Customer Signature</p>
      </div>
    </div>
  `;
};

// Generate Weighbridge Slip HTML for printing
export const generateWeighbridgeSlipHTML = (entry, company = null) => {
  const companyName = company?.name || entry.company_name || 'ScrapOS Trading LLC';
  const companyLogo = company?.logo || entry.company_logo || '';
  const companySlogan = company?.slogan || entry.company_slogan || '';
  const companyAddress = company?.address || entry.company_address || '';
  const companyPhone = company?.phone || entry.company_phone || '';
  
  const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:60px;max-width:150px;object-fit:contain;margin-bottom:8px;" />` : '';
  
  return `
    <div class="print-header">
      ${logoHTML}
      <h1>${companyName}</h1>
      ${companySlogan ? `<p style="font-style:italic;color:#64748b;margin-top:3px;font-size:11px;">${companySlogan}</p>` : ''}
      ${companyAddress ? `<p style="font-size:10px;color:#64748b;margin-top:3px;">${companyAddress}</p>` : ''}
      <p style="margin-top:8px;font-weight:600;font-size:14px;">WEIGHBRIDGE SLIP</p>
    </div>
    
    <div class="doc-info">
      <div class="doc-info-left">
        <h3>Slip Details</h3>
        <p><strong>Slip Number:</strong> ${entry.slip_number || '-'}</p>
        <p><strong>Date:</strong> ${formatDateTime(entry.created_at)}</p>
        <p><strong>Type:</strong> ${entry.transaction_type === 'purchase' ? 'Purchase (Incoming)' : 'Sales (Outgoing)'}</p>
        <p><strong>Status:</strong> <span class="status-badge ${entry.status === 'completed' ? 'status-posted' : 'status-pending'}">${(entry.status || '').replace('_', ' ')}</span></p>
      </div>
      <div class="doc-info-right">
        <h3>Vehicle Details</h3>
        <p><strong>Vehicle Number:</strong> ${entry.vehicle_number || '-'}</p>
        <p><strong>Driver Name:</strong> ${entry.driver_name || '-'}</p>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Weight Type</th>
          <th class="text-right">Weight (MT)</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Gross Weight (1st)</td>
          <td class="text-right" style="font-size:18px;font-weight:bold;">${formatNumber(entry.gross_weight, 3)}</td>
          <td>${entry.first_weight_time ? formatDateTime(entry.first_weight_time) : formatDateTime(entry.created_at)}</td>
        </tr>
        <tr>
          <td>Tare Weight (2nd)</td>
          <td class="text-right" style="font-size:18px;font-weight:bold;">${entry.tare_weight ? formatNumber(entry.tare_weight, 3) : '-'}</td>
          <td>${entry.second_weight_time ? formatDateTime(entry.second_weight_time) : '-'}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="totals" style="background:#d1fae5;">
      <p class="grand-total" style="font-size:24px;">Net Weight: ${entry.net_weight ? formatNumber(entry.net_weight, 3) : '-'} MT</p>
    </div>
    
    ${entry.notes ? `<div style="margin-top:20px;"><strong>Notes:</strong> ${entry.notes}</div>` : ''}
    
    <div class="footer">
      <div class="signature-line">
        <hr />
        <p>Weighbridge Operator</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Driver Signature</p>
      </div>
    </div>
  `;
};

// Generate Payment Receipt HTML for printing
export const generatePaymentReceiptHTML = (receipt, company = null) => {
  const companyName = company?.name || receipt.company_name || 'ScrapOS Trading LLC';
  const companyLogo = company?.logo || receipt.company_logo || '';
  const companySlogan = company?.slogan || receipt.company_slogan || '';
  const companyAddress = company?.address || receipt.company_address || '';
  const companyPhone = company?.phone || receipt.company_phone || '';
  const companyVat = company?.vat_number || receipt.company_vat || '';
  
  const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:70px;max-width:180px;object-fit:contain;margin-bottom:8px;" />` : '';
  
  return `
    <div class="print-header">
      ${logoHTML}
      <h1>${companyName}</h1>
      ${companySlogan ? `<p style="font-style:italic;color:#64748b;margin-top:5px;">${companySlogan}</p>` : ''}
      ${companyAddress ? `<p style="font-size:11px;color:#64748b;margin-top:5px;">${companyAddress}</p>` : ''}
      ${companyVat ? `<p style="font-size:11px;color:#64748b;">VAT: ${companyVat}</p>` : ''}
      <p style="margin-top:10px;font-weight:600;font-size:16px;">${receipt.type === 'received' ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER'}</p>
    </div>
    
    <div class="doc-info">
      <div class="doc-info-left">
        <h3>Receipt Details</h3>
        <p><strong>Receipt Number:</strong> ${receipt.receipt_number || '-'}</p>
        <p><strong>Date:</strong> ${formatDate(receipt.payment_date)}</p>
        <p><strong>Payment Method:</strong> ${receipt.payment_method || 'Cash'}</p>
        <p><strong>Reference:</strong> ${receipt.reference_number || '-'}</p>
      </div>
      <div class="doc-info-right">
        <h3>${receipt.type === 'received' ? 'Received From' : 'Paid To'}</h3>
        <p><strong>Name:</strong> ${receipt.party_name || '-'}</p>
        <p><strong>Against Document:</strong> ${receipt.document_number || '-'}</p>
      </div>
    </div>
    
    <div class="totals" style="text-align:center;margin-top:40px;">
      <p style="font-size:14px;color:#64748b;">${receipt.type === 'received' ? 'Amount Received' : 'Amount Paid'}</p>
      <p class="grand-total" style="font-size:32px;">${formatCurrency(receipt.amount, receipt.currency)}</p>
      <p style="margin-top:10px;font-style:italic;color:#475569;">${receipt.amount_in_words || ''}</p>
    </div>
    
    ${receipt.notes ? `<div style="margin-top:30px;"><strong>Notes:</strong> ${receipt.notes}</div>` : ''}
    
    <div class="footer" style="margin-top:60px;">
      <div class="signature-line">
        <hr />
        <p>${receipt.type === 'received' ? 'Received By' : 'Paid By'}</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Authorized Signature</p>
      </div>
    </div>
  `;
};


// Generate Export Sales Contract HTML for printing
export const generateExportSalesPrintHTML = (contract, company = null) => {
  const companyName = company?.name || contract.company_name || 'ScrapOS Trading LLC';
  const companyLogo = company?.logo || contract.company_logo || '';
  const companySlogan = company?.slogan || contract.company_slogan || '';
  const companyAddress = company?.address || contract.company_address || '';
  const companyPhone = company?.phone || contract.company_phone || '';
  const companyEmail = company?.email || contract.company_email || '';
  const companyVat = company?.vat_number || contract.company_vat || '';
  
  const statusClass = contract.status === 'posted' ? 'status-posted' : 
                      contract.status === 'cancelled' ? 'status-cancelled' :
                      contract.status === 'pending' ? 'status-pending' : 'status-draft';
  
  const linesHTML = (contract.lines || []).map((line, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${line.item_name || '-'}</td>
      <td class="text-right">${formatNumber(line.quantity, 3)}</td>
      <td>${line.unit || 'MT'}</td>
      <td class="text-right">${formatCurrency(line.unit_price, contract.currency)}</td>
      <td class="text-right">${formatCurrency(line.line_total, contract.currency)}</td>
    </tr>
  `).join('');

  const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:80px;max-width:200px;object-fit:contain;margin-bottom:10px;" />` : '';

  return `
    <div class="print-header">
      ${logoHTML}
      <h1>${companyName}</h1>
      ${companySlogan ? `<p style="font-style:italic;color:#64748b;margin-top:5px;">${companySlogan}</p>` : ''}
      ${companyAddress ? `<p style="font-size:11px;color:#64748b;margin-top:5px;">${companyAddress}</p>` : ''}
      ${companyPhone || companyEmail ? `<p style="font-size:11px;color:#64748b;">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</p>` : ''}
      ${companyVat ? `<p style="font-size:11px;color:#64748b;">VAT: ${companyVat}</p>` : ''}
      <p style="margin-top:10px;font-weight:600;font-size:16px;">EXPORT SALES CONTRACT</p>
    </div>
    
    <div class="doc-info">
      <div class="doc-info-left">
        <h3>Contract Details</h3>
        <p><strong>Contract No:</strong> ${contract.order_number || contract.contract_number || '-'}</p>
        <p><strong>Date:</strong> ${formatDate(contract.contract_date || contract.order_date)}</p>
        <p><strong>Delivery Date:</strong> ${contract.delivery_date ? formatDate(contract.delivery_date) : '-'}</p>
        <p><strong>Incoterm:</strong> ${contract.incoterm_code || '-'}</p>
        <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${contract.status || 'draft'}</span></p>
      </div>
      <div class="doc-info-right">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${contract.customer_name || '-'}</p>
        <p><strong>Currency:</strong> ${contract.currency || 'USD'}</p>
        <p><strong>Exchange Rate:</strong> ${contract.exchange_rate || 1}</p>
        ${contract.port_of_loading_name ? `<p><strong>Port of Loading:</strong> ${contract.port_of_loading_name}</p>` : ''}
        ${contract.port_of_destination_name ? `<p><strong>Destination:</strong> ${contract.port_of_destination_name}</p>` : ''}
      </div>
    </div>
    
    ${contract.container_number || contract.bl_number ? `
    <div style="margin:15px 0;padding:10px;background:#f8fafc;border-radius:4px;">
      <h3 style="margin:0 0 8px 0;font-size:12px;color:#64748b;">Shipping Information</h3>
      ${contract.shipping_line ? `<p><strong>Shipping Line:</strong> ${contract.shipping_line}</p>` : ''}
      ${contract.container_number ? `<p><strong>Container No:</strong> ${contract.container_number}</p>` : ''}
      ${contract.bl_number ? `<p><strong>B/L Number:</strong> ${contract.bl_number}</p>` : ''}
    </div>
    ` : ''}
    
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th>Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHTML || '<tr><td colspan="6" style="text-align:center;">No items</td></tr>'}
      </tbody>
    </table>
    
    <div class="totals">
      <p><strong>Subtotal:</strong> ${formatCurrency(contract.subtotal, contract.currency)}</p>
      <p><strong>VAT (Zero-Rated):</strong> ${formatCurrency(0, contract.currency)}</p>
      <p class="grand-total">Contract Value: ${formatCurrency(contract.total_amount, contract.currency)}</p>
      <p style="font-size:11px;color:#64748b;">Equivalent in AED: ${formatCurrency(contract.total_amount * (contract.exchange_rate || 1), 'AED')}</p>
    </div>
    
    ${contract.notes ? `<div style="margin-top:20px;"><strong>Notes:</strong> ${contract.notes}</div>` : ''}
    
    ${contract.status === 'cancelled' && contract.cancellation_reason ? `
    <div style="margin-top:20px;padding:15px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;">
      <p style="color:#dc2626;font-weight:600;margin:0 0 5px 0;">CANCELLED</p>
      <p style="margin:0;color:#991b1b;"><strong>Reason:</strong> ${contract.cancellation_reason}</p>
      ${contract.cancelled_by ? `<p style="margin:5px 0 0 0;font-size:11px;color:#991b1b;">Cancelled by: ${contract.cancelled_by} on ${formatDate(contract.cancelled_at)}</p>` : ''}
    </div>
    ` : ''}
    
    ${contract.edit_history && contract.edit_history.length > 0 ? `
    <div style="margin-top:20px;padding:15px;background:#fef9c3;border:1px solid #fde047;border-radius:4px;">
      <p style="color:#a16207;font-weight:600;margin:0 0 10px 0;">EDIT HISTORY (Post-Posting Modifications)</p>
      ${contract.edit_history.map(edit => `
        <p style="margin:5px 0;font-size:11px;color:#a16207;">
          <strong>${formatDate(edit.edited_at)}</strong> by ${edit.edited_by}: ${edit.reason}
        </p>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="signature-line">
        <hr />
        <p>Seller</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Buyer</p>
      </div>
      <div class="signature-line">
        <hr />
        <p>Witness</p>
      </div>
    </div>
  `;
};
