import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, TrendingUp, AlertCircle, DollarSign, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { formatCurrency } from "@/components/currency/CurrencySelector";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalProfit: 0,
    totalOutstanding: 0,
    lowStockCount: 0,
    activeVyapari: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();

    const salesChannel = supabase
      .channel('dashboard-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const productsChannel = supabase
      .channel('dashboard-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    const { data: products } = await supabase.from("products").select("*");
    const { data: sales } = await supabase.from("sales").select("*, products(unit_price)");
    const { data: vyapari } = await supabase.from("vyapari").select("*");

    if (products && sales && vyapari) {
      const totalProducts = products.reduce((sum, p) => sum + p.quantity, 0);
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalCost = sales.reduce((sum, s) => {
        const costPrice = s.products?.unit_price || 0;
        return sum + (Number(costPrice) * s.quantity);
      }, 0);
      const totalProfit = totalSales - totalCost;
      const totalOutstanding = sales.reduce((sum, s) => sum + Number(s.remaining_amount), 0);
      const lowStockCount = products.filter(p => p.quantity <= (p.low_stock_threshold || 10)).length;

      setStats({
        totalProducts,
        totalSales,
        totalProfit,
        totalOutstanding,
        lowStockCount,
        activeVyapari: vyapari.length,
      });

      const monthlyData = sales.reduce((acc: any, sale) => {
        const month = new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short' });
        const existing = acc.find((d: any) => d.month === month);
        if (existing) {
          existing.sales += Number(sale.total_amount);
          existing.profit += Number(sale.total_amount) - (Number(sale.products?.unit_price || 0) * sale.quantity);
        } else {
          acc.push({
            month,
            sales: Number(sale.total_amount),
            profit: Number(sale.total_amount) - (Number(sale.products?.unit_price || 0) * sale.quantity),
          });
        }
        return acc;
      }, []);

      setSalesData(monthlyData);
    }
  };

  const productDistribution = [
    { name: "In Stock", value: stats.totalProducts - stats.lowStockCount, color: "hsl(var(--chart-1))" },
    { name: "Low Stock", value: stats.lowStockCount, color: "hsl(var(--warning))" },
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <Button onClick={() => navigate("/sales")} size="lg" className="shadow-lg hover-scale">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Quick Sale
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          trend="12.5%"
          trendUp={true}
        />
        <KPICard
          title="Today's Sales"
          value={formatCurrency(stats.totalSales, "INR")}
          icon={DollarSign}
          trend="8.2%"
          trendUp={true}
        />
        <KPICard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit, "INR")}
          icon={TrendingUp}
          trend="23.1%"
          trendUp={true}
        />
        <KPICard
          title="Outstanding"
          value={formatCurrency(stats.totalOutstanding, "INR")}
          icon={AlertCircle}
          trend="4.3%"
          trendUp={false}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Sales & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Stock Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/products")}>
              <Package className="h-6 w-6 mb-2" />
              Manage Products
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/sales")}>
              <ShoppingCart className="h-6 w-6 mb-2" />
              View Sales
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/vyapari")}>
              <Users className="h-6 w-6 mb-2" />
              Manage Vyapari
            </Button>
            <Button variant="outline" className="h-20 flex-col hover-scale" onClick={() => navigate("/reports")}>
              <TrendingUp className="h-6 w-6 mb-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
