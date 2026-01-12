import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Package, ShoppingCart, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { EmptyState } from "./EmptyState";

interface Product {
  id: string;
  brand?: string | null;
  model?: string | null;
  name?: string | null;
  sold?: boolean | null;
  sold_date?: string | null;
  created_at?: string;
  selling_price?: number | null;
  purchase_price?: number | null;
}

interface RecentActivityProps {
  products: Product[];
  isLoading?: boolean;
}

export function RecentActivity({ products, isLoading }: RecentActivityProps) {
  const recentItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: "added" | "sold";
      name: string;
      date: Date;
      profit?: number;
    }> = [];

    products.forEach(p => {
      if (p.created_at) {
        items.push({
          id: `added-${p.id}`,
          type: "added",
          name: p.brand && p.model ? `${p.brand} ${p.model}` : p.name || "Unknown",
          date: new Date(p.created_at),
        });
      }
      if (p.sold && p.sold_date) {
        items.push({
          id: `sold-${p.id}`,
          type: "sold",
          name: p.brand && p.model ? `${p.brand} ${p.model}` : p.name || "Unknown",
          date: new Date(p.sold_date),
          profit: (p.selling_price || 0) - (p.purchase_price || 0),
        });
      }
    });

    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }, [products]);

  if (isLoading) {
    return <WidgetSkeleton variant="list" />;
  }

  if (recentItems.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1.5 bg-gradient-info" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-info/10">
              <Activity className="h-5 w-5 text-info" />
            </div>
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="No Activity Yet"
            description="Your recent stock and sales activity will appear here"
            variant="info"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1.5 bg-gradient-info" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-info/10">
            <Activity className="h-5 w-5 text-info" />
          </div>
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
          {recentItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                "hover:bg-muted/50 hover:shadow-sm hover:-translate-y-0.5",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "p-2 rounded-xl shrink-0 transition-transform duration-300",
                item.type === "added" ? "bg-primary/10" : "bg-success/10"
              )}>
                {item.type === "added" ? (
                  <Package className="h-4 w-4 text-primary" />
                ) : (
                  <ShoppingCart className="h-4 w-4 text-success" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "shrink-0 text-xs",
                      item.type === "added" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-success/10 text-success"
                    )}
                  >
                    {item.type === "added" ? "Added" : "Sold"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(item.date, { addSuffix: true })}
                </p>
              </div>
              
              {item.profit !== undefined && (
                <div className="text-right shrink-0">
                  <p className={cn(
                    "font-semibold",
                    item.profit >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {item.profit >= 0 ? "+" : ""}₹{item.profit.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground">profit</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
