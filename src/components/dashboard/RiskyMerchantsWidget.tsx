import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Phone, Mail, CheckCircle2, ShieldAlert } from "lucide-react";
import { checkRiskyMerchants, Merchant } from "@/hooks/usePaymentUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RiskyMerchantsWidget() {
  const [riskyMerchants, setRiskyMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRiskyMerchants();
  }, []);

  const loadRiskyMerchants = async () => {
    try {
      setIsLoading(true);
      const merchants = await checkRiskyMerchants();
      setRiskyMerchants(merchants);
    } catch (error) {
      console.error("Failed to load risky merchants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevel = (merchant: Merchant) => {
    const overdueCount = merchant.overdueCount || 0;
    const overdueAmount = merchant.totalOverdueAmount || 0;

    if (overdueCount >= 5 || overdueAmount >= 50000) {
      return { 
        label: "High Risk", 
        variant: "destructive" as const, 
        className: "bg-gradient-danger text-white border-0",
        dotColor: "bg-destructive"
      };
    }
    if (overdueCount >= 3 || overdueAmount >= 20000) {
      return { 
        label: "Medium Risk", 
        variant: "secondary" as const, 
        className: "bg-gradient-warning text-white border-0",
        dotColor: "bg-warning"
      };
    }
    return { 
      label: "Low Risk", 
      variant: "secondary" as const, 
      className: "bg-primary/20 text-primary border-0",
      dotColor: "bg-primary"
    };
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1.5 bg-gradient-danger" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-destructive/10">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <span>Risky Merchants</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-muted/50 p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (riskyMerchants.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1.5 bg-gradient-success" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <span>Merchant Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-success/30 animate-pulse-glow" />
            </div>
            <h3 className="text-lg font-semibold text-success">All Clear!</h3>
            <p className="text-sm text-muted-foreground mt-1">No risky merchants detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1.5 bg-gradient-danger" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-destructive/10">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <span>Risky Merchants</span>
          </div>
          <Badge 
            variant="destructive" 
            className="font-mono text-sm px-3 py-1 bg-gradient-danger border-0"
          >
            {riskyMerchants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
        {riskyMerchants.map((merchant, index) => {
          const risk = getRiskLevel(merchant);
          return (
            <div
              key={merchant.id}
              className={cn(
                "rounded-xl border bg-card p-4 space-y-3 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", risk.dotColor)} />
                  <span className="font-semibold">{merchant.name}</span>
                </div>
                <Badge className={risk.className}>
                  {risk.label}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span>{merchant.overdueCount || 0} late payments</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-destructive">
                  <span>₹{(merchant.totalOverdueAmount || 0).toLocaleString("en-IN")}</span>
                  <span className="text-muted-foreground font-normal">overdue</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {merchant.contact && (
                  <a 
                    href={`tel:${merchant.contact}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {merchant.contact}
                  </a>
                )}
                {merchant.email && (
                  <a 
                    href={`mailto:${merchant.email}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {merchant.email}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
