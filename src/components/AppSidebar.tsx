import { Home, PackagePlus, Package, Wallet, BarChart3, LogOut, Settings, ShoppingCart, Bell, Users, Sparkles } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home, color: "text-primary" },
  { title: "Stock Entry", url: "/stock-entry", icon: PackagePlus, color: "text-success" },
  { title: "Stock List", url: "/stock-list", icon: Package, color: "text-info" },
  { title: "Sales", url: "/sales", icon: ShoppingCart, color: "text-warning" },
  { title: "Merchants", url: "/merchants", icon: Users, color: "text-purple-500" },
  { title: "Payments", url: "/payments", icon: Wallet, color: "text-emerald-500" },
  { title: "Alerts", url: "/alerts", icon: Bell, color: "text-destructive" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "text-cyan-500" },
  { title: "Settings", url: "/settings", icon: Settings, color: "text-muted-foreground" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const MenuItemContent = ({ item, isActive }: { item: typeof menuItems[0], isActive: boolean }) => (
    <>
      <div className={cn(
        "relative flex items-center justify-center",
        "transition-all duration-300"
      )}>
        {/* Icon glow effect when active */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 rounded-lg blur-sm opacity-50",
            item.color.replace("text-", "bg-")
          )} />
        )}
        <item.icon className={cn(
          "h-4 w-4 relative z-10 transition-all duration-300",
          isActive ? item.color : "text-muted-foreground group-hover:" + item.color
        )} />
      </div>
      {open && (
        <span className={cn(
          "transition-all duration-200",
          isActive ? "translate-x-1" : "group-hover:translate-x-1"
        )}>
          {item.title}
        </span>
      )}
      
      {/* Active indicator line */}
      {isActive && (
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-300",
          item.color.replace("text-", "bg-")
        )} />
      )}
    </>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-card/50 backdrop-blur-md">
      <SidebarContent className="py-2">
        {/* Logo Section */}
        <div className={cn(
          "px-4 py-3 mb-2 flex items-center gap-3",
          !open && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="font-bold text-lg tracking-tight">StockMaker</h2>
              <p className="text-xs text-muted-foreground -mt-0.5">Pro Edition</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wider text-muted-foreground/70 px-4",
            !open && "sr-only"
          )}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "relative group flex items-center gap-3 px-3 py-2.5 rounded-xl",
                              "transition-all duration-300 ease-out",
                              isActive
                                ? "bg-primary/10 font-medium shadow-sm"
                                : "hover:bg-muted/80 hover:shadow-sm"
                            )}
                          >
                            <MenuItemContent item={item} isActive={isActive} />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {!open && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton 
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                        "transition-all duration-300 ease-out",
                        "hover:bg-destructive/10 hover:text-destructive hover:shadow-sm"
                      )}
                      onClick={handleLogout}
                    >
                      <div className="relative flex items-center justify-center">
                        <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                      </div>
                      {open && (
                        <span className="transition-all duration-200 group-hover:-translate-x-0.5">
                          Logout
                        </span>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {!open && (
                    <TooltipContent side="right" className="font-medium">
                      Logout
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
