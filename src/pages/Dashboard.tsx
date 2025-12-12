import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, DollarSign, ShoppingCart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskyMerchantsWidget } from "@/components/dashboard/RiskyMerchantsWidget";
import { useProducts } from "@/hooks/useProducts";
import { StockForm } from "@/components/products/StockForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const { products, createProduct } = useProducts();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('dashboard-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // React Query handles refetching
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStock = products.filter(p => !p.sold).length;
    const soldToday = products.filter(p => p.sold && p.sold_date && isToday(new Date(p.sold_date))).length;
    const totalProfit = products.reduce((sum, p) => sum + (p.selling_price - p.purchase_price), 0);
    const todaysProfit = products
      .filter(p => p.sold && p.sold_date && isToday(new Date(p.sold_date)))
      .reduce((sum, p) => sum + (p.selling_price - p.purchase_price), 0);

    return {
      totalStock,
      soldToday,
      totalProfit,
      todaysProfit,
    };
  }, [products]);

  // Generate chart data for current month
  const chartData = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayProducts = products.filter(p => 
        p.created_at && isSameDay(new Date(p.created_at), day)
      );
      const daySales = products.filter(p => 
        p.sold && p.sold_date && isSameDay(new Date(p.sold_date), day)
      );
      
      return {
        date: format(day, "dd"),
        added: dayProducts.length,
        sold: daySales.length,
        profit: daySales.reduce((sum, p) => sum + (p.selling_price - p.purchase_price), 0),
      };
    });
  }, [products]);

  // Brand distribution data
  const brandData = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    products.forEach(p => {
      if (p.brand) {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }
    });
    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [products]);

  const handleQuickAdd = (values: any) => {
    createProduct.mutate(
      { ...values, created_by: userId },
      {
        onSuccess: () => {
          setIsQuickAddOpen(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <Button onClick={() => setIsQuickAddOpen(true)} size="lg" className="shadow-lg hover-scale gap-2">
          <Plus className="h-4 w-4" />
          Quick Add
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Stock"
          value={stats.totalStock.toString()}
          icon={Package}
          trend={`${products.length} total items`}
          trendUp={true}
          className="animate-scale-in"
        />
        <KPICard
          title="Today's Sales"
          value={stats.soldToday.toString()}
          icon={ShoppingCart}
          trend="devices sold today"
          trendUp={stats.soldToday > 0}
          className="animate-scale-in [animation-delay:100ms]"
        />
        <KPICard
          title="Total Profit"
          value={`₹${stats.totalProfit.toLocaleString()}`}
          icon={TrendingUp}
          trend="all time"
          trendUp={stats.totalProfit > 0}
          className="animate-scale-in [animation-delay:200ms]"
        />
        <KPICard
          title="Today's Profit"
          value={`₹${stats.todaysProfit.toLocaleString()}`}
          icon={DollarSign}
          trend="earned today"
          trendUp={stats.todaysProfit > 0}
          className="animate-scale-in [animation-delay:300ms]"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Sales & Profit Chart */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Area type="monotone" dataKey="added" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAdded)" name="Stock Added" />
                <Area type="monotone" dataKey="sold" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorProfit)" name="Stock Sold" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Brand Distribution */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Top Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="brand" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risky Merchants Widget */}
        <RiskyMerchantsWidget />
      </div>

      {/* Quick Actions */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/stock-entry")}>
              <Plus className="h-6 w-6 mb-2" />
              Add Stock
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/stock-list")}>
              <Package className="h-6 w-6 mb-2" />
              View Stock
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/reports")}>
              <TrendingUp className="h-6 w-6 mb-2" />
              Reports
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => setIsQuickAddOpen(true)}>
              <ShoppingCart className="h-6 w-6 mb-2" />
              Quick Sale
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Modal */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quick Add Stock Item
            </DialogTitle>
          </DialogHeader>
          <StockForm
            onSubmit={handleQuickAdd}
            onCancel={() => setIsQuickAddOpen(false)}
            isLoading={createProduct.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
