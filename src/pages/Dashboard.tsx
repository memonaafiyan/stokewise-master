import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, TrendingUp, AlertCircle } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const statsData = [
  {
    title: "Total Stock Value",
    value: "₹2,45,680",
    icon: Package,
    trend: "+12.5%",
    color: "text-chart-1",
  },
  {
    title: "Total Udhari",
    value: "₹85,420",
    icon: AlertCircle,
    trend: "-8.2%",
    color: "text-chart-2",
  },
  {
    title: "Total Received",
    value: "₹1,92,340",
    icon: TrendingUp,
    trend: "+23.1%",
    color: "text-success",
  },
  {
    title: "Active Vyapari",
    value: "48",
    icon: Users,
    trend: "+4",
    color: "text-chart-3",
  },
];

const monthlyData = [
  { month: "Jan", udhari: 45000, paid: 38000 },
  { month: "Feb", udhari: 52000, paid: 42000 },
  { month: "Mar", udhari: 48000, paid: 51000 },
  { month: "Apr", udhari: 61000, paid: 58000 },
  { month: "May", udhari: 55000, paid: 62000 },
  { month: "Jun", udhari: 67000, paid: 71000 },
];

const topVyapari = [
  { name: "Rajesh Trading", amount: 15420, status: "risky" },
  { name: "Kumar Stores", amount: 12800, status: "average" },
  { name: "Sharma & Co", amount: 10500, status: "excellent" },
  { name: "Patel Wholesale", amount: 9200, status: "average" },
  { name: "Singh Bros", amount: 8100, status: "risky" },
];

const topProducts = [
  { name: "Product A", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Product B", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Product C", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Product D", value: 12, color: "hsl(var(--chart-4))" },
  { name: "Others", value: 8, color: "hsl(var(--chart-5))" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "excellent":
      return "text-success";
    case "average":
      return "text-warning";
    case "risky":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "excellent":
      return "bg-success/10 text-success";
    case "average":
      return "bg-warning/10 text-warning";
    case "risky":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your business metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs mt-1 ${stat.color}`}>{stat.trend} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Udhari vs Paid Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Udhari vs Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorUdhari" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="udhari"
                  stroke="hsl(var(--chart-1))"
                  fillOpacity={1}
                  fill="url(#colorUdhari)"
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  stroke="hsl(var(--success))"
                  fillOpacity={1}
                  fill="url(#colorPaid)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {product.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Risky Vyapari */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Risky Vyapari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topVyapari.map((vyapari, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{vyapari.name}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(
                        vyapari.status
                      )}`}
                    >
                      {vyapari.status}
                    </span>
                  </div>
                </div>
                <p className={`font-bold ${getStatusColor(vyapari.status)}`}>
                  ₹{vyapari.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
