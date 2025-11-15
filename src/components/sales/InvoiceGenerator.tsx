import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  sale: {
    id: string;
    sale_date: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    quantity: number;
    rate: number;
    notes?: string;
    vyapari: {
      name: string;
      contact: string;
      email?: string;
      address?: string;
    };
    products: {
      name: string;
      category: string;
      unit: string;
    };
  };
}

export function InvoiceGenerator({ sale }: InvoiceData) {
  const invoiceNumber = `INV-${sale.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById("invoice-content");
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { display: flex; justify-content: flex-end; gap: 20px; margin: 5px 0; }
            .total-label { font-weight: bold; min-width: 150px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div id="invoice-content" className="bg-card border rounded-lg p-6 md:p-8 print:border-0 print:shadow-none">
        <div className="border-b-2 border-foreground pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">INVOICE</h1>
              <p className="text-muted-foreground mt-1">StokeMaker</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="text-lg font-bold text-foreground">{invoiceNumber}</p>
              <p className="text-sm text-muted-foreground mt-2">Date</p>
              <p className="text-foreground">{format(new Date(sale.sale_date), "dd MMM yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Bill To:</h3>
            <p className="text-foreground font-medium">{sale.vyapari.name}</p>
            <p className="text-muted-foreground">{sale.vyapari.contact}</p>
            {sale.vyapari.email && <p className="text-muted-foreground">{sale.vyapari.email}</p>}
            {sale.vyapari.address && <p className="text-muted-foreground">{sale.vyapari.address}</p>}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-3 text-foreground">Item</th>
              <th className="text-left py-3 text-foreground">Category</th>
              <th className="text-center py-3 text-foreground">Quantity</th>
              <th className="text-right py-3 text-foreground">Rate</th>
              <th className="text-right py-3 text-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3 text-foreground">{sale.products.name}</td>
              <td className="py-3 text-muted-foreground">{sale.products.category}</td>
              <td className="text-center py-3 text-foreground">
                {sale.quantity} {sale.products.unit}
              </td>
              <td className="text-right py-3 text-foreground">₹{Number(sale.rate).toLocaleString()}</td>
              <td className="text-right py-3 text-foreground">₹{Number(sale.total_amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {sale.notes && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-semibold mb-1">Notes:</p>
            <p className="text-sm text-foreground">{sale.notes}</p>
          </div>
        )}

        <div className="mt-8 space-y-2">
          <div className="flex justify-end gap-8">
            <span className="font-semibold text-foreground min-w-[150px]">Subtotal:</span>
            <span className="text-foreground">₹{Number(sale.total_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-end gap-8">
            <span className="font-semibold text-foreground min-w-[150px]">Paid Amount:</span>
            <span className="text-success">₹{Number(sale.paid_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-end gap-8 pt-2 border-t-2 border-foreground">
            <span className="font-bold text-lg text-foreground min-w-[150px]">Balance Due:</span>
            <span className="font-bold text-lg text-destructive">
              ₹{Number(sale.remaining_amount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
