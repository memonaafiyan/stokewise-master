import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVyapariDetails, useVyapariTransactions } from "@/hooks/useVyapari";
import { CreditScoreBadge } from "./CreditScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Mail, Phone, MapPin, Calendar, DollarSign } from "lucide-react";

interface VyapariDetailsDialogProps {
  vyapariId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VyapariDetailsDialog({
  vyapariId,
  open,
  onOpenChange,
}: VyapariDetailsDialogProps) {
  const { data: vyapari, isLoading } = useVyapariDetails(vyapariId);
  const { data: transactions } = useVyapariTransactions(vyapariId);

  if (isLoading || !vyapari) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{vyapari.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{vyapari.contact}</span>
              </div>
              {vyapari.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{vyapari.email}</span>
                </div>
              )}
              {vyapari.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{vyapari.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credit Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditScoreBadge score={vyapari.credit_score} showIcon={false} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Purchased
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{vyapari.total_purchased.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{vyapari.total_paid.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Remaining Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ₹{vyapari.remaining_balance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{sale.products?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {sale.quantity} {sale.products?.unit} @ ₹{sale.rate}
                          </div>
                        </div>
                        <Badge
                          variant={
                            sale.payment_status === "paid"
                              ? "default"
                              : sale.payment_status === "partial"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {sale.payment_status}
                        </Badge>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(sale.sale_date), "dd MMM yyyy")}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Total: ₹{sale.total_amount.toLocaleString()}
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          Paid: ₹{sale.paid_amount.toLocaleString()}
                        </div>
                        <div className="text-orange-600 dark:text-orange-400">
                          Due: ₹{sale.remaining_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No transactions yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
