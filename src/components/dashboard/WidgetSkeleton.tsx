import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
  variant?: "kpi" | "chart" | "list" | "stats";
  className?: string;
}

export function WidgetSkeleton({ variant = "chart", className }: WidgetSkeletonProps) {
  if (variant === "kpi") {
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

  if (variant === "list") {
    return (
      <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
        <Skeleton className="h-1.5 w-full" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (variant === "stats") {
    return (
      <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
        <Skeleton className="h-1.5 w-full" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-[160px] w-full rounded-xl" />
              <div className="flex gap-4 justify-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default chart variant
  return (
    <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
      <Skeleton className="h-1.5 w-full" />
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] flex items-end gap-2 pt-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1 rounded-t-md" 
              style={{ height: `${Math.random() * 70 + 20}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
