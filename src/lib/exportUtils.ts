import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCSV = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatSalesForExport = (sales: any[]) => {
  return sales.map(sale => ({
    'Date': new Date(sale.sale_date).toLocaleDateString(),
    'Customer': sale.vyapari?.name || 'N/A',
    'Product': sale.products?.name || 'N/A',
    'Quantity': sale.quantity,
    'Rate': sale.rate,
    'Total Amount': sale.total_amount,
    'Paid Amount': sale.paid_amount,
    'Remaining': sale.remaining_amount,
    'Status': sale.payment_status,
    'Due Date': new Date(sale.due_date).toLocaleDateString(),
  }));
};

export const formatPaymentsForExport = (payments: any[]) => {
  return payments.map(payment => ({
    'Date': new Date(payment.payment_date).toLocaleDateString(),
    'Customer': payment.vyapari?.name || 'N/A',
    'Amount': payment.amount,
    'Method': payment.payment_method || 'N/A',
    'Notes': payment.notes || '',
  }));
};

export const formatInventoryForExport = (products: any[]) => {
  return products.map(product => ({
    'Product': product.name,
    'Category': product.category,
    'Quantity': product.quantity,
    'Unit': product.unit,
    'Unit Price': product.unit_price,
    'Total Value': product.quantity * product.unit_price,
    'Low Stock Threshold': product.low_stock_threshold,
  }));
};