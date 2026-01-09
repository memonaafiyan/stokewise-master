import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, DollarSign, ShoppingCart, Plus, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskyMerchantsWidget } from "@/components/dashboard/RiskyMerchantsWidget";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
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
  Legend,
} from "recharts";
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays } from "date-fns";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">Day {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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

    const channel = supabase
      .channel('dashboard-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {})
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStock = products.filter(p => !p.sold).length;
    const soldToday = products.filter(p => p.sold && p.sold_date && isToday(new Date(p.sold_date))).length;
    const totalProfit = products.reduce((sum, p) => sum + ((p.selling_price || 0) - (p.purchase_price || 0)), 0);
    const todaysProfit = products
      .filter(p => p.sold && p.sold_date && isToday(new Date(p.sold_date)))
      .reduce((sum, p) => sum + ((p.selling_price || 0) - (p.purchase_price || 0)), 0);

    // Calculate week over week change
    const lastWeekSold = products.filter(p => {
      if (!p.sold || !p.sold_date) return false;
      const soldDate = new Date(p.sold_date);
      const weekAgo = subDays(new Date(), 7);
      return soldDate >= weekAgo;
    }).length;

    return {
      totalStock,
      soldToday,
      totalProfit,
      todaysProfit,
      lastWeekSold,
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
        profit: daySales.reduce((sum, p) => sum + ((p.selling_price || 0) - (p.purchase_price || 0)), 0),
      };
    });
  }, [products]);

  // Brand distribution data
  const brandData = useMemo(() => {
    const brandCounts: Record<string, { count: number; revenue: number }> = {};
    products.forEach(p => {
      if (p.brand) {
        if (!brandCounts[p.brand]) {
          brandCounts[p.brand] = { count: 0, revenue: 0 };
        }
        brandCounts[p.brand].count += 1;
        if (p.sold) {
          brandCounts[p.brand].revenue += (p.selling_price || 0) - (p.purchase_price || 0);
        }
      }
    });
    return Object.entries(brandCounts)
      .map(([brand, data]) => ({ brand, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
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

  const quickActions = [
    { label: "Add Stock", icon: Plus, onClick: () => navigate("/stock-entry"), variant: "default" as const },
    { label: "View Stock", icon: Package, onClick: () => navigate("/stock-list"), variant: "outline" as const },
    { label: "Reports", icon: TrendingUp, onClick: () => navigate("/reports"), variant: "outline" as const },
    { label: "Quick Sale", icon: ShoppingCart, onClick: () => setIsQuickAddOpen(true), variant: "outline" as const },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Dashboard
            </h1>
            <Sparkles className="h-6 w-6 text-warning animate-bounce-soft" />
          </div>
          <p className="text-muted-foreground">
            Welcome back! Here's your business overview for {format(new Date(), "MMMM yyyy")}.
          </p>
        </div>
        <Button 
          onClick={() => setIsQuickAddOpen(true)} 
          size="lg" 
          className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          Quick Add Stock
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Stock"
          value={stats.totalStock.toString()}
          icon={Package}
          trend="items in inventory"
          trendUp={true}
          variant="primary"
          className="animate-scale-in"
        />
        <KPICard
          title="Today's Sales"
          value={stats.soldToday.toString()}
          icon={ShoppingCart}
          trend="devices sold"
          trendUp={stats.soldToday > 0}
          trendValue={stats.lastWeekSold > 0 ? `${stats.lastWeekSold} this week` : undefined}
          variant="success"
          className="animate-scale-in [animation-delay:100ms]"
        />
        <KPICard
          title="Total Profit"
          value={`₹${stats.totalProfit.toLocaleString("en-IN")}`}
          icon={TrendingUp}
          trend="all time earnings"
          trendUp={stats.totalProfit > 0}
          variant="warning"
          className="animate-scale-in [animation-delay:200ms]"
        />
        <KPICard
          title="Today's Profit"
          value={`₹${stats.todaysProfit.toLocaleString("en-IN")}`}
          icon={DollarSign}
          trend="earned today"
          trendUp={stats.todaysProfit > 0}
          variant={stats.todaysProfit > 0 ? "success" : "default"}
          className="animate-scale-in [animation-delay:300ms]"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Activity Chart - Spans 2 columns */}
        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-lg animate-fade-in [animation-delay:400ms]">
          <div className="h-1.5 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span>Monthly Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="added" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAdded)" 
                  name="Stock Added" 
                />
                <Area 
                  type="monotone" 
                  dataKey="sold" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSold)" 
                  name="Stock Sold" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="animate-fade-in [animation-delay:500ms]">
          <RecentActivity products={products} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Brands Chart */}
        <Card className="overflow-hidden border-0 shadow-lg animate-fade-in [animation-delay:600ms]">
          <div className="h-1.5 bg-gradient-warning" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-warning/10">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <span>Top Brands</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={brandData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  dataKey="brand" 
                  type="category" 
                  width={80} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 8, 8, 0]} 
                  name="Items"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Overview */}
        <div className="animate-fade-in [animation-delay:700ms]">
          <StatsOverview products={products} />
        </div>

        {/* Risky Merchants Widget */}
        <div className="animate-fade-in [animation-delay:800ms]">
          <RiskyMerchantsWidget />
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="overflow-hidden border-0 shadow-lg animate-fade-in [animation-delay:900ms]">
        <div className="h-1.5 bg-gradient-info" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-info/10">
              <Sparkles className="h-5 w-5 text-info" />
            </div>
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {quickActions.map((action, index) => (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-24 flex-col gap-2 hover-lift group relative overflow-hidden"
                onClick={action.onClick}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${
                  action.variant === "default" 
                    ? "bg-white/20" 
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="font-medium">{action.label}</span>
                <ArrowRight className="absolute right-3 top-3 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Modal */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
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
