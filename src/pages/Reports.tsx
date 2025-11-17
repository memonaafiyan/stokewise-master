import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { exportToExcel, formatSalesForExport, formatPaymentsForExport, formatInventoryForExport } from "@/lib/exportUtils";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Reports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Fetch sales data
  const { data: salesData } = useQuery({
    queryKey: ["sales-analytics", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, vyapari(*), products(*)")
        .gte("sale_date", startDate)
        .lte("sale_date", endDate)
        .order("sale_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment data
  const { data: paymentsData } = useQuery({
    queryKey: ["payments-analytics", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory data
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("quantity", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate analytics
  const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
  const totalCollected = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalOutstanding = salesData?.reduce((sum, sale) => sum + Number(sale.remaining_amount), 0) || 0;

  // Sales trend by date
  const salesTrend = salesData?.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.sale_date), "MMM dd");
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += Number(sale.total_amount);
    } else {
      acc.push({ date, amount: Number(sale.total_amount) });
    }
    return acc;
  }, []) || [];

  // Payment trend by date
  const paymentTrend = paymentsData?.reduce((acc: any[], payment) => {
    const date = format(new Date(payment.payment_date), "MMM dd");
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += Number(payment.amount);
    } else {
      acc.push({ date, amount: Number(payment.amount) });
    }
    return acc;
  }, []) || [];

  // Top customers
  const topCustomers = salesData?.reduce((acc: any[], sale) => {
    const existing = acc.find(item => item.name === sale.vyapari.name);
    if (existing) {
      existing.total += Number(sale.total_amount);
    } else {
      acc.push({ name: sale.vyapari.name, total: Number(sale.total_amount) });
    }
    return acc;
  }, [])
    .sort((a, b) => b.total - a.total)
    .slice(0, 5) || [];

  // Low stock products
  const lowStock = inventoryData?.filter(
    product => product.quantity <= (product.low_stock_threshold || 10)
  ) || [];

  // Product category distribution
  const categoryDistribution = inventoryData?.reduce((acc: any[], product) => {
    const existing = acc.find(item => item.category === product.category);
    if (existing) {
      existing.count += 1;
      existing.value += product.quantity * Number(product.unit_price);
    } else {
      acc.push({
        category: product.category,
        count: 1,
        value: product.quantity * Number(product.unit_price),
      });
    }
    return acc;
  }, []) || [];

  const exportReport = (reportType: string) => {
    let filename = "";

    switch (reportType) {
      case "stock":
        if (inventoryData) {
          const formattedData = formatInventoryForExport(inventoryData);
          exportToExcel(formattedData, `stock-report-${format(new Date(), "yyyy-MM-dd")}`);
        }
        break;
      case "udhari":
        if (salesData) {
          const udhariSales = salesData.filter(s => Number(s.remaining_amount) > 0);
          const formattedData = formatSalesForExport(udhariSales);
          exportToExcel(formattedData, `udhari-report-${format(new Date(), "yyyy-MM-dd")}`);
        }
        break;
      case "sales":
        if (salesData) {
          const formattedData = formatSalesForExport(salesData);
          exportToExcel(formattedData, `sales-report-${format(new Date(), "yyyy-MM-dd")}`);
        }
        break;
      case "payments":
        if (paymentsData) {
          const formattedData = formatPaymentsForExport(paymentsData);
          exportToExcel(formattedData, `payments-report-${format(new Date(), "yyyy-MM-dd")}`);
        }
        break;
      case "backup":
        const allData = [
          { Sheet: 'Sales', Data: salesData ? formatSalesForExport(salesData) : [] },
          { Sheet: 'Payments', Data: paymentsData ? formatPaymentsForExport(paymentsData) : [] },
          { Sheet: 'Inventory', Data: inventoryData ? formatInventoryForExport(inventoryData) : [] },
        ];
        exportToExcel(allData[0].Data, `full-backup-${format(new Date(), "yyyy-MM-dd")}`);
        break;
    }
    toast({ title: "Report exported to Excel successfully" });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Comprehensive business insights and reports
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalOutstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStock.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paymentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--success))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }} 
                />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Reports */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Stock Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export detailed inventory and stock valuation report
            </p>
            <Button className="gap-2 w-full" onClick={() => exportReport("stock")}>
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Udhari Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export customer credit and payment history report
            </p>
            <Button className="gap-2 w-full" onClick={() => exportReport("udhari")}>
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sales Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export comprehensive sales and revenue report
            </p>
            <Button className="gap-2 w-full" onClick={() => exportReport("sales")}>
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Full Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export complete database backup (JSON)
            </p>
            <Button className="gap-2 w-full" onClick={() => exportReport("backup")}>
              <Download className="h-4 w-4" />
              Download Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
