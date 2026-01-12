import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TopBar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out");
    } else {
      toast.success("Logged out successfully");
      navigate("/");
    }
  };

  return (
    <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hover:bg-muted transition-colors rounded-xl" />
        <div className="hidden md:flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md animate-scale-in">
            <span className="text-white font-bold text-sm">SM</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Stock Maker
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Inventory Management</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl h-10 w-10 hover:bg-muted group"
            >
              <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
              {/* Notification badge */}
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive border-2 border-background">
                3
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
        
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <ThemeToggle />
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        
        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-xl h-10 w-10 hover:bg-destructive/10 hover:text-destructive group"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Logout</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
