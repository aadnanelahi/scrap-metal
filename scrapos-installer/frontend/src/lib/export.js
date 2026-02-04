import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// PDF Export
export const exportToPDF = (title, columns, data, options = {}) => {
  const doc = new jsPDF(options.orientation || 'landscape', 'mm', 'a4');
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(options.companyName || 'ScrapOS Trading LLC', 14, 15);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.text(title, 14, 23);
  
  if (options.dateRange) {
    doc.setFontSize(10);
    doc.text(`Period: ${options.dateRange}`, 14, 30);
  }
  
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

  // Table
  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => {
      const value = row[col.key];
      if (col.format === 'currency') {
        return typeof value === 'number' ? value.toLocaleString('en-AE', { minimumFractionDigits: 2 }) : value;
      }
      if (col.format === 'number') {
        return typeof value === 'number' ? value.toLocaleString('en-AE', { minimumFractionDigits: 3 }) : value;
      }
      if (col.format === 'date') {
        return value ? new Date(value).toLocaleDateString() : '-';
      }
      return value ?? '-';
    })),
    startY: 42,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      if (col.align === 'right' || col.format === 'currency' || col.format === 'number') {
        acc[idx] = { halign: 'right' };
      }
      return acc;
    }, {}),
    margin: { top: 42 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });

  // Add totals if provided
  if (options.totals) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    Object.entries(options.totals).forEach(([label, value], idx) => {
      doc.text(`${label}: ${value}`, doc.internal.pageSize.width - 60, finalY + (idx * 6), { align: 'right' });
    });
  }

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Excel Export
export const exportToExcel = (title, columns, data, options = {}) => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Header rows
  const headerData = [
    [options.companyName || 'ScrapOS Trading LLC'],
    [title],
    options.dateRange ? [`Period: ${options.dateRange}`] : [],
    [`Generated: ${new Date().toLocaleString()}`],
    [], // Empty row
    columns.map(col => col.header) // Column headers
  ].filter(row => row.length > 0);

  // Data rows
  const bodyData = data.map(row => columns.map(col => {
    const value = row[col.key];
    if (col.format === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    return value ?? '';
  }));

  // Totals row if provided
  if (options.totals) {
    bodyData.push([]); // Empty row
    Object.entries(options.totals).forEach(([label, value]) => {
      const row = new Array(columns.length).fill('');
      row[0] = label;
      row[columns.length - 1] = value;
      bodyData.push(row);
    });
  }

  // Combine all data
  const wsData = [...headerData, ...bodyData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // Merge header cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }, // Company name
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } }, // Title
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  // Generate file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Combined export function
export const exportReport = (format, title, columns, data, options = {}) => {
  if (format === 'pdf') {
    exportToPDF(title, columns, data, options);
  } else if (format === 'excel') {
    exportToExcel(title, columns, data, options);
  }
};
