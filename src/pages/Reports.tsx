import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from "date-fns";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Reports() {
  const { products, isLoading } = useProducts();

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.filter(p => !p.sold).length;
    const totalSold = products.filter(p => p.sold).length;
    const totalPurchaseValue = products.reduce((sum, p) => sum + p.purchase_price, 0);
    const totalSellingValue = products.reduce((sum, p) => sum + p.selling_price, 0);
    const totalProfit = totalSellingValue - totalPurchaseValue;
    const avgProfit = totalItems > 0 ? totalProfit / totalItems : 0;

    return {
      totalItems,
      totalStock,
      totalSold,
      totalPurchaseValue,
      totalSellingValue,
      totalProfit,
      avgProfit,
    };
  }, [products]);

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map(month => {
      const monthProducts = products.filter(p => 
        isSameMonth(new Date(p.created_at), month)
      );
      const soldProducts = products.filter(p => 
        p.sold && p.sold_date && isSameMonth(new Date(p.sold_date), month)
      );
      
      const sales = soldProducts.reduce((sum, p) => sum + p.selling_price, 0);
      const profit = soldProducts.reduce((sum, p) => sum + (p.selling_price - p.purchase_price), 0);
      
      return {
        month: format(month, "MMM"),
        items: monthProducts.length,
        sales,
        profit,
        sold: soldProducts.length,
      };
    });
  }, [products]);

  // Brand distribution
  const brandDistribution = useMemo(() => {
    const brands: Record<string, { count: number; profit: number }> = {};
    products.forEach(p => {
      if (!brands[p.brand]) {
        brands[p.brand] = { count: 0, profit: 0 };
      }
      brands[p.brand].count++;
      brands[p.brand].profit += (p.selling_price - p.purchase_price);
    });
    return Object.entries(brands)
      .map(([brand, data]) => ({ brand, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [products]);

  // Country distribution for pie chart
  const countryDistribution = useMemo(() => {
    const countries: Record<string, number> = {};
    products.forEach(p => {
      const country = p.country_variant || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });
    return Object.entries(countries)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // Export to Excel function
  const exportToExcel = (type: string) => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "inventory":
        data = products.map(p => ({
          Brand: p.brand,
          Model: p.model,
          Color: p.color || "",
          Storage: p.storage || "",
          Country: p.country_variant,
          IMEI: p.imei || "",
          "Purchase Price": p.purchase_price,
          "Selling Price": p.selling_price,
          Profit: p.selling_price - p.purchase_price,
          Status: p.sold ? "Sold" : "In Stock",
          "Date Added": format(new Date(p.created_at), "dd/MM/yyyy"),
        }));
        filename = `inventory-report-${format(new Date(), "yyyy-MM-dd")}`;
        break;

      case "sales":
        data = products.filter(p => p.sold).map(p => ({
          Brand: p.brand,
          Model: p.model,
          Color: p.color || "",
          Storage: p.storage || "",
          "Sold To": p.customer_name || "",
          "Purchase Price": p.purchase_price,
          "Selling Price": p.selling_price,
          Profit: p.selling_price - p.purchase_price,
          "Sale Date": p.sold_date ? format(new Date(p.sold_date), "dd/MM/yyyy") : "",
        }));
        filename = `sales-report-${format(new Date(), "yyyy-MM-dd")}`;
        break;

      case "profit":
        data = monthlyData.map(m => ({
          Month: m.month,
          "Items Added": m.items,
          "Items Sold": m.sold,
          "Total Sales": m.sales,
          "Total Profit": m.profit,
        }));
        filename = `profit-report-${format(new Date(), "yyyy-MM-dd")}`;
        break;

      case "full":
        data = products.map(p => ({
          ID: p.id,
          Brand: p.brand,
          Model: p.model,
          Color: p.color || "",
          Storage: p.storage || "",
          Country: p.country_variant,
          IMEI: p.imei || "",
          "Purchase Price": p.purchase_price,
          "Selling Price": p.selling_price,
          Profit: p.selling_price - p.purchase_price,
          Customer: p.customer_name || "",
          Notes: p.notes || "",
          Status: p.sold ? "Sold" : "In Stock",
          "Date Added": format(new Date(p.created_at), "dd/MM/yyyy"),
          "Sale Date": p.sold_date ? format(new Date(p.sold_date), "dd/MM/yyyy") : "",
        }));
        filename = `full-backup-${format(new Date(), "yyyy-MM-dd")}`;
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    toast({ title: "Report exported successfully!" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Comprehensive business insights from your data
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">{stats.totalStock} in stock, {stats.totalSold} sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalSellingValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">from {stats.totalSold} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₹{stats.totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">₹{stats.avgProfit.toFixed(0)} avg per item</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalPurchaseValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">total purchase value</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Monthly Sales & Profit */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales & Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }} 
                />
                <Legend />
                <Bar dataKey="sales" name="Sales (₹)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit (₹)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Items Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Items Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="items" name="Added" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="sold" name="Sold" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Brand Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brandDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="brand" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }} 
                />
                <Legend />
                <Bar dataKey="count" name="Items" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" name="Profit (₹)" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Country Variant Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {countryDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Reports */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              Inventory Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all stock items with details
            </p>
            <Button className="gap-2 w-full" onClick={() => exportToExcel("inventory")}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              Sales Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all sold items with profit
            </p>
            <Button className="gap-2 w-full" onClick={() => exportToExcel("sales")}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Profit Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Monthly profit analysis
            </p>
            <Button className="gap-2 w-full" onClick={() => exportToExcel("profit")}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Full Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Complete data export
            </p>
            <Button className="gap-2 w-full" onClick={() => exportToExcel("full")}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
