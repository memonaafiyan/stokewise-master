import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Bell, Package, Users, Clock, TrendingDown, Mail, MessageSquare } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { usePaymentUtils } from "@/hooks/usePaymentUtils";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, differenceInDays } from "date-fns";

interface RiskyMerchant {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  total_purchased: number;
  total_paid: number;
  remaining_balance: number;
  credit_score: number;
  overdueCount?: number;
  totalOverdueAmount?: number;
}

interface OverdueSale {
  id: string;
  vyapari_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  sale_date: string;
  vyapari?: { name: string; contact: string; email: string | null };
  product?: { name: string; brand: string; model: string };
}

interface LowStockProduct {
  id: string;
  name: string;
  brand: string;
  model: string;
  quantity: number;
  low_stock_threshold: number;
}

export default function Alerts() {
  const [riskyMerchants, setRiskyMerchants] = useState<RiskyMerchant[]>([]);
  const [overdueSales, setOverdueSales] = useState<OverdueSale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { checkRiskyMerchants, sendEmailReminder, sendWhatsAppReminder } = usePaymentUtils();
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchAlerts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      // Fetch risky merchants
      const riskyData = await checkRiskyMerchants();
      setRiskyMerchants(riskyData);

      // Fetch overdue sales
      const { data: overdueData, error: overdueError } = await supabase
        .from('sales')
        .select(`
          *,
          vyapari:vyapari(name, contact, email),
          product:products(name, brand, model)
        `)
        .neq('payment_status', 'paid')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (overdueError) throw overdueError;
      setOverdueSales(overdueData || []);

      // Fetch low stock products
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('products')
        .select('id, name, brand, model, quantity, low_stock_threshold')
        .eq('sold', false)
        .order('quantity', { ascending: true });

      if (lowStockError) throw lowStockError;
      
      const lowStock = (lowStockData || []).filter(p => 
        p.quantity <= (p.low_stock_threshold || 10)
      );
      setLowStockProducts(lowStock);

    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOverdueAmount = overdueSales.reduce((sum, s) => sum + s.remaining_amount, 0);
    const criticalOverdue = overdueSales.filter(s => differenceInDays(new Date(), new Date(s.due_date)) > 30);
    
    return {
      riskyMerchantsCount: riskyMerchants.length,
      overdueCount: overdueSales.length,
      totalOverdueAmount,
      criticalOverdueCount: criticalOverdue.length,
      lowStockCount: lowStockProducts.length,
      totalAlerts: riskyMerchants.length + overdueSales.length + lowStockProducts.length,
    };
  }, [riskyMerchants, overdueSales, lowStockProducts]);

  const handleSendEmail = async (sale: OverdueSale) => {
    if (!sale.vyapari?.email) {
      toast({ title: "No email", description: "Merchant doesn't have an email address", variant: "destructive" });
      return;
    }

    setSendingReminder(sale.id);
    try {
      const merchant = {
        id: sale.vyapari_id,
        name: sale.vyapari.name,
        contact: sale.vyapari.contact,
        email: sale.vyapari.email,
        total_purchased: sale.total_amount,
        total_paid: sale.paid_amount,
        remaining_balance: sale.remaining_amount,
        credit_score: 100,
      };
      
      const success = await sendEmailReminder(merchant, sale.remaining_amount, sale.due_date);
      if (success) {
        toast({ title: "Email sent", description: `Reminder sent to ${sale.vyapari.email}` });
      } else {
        toast({ title: "Failed", description: "Could not send email reminder", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendWhatsApp = async (sale: OverdueSale) => {
    if (!sale.vyapari?.contact) {
      toast({ title: "No phone", description: "Merchant doesn't have a phone number", variant: "destructive" });
      return;
    }

    const merchant = {
      id: sale.vyapari_id,
      name: sale.vyapari.name,
      contact: sale.vyapari.contact,
      email: sale.vyapari.email || null,
      total_purchased: sale.total_amount,
      total_paid: sale.paid_amount,
      remaining_balance: sale.remaining_amount,
      credit_score: 100,
    };
    
    const whatsappUrl = await sendWhatsAppReminder(merchant, sale.remaining_amount, sale.due_date);
    window.open(whatsappUrl, '_blank');
    toast({ title: "WhatsApp opened", description: "Send the reminder message" });
  };

  const getDaysOverdue = (dueDate: string) => {
    const days = differenceInDays(new Date(), new Date(dueDate));
    if (days > 30) return <Badge variant="destructive">{days} days overdue</Badge>;
    if (days > 14) return <Badge variant="secondary">{days} days overdue</Badge>;
    return <Badge variant="outline">{days} days overdue</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Alerts Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Monitor risky merchants, overdue payments, and low stock alerts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Alerts"
          value={stats.totalAlerts.toString()}
          icon={Bell}
          trend="items need attention"
          trendUp={false}
        />
        <KPICard
          title="Risky Merchants"
          value={stats.riskyMerchantsCount.toString()}
          icon={Users}
          trend="repeated late payments"
          trendUp={false}
        />
        <KPICard
          title="Overdue Payments"
          value={stats.overdueCount.toString()}
          icon={Clock}
          trend={`₹${stats.totalOverdueAmount.toLocaleString()} pending`}
          trendUp={false}
        />
        <KPICard
          title="Low Stock"
          value={stats.lowStockCount.toString()}
          icon={Package}
          trend="items need restocking"
          trendUp={false}
        />
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="risky" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="risky" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risky Merchants ({riskyMerchants.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Overdue ({overdueSales.length})
          </TabsTrigger>
          <TabsTrigger value="lowstock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Low Stock ({lowStockProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* Risky Merchants Tab */}
        <TabsContent value="risky">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Risky Merchants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskyMerchants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No risky merchants found. All merchants are in good standing!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Total Purchased</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead className="text-center">Overdue Count</TableHead>
                        <TableHead className="text-center">Credit Score</TableHead>
                        <TableHead>Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskyMerchants.map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{merchant.contact}</div>
                            <div className="text-xs text-muted-foreground">{merchant.email || 'No email'}</div>
                          </TableCell>
                          <TableCell className="text-right">₹{merchant.total_purchased.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            ₹{merchant.remaining_balance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">{merchant.overdueCount || 0}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={merchant.credit_score < 50 ? "destructive" : "secondary"}>
                              {merchant.credit_score}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(merchant.totalOverdueAmount || 0) > 50000 || (merchant.overdueCount || 0) >= 5 ? (
                              <Badge variant="destructive">High Risk</Badge>
                            ) : (
                              <Badge variant="secondary">Medium Risk</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Payments Tab */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                Overdue Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No overdue payments. All payments are up to date!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div className="font-medium">{sale.vyapari?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{sale.vyapari?.contact}</div>
                          </TableCell>
                          <TableCell>
                            <div>{sale.product?.name || sale.product?.model || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{sale.product?.brand}</div>
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            ₹{sale.remaining_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(sale.due_date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{getDaysOverdue(sale.due_date)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendEmail(sale)}
                                disabled={sendingReminder === sale.id || !sale.vyapari?.email}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendWhatsApp(sale)}
                                disabled={!sale.vyapari?.contact}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="lowstock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <TrendingDown className="h-5 w-5" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All products are well stocked!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-center">Current Stock</TableHead>
                        <TableHead className="text-center">Threshold</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name || product.model || 'N/A'}</TableCell>
                          <TableCell>{product.brand || 'N/A'}</TableCell>
                          <TableCell className="text-center">
                            <span className={product.quantity === 0 ? "text-red-600 font-bold" : "text-amber-600"}>
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{product.low_stock_threshold || 10}</TableCell>
                          <TableCell>
                            {product.quantity === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : product.quantity <= 5 ? (
                              <Badge variant="destructive">Critical</Badge>
                            ) : (
                              <Badge variant="secondary">Low</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
