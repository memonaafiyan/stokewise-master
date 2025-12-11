import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/hooks/useProducts";
import { format } from "date-fns";
import { FileText, Download, Share2, Printer, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ShopSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  gst_number?: string;
}

const DEFAULT_SHOP: ShopSettings = {
  shop_name: "Phonex Telecom",
  shop_address: "Ahmedabad, Gujarat, India",
  shop_phone: "7874455980",
  shop_email: "memonaafiyan01@gmail.com",
  gst_number: ""
};

interface InvoiceGeneratorProps {
  product: Product;
  customerName?: string;
  customerPhone?: string;
}

export function InvoiceGenerator({ product, customerName, customerPhone }: InvoiceGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shop] = useState<ShopSettings>(DEFAULT_SHOP);
  const [buyer, setBuyer] = useState({
    name: customerName || product.customer_name || "",
    phone: customerPhone || "",
    address: ""
  });
  const invoiceRef = useRef<HTMLDivElement>(null);
  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
  const invoiceDate = format(new Date(), "dd/MM/yyyy");

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to generate PDF");
        return;
      }

      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff; }
            .invoice { max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
            .shop-name { font-size: 28px; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
            .shop-info { color: #666; font-size: 12px; line-height: 1.6; }
            .invoice-title { font-size: 24px; color: #333; text-align: right; }
            .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .party { width: 45%; }
            .party-title { font-weight: bold; color: #3b82f6; margin-bottom: 10px; font-size: 14px; }
            .party-info { color: #333; font-size: 13px; line-height: 1.6; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #3b82f6; color: #fff; padding: 12px; text-align: left; font-size: 13px; }
            .items-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .items-table tr:hover td { background: #f8fafc; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { display: flex; justify-content: flex-end; gap: 50px; padding: 8px 0; }
            .total-label { color: #666; }
            .total-value { font-weight: 600; min-width: 100px; text-align: right; }
            .grand-total { font-size: 18px; color: #3b82f6; border-top: 2px solid #3b82f6; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 11px; }
            .warranty { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #0369a1; }
            @media print { body { padding: 0; } .invoice { border: none; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div>
                <div class="shop-name">${shop.shop_name}</div>
                <div class="shop-info">
                  📍 ${shop.shop_address}<br>
                  📞 ${shop.shop_phone}<br>
                  ✉️ ${shop.shop_email}
                  ${shop.gst_number ? `<br>GST: ${shop.gst_number}` : ''}
                </div>
              </div>
              <div>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">
                  #${invoiceNumber}<br>
                  Date: ${invoiceDate}
                </div>
              </div>
            </div>

            <div class="parties">
              <div class="party">
                <div class="party-title">BILL TO:</div>
                <div class="party-info">
                  ${buyer.name || 'Cash Customer'}<br>
                  ${buyer.phone ? `📞 ${buyer.phone}` : ''}<br>
                  ${buyer.address || ''}
                </div>
              </div>
              <div class="party">
                <div class="party-title">DEVICE INFO:</div>
                <div class="party-info">
                  IMEI: ${product.imei || 'N/A'}<br>
                  Storage: ${product.storage || 'N/A'}<br>
                  Color: ${product.color || 'N/A'}<br>
                  Variant: ${product.country_variant || 'IN'}
                </div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th style="text-align: right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mobile Phone - ${product.brand} ${product.model}</td>
                  <td>${product.brand}</td>
                  <td>${product.model}</td>
                  <td style="text-align: right">₹${product.selling_price?.toLocaleString('en-IN') || 0}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">₹${product.selling_price?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Tax (0%):</span>
                <span class="total-value">₹0</span>
              </div>
              <div class="total-row grand-total">
                <span class="total-label">TOTAL:</span>
                <span class="total-value">₹${product.selling_price?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>

            <div class="warranty">
              <strong>Terms & Conditions:</strong><br>
              • All sales are final. No refunds or exchanges.<br>
              • Warranty as per manufacturer's policy.<br>
              • Please keep this invoice for warranty claims.
            </div>

            <div class="footer">
              Thank you for your business!<br>
              Generated by Stock Maker - ${format(new Date(), "PPpp")}
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success("Invoice generated successfully!");
    } catch (error) {
      toast.error("Failed to generate invoice");
      console.error(error);
    }
  };

  const shareOnWhatsApp = () => {
    const message = `
*${shop.shop_name}*
📍 ${shop.shop_address}
📞 ${shop.shop_phone}
✉️ ${shop.shop_email}

━━━━━━━━━━━━━━━━
*INVOICE #${invoiceNumber}*
Date: ${invoiceDate}
━━━━━━━━━━━━━━━━

*Device Details:*
📱 ${product.brand} ${product.model}
💾 Storage: ${product.storage || 'N/A'}
🎨 Color: ${product.color || 'N/A'}
🌍 Variant: ${product.country_variant || 'IN'}
🔢 IMEI: ${product.imei || 'N/A'}

*Customer:*
${buyer.name || 'Cash Customer'}
${buyer.phone ? `📞 ${buyer.phone}` : ''}

━━━━━━━━━━━━━━━━
*TOTAL: ₹${product.selling_price?.toLocaleString('en-IN') || 0}*
━━━━━━━━━━━━━━━━

Thank you for your purchase! 🙏
    `.trim();

    const whatsappUrl = `https://wa.me/${buyer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Opening WhatsApp...");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input 
                    placeholder="Customer Name"
                    value={buyer.name}
                    onChange={(e) => setBuyer({...buyer, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    placeholder="+91 XXXXXXXXXX"
                    value={buyer.phone}
                    onChange={(e) => setBuyer({...buyer, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input 
                  placeholder="Customer Address"
                  value={buyer.address}
                  onChange={(e) => setBuyer({...buyer, address: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Preview */}
          <Card ref={invoiceRef}>
            <CardContent className="p-4">
              {/* Shop Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-primary">
                <div>
                  <h2 className="text-xl font-bold text-primary">{shop.shop_name}</h2>
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {shop.shop_address}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {shop.shop_phone}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {shop.shop_email}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold">INVOICE</h3>
                  <p className="text-sm text-muted-foreground">#{invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">Date: {invoiceDate}</p>
                </div>
              </div>

              {/* Device Info */}
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-sm mb-2">Device Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Brand:</span> {product.brand}</div>
                  <div><span className="text-muted-foreground">Model:</span> {product.model}</div>
                  <div><span className="text-muted-foreground">Storage:</span> {product.storage || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Color:</span> {product.color || 'N/A'}</div>
                  <div><span className="text-muted-foreground">IMEI:</span> {product.imei || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Variant:</span> {product.country_variant || 'IN'}</div>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-bold">
                <span>TOTAL</span>
                <span className="text-primary">₹{product.selling_price?.toLocaleString('en-IN') || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={generatePDF} className="gap-2">
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
            <Button 
              variant="default" 
              onClick={shareOnWhatsApp}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Share2 className="h-4 w-4" />
              Share on WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
