import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  trendValue?: string;
  className?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

const variantStyles = {
  default: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    glow: "",
  },
  primary: {
    iconBg: "bg-gradient-primary",
    iconColor: "text-white",
    glow: "glow-primary",
  },
  success: {
    iconBg: "bg-gradient-success",
    iconColor: "text-white",
    glow: "glow-success",
  },
  warning: {
    iconBg: "bg-gradient-warning",
    iconColor: "text-white",
    glow: "glow-warning",
  },
  danger: {
    iconBg: "bg-gradient-danger",
    iconColor: "text-white",
    glow: "glow-danger",
  },
};

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  trendValue,
  className,
  variant = "default",
  isLoading = false
}: KPICardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card className={cn(
        "overflow-hidden border-0 shadow-md animate-pulse",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
          </div>
        </CardContent>
        <Skeleton className="h-1 w-full" />
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover-lift border-0 shadow-md group",
      "bg-card/80 backdrop-blur-sm",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              {title}
            </p>
            <p className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text transition-transform duration-300 group-hover:scale-105 origin-left">
              {value}
            </p>
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full transition-all duration-300",
                trendUp 
                  ? "bg-success/10 text-success" 
                  : "bg-destructive/10 text-destructive"
              )}>
                {trendUp ? (
                  <TrendingUp className="h-3.5 w-3.5 animate-bounce-soft" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trendValue && <span className="font-semibold">{trendValue}</span>}
                <span className="opacity-80">{trend}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-2xl shrink-0 transition-all duration-300",
            styles.iconBg,
            styles.glow,
            "group-hover:scale-110 group-hover:rotate-3"
          )}>
            <Icon className={cn("h-7 w-7 transition-transform duration-300", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
      
      {/* Decorative gradient line */}
      <div className={cn(
        "h-1 w-full transition-all duration-300 group-hover:h-1.5",
        variant === "default" ? "bg-gradient-primary" : `bg-gradient-${variant === "danger" ? "danger" : variant}`
      )} style={{
        background: variant === "primary" ? "var(--gradient-primary)" :
                   variant === "success" ? "var(--gradient-success)" :
                   variant === "warning" ? "var(--gradient-warning)" :
                   variant === "danger" ? "var(--gradient-danger)" :
                   "var(--gradient-primary)"
      }} />
    </Card>
  );
}

export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-md animate-pulse", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        </div>
      </CardContent>
      <Skeleton className="h-1 w-full" />
    </Card>
  );
}
