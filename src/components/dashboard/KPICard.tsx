import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function KPICard({ title, value, icon: Icon, trend, trendUp, className }: KPICardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <div className={cn(
                "text-sm font-medium flex items-center gap-1",
                trendUp ? "text-success" : "text-destructive"
              )}>
                <span>{trendUp ? "↑" : "↓"}</span>
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
