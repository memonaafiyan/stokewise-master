import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon, Package } from "lucide-react";
import { NoStockState } from "./EmptyState";
import { WidgetSkeleton } from "./WidgetSkeleton";

interface StatsOverviewProps {
  products: Array<{
    sold?: boolean | null;
    category?: string | null;
  }>;
  isLoading?: boolean;
  onAddStock?: () => void;
}

export function StatsOverview({ products, isLoading, onAddStock }: StatsOverviewProps) {
  const stockDistribution = useMemo(() => {
    const inStock = products.filter(p => !p.sold).length;
    const sold = products.filter(p => p.sold).length;
    
    return [
      { name: "In Stock", value: inStock, color: "hsl(var(--primary))" },
      { name: "Sold", value: sold, color: "hsl(var(--success))" },
    ];
  }, [products]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const colors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ];
    
    return Object.entries(categories)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [products]);

  const total = stockDistribution.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return <WidgetSkeleton variant="stats" />;
  }

  if (products.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1.5 bg-gradient-primary" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
            <span>Stock Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NoStockState onAddStock={onAddStock} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1.5 bg-gradient-primary" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <PieChartIcon className="h-5 w-5 text-primary" />
          </div>
          <span>Stock Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Stock Status Pie Chart */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Stock Status</h4>
            <div className="relative h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {stockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-lg)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center animate-scale-in">
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              {stockDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">By Category</h4>
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No categories yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryData.map((item, index) => (
                  <div key={index} className="space-y-1.5 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${(item.value / total) * 100}%`,
                          backgroundColor: item.color,
                          animationDelay: `${index * 100}ms`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
