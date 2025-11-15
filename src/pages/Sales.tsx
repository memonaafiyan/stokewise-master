import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Package, User, IndianRupee } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { SaleForm } from "@/components/sales/SaleForm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { sales, isLoading, createSale } = useSales();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("sales-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          // Refetch will happen automatically via React Query
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSales = sales.filter((sale) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      sale.vyapari?.name.toLowerCase().includes(searchLower) ||
      sale.products?.name.toLowerCase().includes(searchLower) ||
      sale.payment_status.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateSale = async (values: any) => {
    await createSale.mutateAsync({
      ...values,
      sale_date: new Date().toISOString(),
      created_by: userId,
    });
    setIsAddDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      partial: "secondary",
      pending: "outline",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalPaid = sales.reduce((sum, sale) => sum + sale.paid_amount, 0);
  const totalOutstanding = sales.reduce((sum, sale) => sum + sale.remaining_amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales & Udhari</h2>
          <p className="text-muted-foreground mt-1">
            Record sales and manage credit payments
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Sale
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{sales.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Payments received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding (Udhari)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Credit pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Sales</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sales found. Click "New Sale" to record your first transaction.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Udhari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(sale.sale_date), "dd MMM yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{sale.vyapari?.name}</p>
                          <p className="text-xs text-muted-foreground">{sale.vyapari?.contact}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{sale.products?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {sale.quantity} {sale.products?.unit}
                    </TableCell>
                    <TableCell className="text-right">₹{sale.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{sale.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{sale.paid_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      ₹{sale.remaining_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale.payment_status)}</TableCell>
                    <TableCell>{format(new Date(sale.due_date), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Sale Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
          </DialogHeader>
          <SaleForm
            onSubmit={handleCreateSale}
            onCancel={() => setIsAddDialogOpen(false)}
            isLoading={createSale.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
