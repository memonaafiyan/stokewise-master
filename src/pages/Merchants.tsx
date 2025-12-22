import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Merchant {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  address: string | null;
  total_purchased: number;
  total_paid: number;
  remaining_balance: number;
  credit_score: number;
  last_transaction_date: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  product_id: string;
  quantity: number;
  rate: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_status: string;
  sale_date: string;
  products?: {
    brand: string | null;
    model: string | null;
  };
}

const merchantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contact: z.string().min(10, "Valid phone number required").max(15),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

type MerchantFormValues = z.infer<typeof merchantSchema>;

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<Merchant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<string | null>(null);

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      name: "",
      contact: "",
      email: "",
      address: "",
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("vyapari")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error("Failed to load merchants:", error);
      toast.error("Failed to load merchants");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (merchantId: string) => {
    if (transactions[merchantId]) {
      // Already loaded
      return;
    }

    setLoadingTransactions(merchantId);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(brand, model)")
        .eq("vyapari_id", merchantId)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      setTransactions(prev => ({ ...prev, [merchantId]: data || [] }));
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoadingTransactions(null);
    }
  };

  const toggleExpanded = async (merchantId: string) => {
    if (expandedMerchant === merchantId) {
      setExpandedMerchant(null);
    } else {
      setExpandedMerchant(merchantId);
      await loadTransactions(merchantId);
    }
  };

  const openAddDialog = () => {
    setEditingMerchant(null);
    form.reset({ name: "", contact: "", email: "", address: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    form.reset({
      name: merchant.name,
      contact: merchant.contact,
      email: merchant.email || "",
      address: merchant.address || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (merchant: Merchant) => {
    setMerchantToDelete(merchant);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!merchantToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("vyapari")
        .delete()
        .eq("id", merchantToDelete.id);

      if (error) throw error;
      toast.success("Merchant deleted successfully");
      setDeleteDialogOpen(false);
      setMerchantToDelete(null);
      loadMerchants();
    } catch (error: any) {
      console.error("Failed to delete merchant:", error);
      if (error.message?.includes("violates foreign key")) {
        toast.error("Cannot delete merchant with existing sales. Please delete sales first.");
      } else {
        toast.error("Failed to delete merchant: " + error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (values: MerchantFormValues) => {
    try {
      if (editingMerchant) {
        const { error } = await supabase
          .from("vyapari")
          .update({
            name: values.name,
            contact: values.contact,
            email: values.email || null,
            address: values.address || null,
          })
          .eq("id", editingMerchant.id);

        if (error) throw error;
        toast.success("Merchant updated successfully");
      } else {
        const { error } = await supabase.from("vyapari").insert({
          name: values.name,
          contact: values.contact,
          email: values.email || null,
          address: values.address || null,
          created_by: userId,
        });

        if (error) throw error;
        toast.success("Merchant added successfully");
      }
      setIsDialogOpen(false);
      loadMerchants();
    } catch (error: any) {
      console.error("Failed to save merchant:", error);
      toast.error("Failed to save merchant: " + error.message);
    }
  };

  const getCreditScoreBadge = (score: number) => {
    if (score >= 80) {
      return <Badge variant="secondary" className="bg-emerald-500 text-white">Excellent ({score})</Badge>;
    }
    if (score >= 60) {
      return <Badge variant="secondary" className="bg-amber-500 text-white">Good ({score})</Badge>;
    }
    return <Badge variant="destructive">Poor ({score})</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500 text-white">Paid</Badge>;
      case "partial":
        return <Badge className="bg-amber-500 text-white">Partial</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredMerchants = merchants.filter((merchant) =>
    merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.contact.includes(searchTerm) ||
    merchant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: merchants.length,
    totalBalance: merchants.reduce((sum, m) => sum + Number(m.remaining_balance), 0),
    totalPurchased: merchants.reduce((sum, m) => sum + Number(m.total_purchased), 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Merchants (Vyapari)</h1>
          <p className="text-muted-foreground mt-1">Manage your merchant/customer database</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" />
          Add Merchant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Merchants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              ₹{stats.totalPurchased.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">Total Purchased</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">
              ₹{stats.totalBalance.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadMerchants}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Total Purchased</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Total Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden lg:table-cell">Credit Score</TableHead>
                    <TableHead className="hidden xl:table-cell">Last Transaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerchants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No merchants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMerchants.map((merchant) => (
                      <Collapsible
                        key={merchant.id}
                        open={expandedMerchant === merchant.id}
                        onOpenChange={() => toggleExpanded(merchant.id)}
                        asChild
                      >
                        <>
                          <TableRow className="group">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1">
                                  {expandedMerchant === merchant.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{merchant.name}</div>
                              {merchant.address && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {merchant.address}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {merchant.contact}
                              </div>
                              {merchant.email && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {merchant.email}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium hidden md:table-cell">
                              ₹{Number(merchant.total_purchased).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-success hidden lg:table-cell">
                              ₹{Number(merchant.total_paid).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-medium">
                              ₹{Number(merchant.remaining_balance).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{getCreditScoreBadge(merchant.credit_score)}</TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {merchant.last_transaction_date
                                ? format(new Date(merchant.last_transaction_date), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(merchant)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDeleteDialog(merchant)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={9} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <History className="h-4 w-4" />
                                    Transaction History
                                  </div>
                                  {loadingTransactions === merchant.id ? (
                                    <div className="space-y-2">
                                      {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                      ))}
                                    </div>
                                  ) : transactions[merchant.id]?.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No transactions found</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Paid</TableHead>
                                            <TableHead className="text-right">Due</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {transactions[merchant.id]?.map((txn) => (
                                            <TableRow key={txn.id}>
                                              <TableCell className="text-sm">
                                                {format(new Date(txn.sale_date), "dd MMM yyyy")}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {txn.products?.brand} {txn.products?.model}
                                              </TableCell>
                                              <TableCell className="text-right text-sm">
                                                ₹{Number(txn.total_amount).toLocaleString("en-IN")}
                                              </TableCell>
                                              <TableCell className="text-right text-sm text-success">
                                                ₹{Number(txn.paid_amount).toLocaleString("en-IN")}
                                              </TableCell>
                                              <TableCell className="text-right text-sm text-destructive">
                                                ₹{Number(txn.remaining_amount).toLocaleString("en-IN")}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {format(new Date(txn.due_date), "dd MMM yyyy")}
                                              </TableCell>
                                              <TableCell>{getStatusBadge(txn.payment_status)}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMerchant ? "Edit Merchant" : "Add New Merchant"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Merchant name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="10 digit phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMerchant ? "Update" : "Add"} Merchant
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Merchant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{merchantToDelete?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
