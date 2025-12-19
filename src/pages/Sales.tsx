import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingUp, DollarSign, Calendar, Search, Filter, Plus } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, isToday, isThisWeek, isThisMonth, addDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

interface Sale {
  id: string;
  product_id: string;
  vyapari_id: string;
  quantity: number;
  rate: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  sale_date: string;
  due_date: string;
  currency: string;
  notes: string | null;
  product?: { name: string; brand: string; model: string };
  vyapari?: { name: string; contact: string };
}

interface Product {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  quantity: number;
  purchase_price: number | null;
}

interface Vyapari {
  id: string;
  name: string;
  contact: string;
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vyaparis, setVyaparis] = useState<Vyapari[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sale form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVyapari, setSelectedVyapari] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchVyaparis();

    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(name, brand, model),
          vyapari:vyapari(name, contact)
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, model, quantity, purchase_price')
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchVyaparis = async () => {
    try {
      const { data, error } = await supabase
        .from('vyapari')
        .select('id, name, contact')
        .order('name', { ascending: true });

      if (error) throw error;
      setVyaparis(data || []);
    } catch (error) {
      console.error('Error fetching vyaparis:', error);
    }
  };

  const handleCreateSale = async () => {
    if (!selectedProduct || !selectedVyapari || !sellingPrice) {
      toast.error("Please fill all required fields");
      return;
    }

    const price = parseFloat(sellingPrice);
    const paid = parseFloat(paidAmount) || 0;
    const totalAmount = price * quantity;
    const remainingAmount = totalAmount - paid;

    if (paid > totalAmount) {
      toast.error("Paid amount cannot exceed total amount");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('sales').insert({
        product_id: selectedProduct,
        vyapari_id: selectedVyapari,
        quantity,
        rate: price,
        total_amount: totalAmount,
        paid_amount: paid,
        remaining_amount: remainingAmount,
        payment_status: paid >= totalAmount ? 'paid' : paid > 0 ? 'partial' : 'pending',
        due_date: dueDate,
        notes: notes || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Sale created successfully");
      setDialogOpen(false);
      resetForm();
      fetchSales();
      fetchProducts(); // Refresh products as stock may have changed
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast.error(error.message || "Failed to create sale");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct("");
    setSelectedVyapari("");
    setQuantity(1);
    setSellingPrice("");
    setPaidAmount("");
    setDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    setNotes("");
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const totalAmount = parseFloat(sellingPrice || "0") * quantity;

  // Calculate statistics
  const stats = useMemo(() => {
    const todaySales = sales.filter(s => isToday(new Date(s.sale_date)));
    const weekSales = sales.filter(s => isThisWeek(new Date(s.sale_date)));
    const monthSales = sales.filter(s => isThisMonth(new Date(s.sale_date)));

    return {
      totalSales: sales.length,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
      weekRevenue: weekSales.reduce((sum, s) => sum + s.total_amount, 0),
      monthRevenue: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
      totalRevenue: sales.reduce((sum, s) => sum + s.total_amount, 0),
      totalPending: sales.filter(s => s.payment_status !== 'paid').reduce((sum, s) => sum + s.remaining_amount, 0),
    };
  }, [sales]);

  // Chart data for last 7 days
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const daySales = sales.filter(s => 
        format(new Date(s.sale_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        date: format(date, 'dd MMM'),
        sales: daySales.length,
        revenue: daySales.reduce((sum, s) => sum + s.total_amount, 0),
      };
    });
  }, [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.vyapari?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || sale.payment_status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = isToday(new Date(sale.sale_date));
      else if (dateFilter === 'week') matchesDate = isThisWeek(new Date(sale.sale_date));
      else if (dateFilter === 'month') matchesDate = isThisMonth(new Date(sale.sale_date));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [sales, searchTerm, statusFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      partial: "secondary",
      pending: "outline",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header with Add Sale Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sales Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage all your sales transactions.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Sale</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 pt-4">
              {/* Select Product */}
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.brand} {product.model || product.name} (Stock: {product.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProductData && (
                  <p className="text-sm text-muted-foreground">
                    Purchase Price: ₹{selectedProductData.purchase_price?.toLocaleString() || 0}
                  </p>
                )}
              </div>

              {/* Select Vyapari */}
              <div className="space-y-2">
                <Label>Merchant (Vyapari) *</Label>
                <Select value={selectedVyapari} onValueChange={setSelectedVyapari}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {vyaparis.map((vyapari) => (
                      <SelectItem key={vyapari.id} value={vyapari.id}>
                        {vyapari.name} ({vyapari.contact})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Selling Price - 2 column on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProductData?.quantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (per unit) *</Label>
                  <Input
                    type="number"
                    placeholder="Enter price"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
              </div>

              {totalAmount > 0 && (
                <p className="text-sm font-medium text-primary">
                  Total: ₹{totalAmount.toLocaleString()}
                </p>
              )}

              {/* Paid Amount & Due Date - 2 column on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paid Amount</Label>
                  <Input
                    type="number"
                    placeholder="Amount paid now"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleCreateSale} 
                disabled={submitting || !selectedProduct || !selectedVyapari || !sellingPrice}
                className="w-full"
              >
                {submitting ? "Creating..." : "Create Sale"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Today's Sales"
          value={stats.todaySales.toString()}
          icon={ShoppingCart}
          trend={`₹${stats.todayRevenue.toLocaleString()} revenue`}
          trendUp={stats.todaySales > 0}
        />
        <KPICard
          title="This Week"
          value={`₹${stats.weekRevenue.toLocaleString()}`}
          icon={TrendingUp}
          trend="week revenue"
          trendUp={stats.weekRevenue > 0}
        />
        <KPICard
          title="This Month"
          value={`₹${stats.monthRevenue.toLocaleString()}`}
          icon={Calendar}
          trend="month revenue"
          trendUp={stats.monthRevenue > 0}
        />
        <KPICard
          title="Pending Amount"
          value={`₹${stats.totalPending.toLocaleString()}`}
          icon={DollarSign}
          trend="to be collected"
          trendUp={false}
        />
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Sales Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by merchant or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sales Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(sale.sale_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.vyapari?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{sale.vyapari?.contact}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.product?.name || sale.product?.model || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{sale.product?.brand}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{sale.quantity}</TableCell>
                      <TableCell className="text-right">₹{sale.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">₹{sale.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">₹{sale.remaining_amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(sale.payment_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
