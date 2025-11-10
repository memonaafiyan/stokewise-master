import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CreditScoreBadgeProps {
  score: number;
  showIcon?: boolean;
}

export function CreditScoreBadge({ score, showIcon = true }: CreditScoreBadgeProps) {
  const getScoreColor = () => {
    if (score >= 80) return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    if (score >= 60) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  };

  const getIcon = () => {
    if (score >= 80) return <TrendingUp className="h-3 w-3" />;
    if (score >= 60) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  return (
    <Badge variant="outline" className={getScoreColor()}>
      {showIcon && getIcon()}
      <span className="ml-1">{score}</span>
    </Badge>
  );
}
