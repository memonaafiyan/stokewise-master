import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "low_stock" | "overdue_payment";
  title: string;
  message: string;
  timestamp: Date;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    checkLowStock();
    checkOverduePayments();

    // Setup realtime listeners
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => checkLowStock()
      )
      .subscribe();

    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => checkOverduePayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  const checkLowStock = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("*");

    if (products && products.length > 0) {
      const lowStockProducts = products.filter(p => 
        p.quantity <= (p.low_stock_threshold || 10)
      );
      const lowStockNotifications = lowStockProducts.map(product => ({
        id: `low-stock-${product.id}`,
        type: "low_stock" as const,
        title: "Low Stock Alert",
        message: `${product.name} is running low (${product.quantity} ${product.unit} remaining)`,
        timestamp: new Date()
      }));

      setNotifications(prev => {
        const filtered = prev.filter(n => n.type !== "low_stock");
        return [...lowStockNotifications, ...filtered];
      });
      setUnreadCount(prev => prev + lowStockNotifications.length);

      if (lowStockNotifications.length > 0) {
        toast.warning(`${lowStockNotifications.length} products are low on stock`);
      }
    }
  };

  const checkOverduePayments = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueSales } = await supabase
      .from("sales")
      .select(`
        *,
        vyapari (name, contact)
      `)
      .in("payment_status", ["pending", "partial"])
      .lt("due_date", today);

    if (overdueSales && overdueSales.length > 0) {
      const overdueNotifications = overdueSales.map(sale => ({
        id: `overdue-${sale.id}`,
        type: "overdue_payment" as const,
        title: "Overdue Payment",
        message: `${sale.vyapari?.name} has an overdue payment of ₹${sale.remaining_amount}`,
        timestamp: new Date(sale.due_date)
      }));

      setNotifications(prev => {
        const filtered = prev.filter(n => n.type !== "overdue_payment");
        return [...overdueNotifications, ...filtered];
      });
      setUnreadCount(prev => prev + overdueNotifications.length);

      if (overdueNotifications.length > 0) {
        toast.error(`${overdueNotifications.length} payments are overdue`);
      }
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearNotifications}>
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notifications
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      notification.type === "low_stock" ? "bg-warning" : "bg-destructive"
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
