import { LucideIcon, PackagePlus, ShoppingCart, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    ring: "ring-muted",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    ring: "ring-success/20",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    ring: "ring-warning/20",
  },
  info: {
    iconBg: "bg-info/10",
    iconColor: "text-info",
    ring: "ring-info/20",
  },
};

export function EmptyState({
  icon: Icon = Activity,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-10 text-center animate-fade-in",
      className
    )}>
      <div className={cn(
        "relative mb-4"
      )}>
        {/* Animated rings */}
        <div className={cn(
          "absolute inset-0 rounded-full ring-4 animate-ping opacity-20",
          styles.ring
        )} style={{ animationDuration: "3s" }} />
        <div className={cn(
          "absolute inset-0 rounded-full ring-2 animate-pulse opacity-30",
          styles.ring
        )} />
        
        {/* Icon container */}
        <div className={cn(
          "relative w-16 h-16 rounded-2xl flex items-center justify-center transition-transform hover:scale-110",
          styles.iconBg
        )}>
          <Icon className={cn("h-8 w-8", styles.iconColor)} />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[200px] mb-4">
        {description}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size="sm"
          className="gap-2 hover-lift"
        >
          <PackagePlus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states for common dashboard scenarios
export function NoStockState({ onAddStock }: { onAddStock?: () => void }) {
  return (
    <EmptyState
      icon={PackagePlus}
      title="No Stock Yet"
      description="Start by adding your first inventory item"
      action={onAddStock ? { label: "Add Stock", onClick: onAddStock } : undefined}
      variant="info"
    />
  );
}

export function NoSalesState() {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No Sales Yet"
      description="Sales will appear here once you start selling"
      variant="warning"
    />
  );
}

export function NoDataState() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No Data Available"
      description="Add inventory to see analytics"
      variant="default"
    />
  );
}
