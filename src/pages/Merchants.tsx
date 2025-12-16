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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit,
  Users,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
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
                    <TableHead>Merchant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Purchased</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerchants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No merchants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMerchants.map((merchant) => (
                      <TableRow key={merchant.id}>
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
                        <TableCell className="text-right font-medium">
                          ₹{Number(merchant.total_purchased).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          ₹{Number(merchant.total_paid).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          ₹{Number(merchant.remaining_balance).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{getCreditScoreBadge(merchant.credit_score)}</TableCell>
                        <TableCell>
                          {merchant.last_transaction_date
                            ? format(new Date(merchant.last_transaction_date), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(merchant)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
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
    </div>
  );
}
