import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Phone, Mail } from "lucide-react";
import { checkRiskyMerchants, Merchant } from "@/hooks/usePaymentUtils";
import { Skeleton } from "@/components/ui/skeleton";

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
      return { label: "High Risk", variant: "destructive" as const, className: "" };
    }
    if (overdueCount >= 3 || overdueAmount >= 20000) {
      return { label: "Medium Risk", variant: "secondary" as const, className: "bg-amber-500 text-white hover:bg-amber-600" };
    }
    return { label: "Low Risk", variant: "secondary" as const, className: "" };
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Risky Merchants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (riskyMerchants.length === 0) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-success">
            <AlertTriangle className="h-5 w-5" />
            Risky Merchants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-success/10 p-3 mb-3">
              <TrendingDown className="h-6 w-6 text-success" />
            </div>
            <p className="text-success font-medium">All Clear!</p>
            <p className="text-sm text-muted-foreground">No risky merchants found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Risky Merchants
          </span>
          <Badge variant="destructive" className="font-mono">
            {riskyMerchants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
        {riskyMerchants.map((merchant) => {
          const risk = getRiskLevel(merchant);
          return (
            <div
              key={merchant.id}
              className="rounded-lg border border-destructive/20 bg-background p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{merchant.name}</span>
                <Badge variant={risk.variant} className={risk.className}>{risk.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {merchant.overdueCount || 0} late payments
                </span>
                <span className="text-destructive font-medium">
                  ₹{(merchant.totalOverdueAmount || 0).toLocaleString("en-IN")} overdue
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {merchant.contact && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {merchant.contact}
                  </span>
                )}
                {merchant.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {merchant.email}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
