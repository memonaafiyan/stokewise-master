import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative rounded-xl h-10 w-10 hover:bg-muted overflow-hidden group",
        className
      )}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-500",
        isDark ? "bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20" : "bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20",
        "group-hover:opacity-100"
      )} />
      
      {/* Sun icon */}
      <Sun className={cn(
        "h-5 w-5 absolute transition-all duration-500 ease-out",
        isDark 
          ? "rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100 text-warning"
      )} />
      
      {/* Moon icon */}
      <Moon className={cn(
        "h-5 w-5 absolute transition-all duration-500 ease-out",
        isDark 
          ? "rotate-0 scale-100 opacity-100 text-primary" 
          : "-rotate-90 scale-0 opacity-0"
      )} />
      
      {/* Stars effect for dark mode */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-500",
        isDark ? "opacity-100" : "opacity-0"
      )}>
        <span className="absolute top-2 right-2 w-1 h-1 bg-primary/50 rounded-full animate-pulse" />
        <span className="absolute bottom-3 left-2 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse [animation-delay:200ms]" />
        <span className="absolute top-4 left-3 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse [animation-delay:400ms]" />
      </div>

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
