import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePayments } from "@/hooks/usePayments";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");

  const { payments, outstandingSales, isLoading, createPayment } = usePayments();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();

    // Real-time subscription
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          // Refetch happens automatically via React Query
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOutstandingSales = outstandingSales.filter((sale: any) =>
    sale.vyapari?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.products?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter((payment) =>
    payment.vyapari?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = outstandingSales.reduce(
    (sum: number, sale: any) => sum + Number(sale.remaining_amount || 0),
    0
  );

  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const handleRecordPayment = (sale: any) => {
    setSelectedSale(sale);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (values: any) => {
    if (!selectedSale) return;

    createPayment.mutate(
      {
        sale_id: selectedSale.id,
        vyapari_id: selectedSale.vyapari_id,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        notes: values.notes,
        created_by: userId,
      },
      {
        onSuccess: () => {
          setIsPaymentDialogOpen(false);
          setSelectedSale(null);
        },
      }
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { variant: "secondary" as const, className: "bg-success/10 text-success border-success/20", label: "Paid" },
      partial: { variant: "secondary" as const, className: "bg-warning/10 text-warning border-warning/20", label: "Partial" },
      pending: { variant: "destructive" as const, className: "", label: "Pending" },
      overdue: { variant: "destructive" as const, className: "", label: "Overdue" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Collection</h2>
          <p className="text-muted-foreground mt-1">
            Record payments and track outstanding balances
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {outstandingSales.length} pending sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {payments.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Count</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outstandingSales.filter((s: any) => s.payment_status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Fully unpaid sales
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer or product..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="outstanding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding Sales</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredOutstandingSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No outstanding sales found." : "All payments collected!"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOutstandingSales.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sale.vyapari?.name}
                        </TableCell>
                        <TableCell>{sale.products?.name}</TableCell>
                        <TableCell>₹{Number(sale.total_amount).toLocaleString()}</TableCell>
                        <TableCell>₹{Number(sale.paid_amount).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          ₹{Number(sale.remaining_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(sale.payment_status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleRecordPayment(sale)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment records yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.vyapari?.name}
                        </TableCell>
                        <TableCell>{payment.sales?.products?.name}</TableCell>
                        <TableCell className="font-semibold">
                          ₹{Number(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method?.replace('_', ' ') || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Customer:</span> {selectedSale.vyapari?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Product:</span> {selectedSale.products?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Total Amount:</span> ₹{Number(selectedSale.total_amount).toLocaleString()}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Already Paid:</span> ₹{Number(selectedSale.paid_amount).toLocaleString()}
                </p>
                <p className="text-sm font-semibold text-destructive">
                  <span className="font-medium text-foreground">Outstanding:</span> ₹{Number(selectedSale.remaining_amount).toLocaleString()}
                </p>
              </div>
              <PaymentForm
                maxAmount={Number(selectedSale.remaining_amount)}
                onSubmit={handlePaymentSubmit}
                onCancel={() => {
                  setIsPaymentDialogOpen(false);
                  setSelectedSale(null);
                }}
                isLoading={createPayment.isPending}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
