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
import {
  Send,
  Mail,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Edit,
  IndianRupee,
  Calendar,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, isToday, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Sale {
  id: string;
  product_id: string;
  vyapari_id: string;
  quantity: number;
  rate: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_status: string;
  sale_date: string;
  notes: string | null;
  products?: {
    brand: string | null;
    model: string | null;
  };
  vyapari?: {
    id: string;
    name: string;
    contact: string;
    email: string | null;
  };
}

interface Payment {
  id: string;
  sale_id: string;
  vyapari_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  vyapari?: {
    id: string;
    name: string;
    contact: string;
  };
  sales?: {
    products?: {
      brand: string | null;
      model: string | null;
    };
  };
}

export default function Payments() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("sales");
  
  // Payment history filters
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [paymentMerchantFilter, setPaymentMerchantFilter] = useState("all");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  
  // Edit dialogs
  const [editDueDateDialog, setEditDueDateDialog] = useState(false);
  const [recordPaymentDialog, setRecordPaymentDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSales();
    loadPayments();
  }, []);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          products(brand, model),
          vyapari(id, name, contact, email)
        `)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Failed to load sales:", error);
      toast.error("Failed to load payment data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setIsLoadingPayments(true);
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          vyapari(id, name, contact),
          sales(products(brand, model))
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Failed to load payments:", error);
      toast.error("Failed to load payment history");
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const sendAllReminders = async () => {
    try {
      setIsSendingReminders(true);
      const { data, error } = await supabase.functions.invoke("send-whatsapp-reminder");

      if (error) throw error;

      toast.success(
        `Sent ${data.emails_sent} emails and generated ${data.whatsapp_reminders} WhatsApp reminders`
      );
      loadSales();
    } catch (error: any) {
      console.error("Failed to send reminders:", error);
      toast.error("Failed to send reminders: " + error.message);
    } finally {
      setIsSendingReminders(false);
    }
  };

  const openWhatsApp = (sale: Sale) => {
    if (!sale.vyapari?.contact) {
      toast.error("No phone number available for this merchant");
      return;
    }

    const daysOverdue = differenceInDays(new Date(), new Date(sale.due_date));
    const isOverdue = daysOverdue > 0;
    const productName = `${sale.products?.brand || ""} ${sale.products?.model || ""}`.trim() || "Product";
    const formattedDueDate = format(new Date(sale.due_date), "dd MMM yyyy");

    const message = isOverdue
      ? `🔔 *Payment Overdue Reminder*

Dear ${sale.vyapari?.name || "Customer"},

Your payment for *${productName}* is overdue by *${daysOverdue} days*.

📅 Due Date: ${formattedDueDate}
💰 Amount Due: ₹${Number(sale.remaining_amount).toLocaleString("en-IN")}

Please make the payment at your earliest convenience.

Thank you!
~Phonex Telecom
📞 7874455980`
      : `🔔 *Payment Reminder*

Dear ${sale.vyapari?.name || "Customer"},

This is a reminder for your upcoming payment for *${productName}*.

📅 Due Date: ${formattedDueDate}
💰 Amount Due: ₹${Number(sale.remaining_amount).toLocaleString("en-IN")}

Thank you!
~Phonex Telecom
📞 7874455980`;

    const phone = sale.vyapari.contact.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("WhatsApp opened!");
  };

  const sendEmail = async (sale: Sale) => {
    if (!sale.vyapari?.email) {
      toast.error("No email address available for this merchant");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-reminder", {
        body: {
          singleSaleId: sale.id,
        },
      });

      if (error) throw error;
      toast.success(`Email reminder sent to ${sale.vyapari.email}`);
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email: " + error.message);
    }
  };

  const handleEditDueDate = (sale: Sale) => {
    setSelectedSale(sale);
    setNewDueDate(sale.due_date);
    setEditDueDateDialog(true);
  };

  const handleRecordPayment = (sale: Sale) => {
    setSelectedSale(sale);
    setPaymentAmount("");
    setPaymentNotes("");
    setRecordPaymentDialog(true);
  };

  const updateDueDate = async () => {
    if (!selectedSale || !newDueDate) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("sales")
        .update({ due_date: newDueDate })
        .eq("id", selectedSale.id);

      if (error) throw error;
      
      toast.success("Due date updated successfully");
      setEditDueDateDialog(false);
      loadSales();
    } catch (error: any) {
      console.error("Failed to update due date:", error);
      toast.error("Failed to update due date");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordPayment = async () => {
    if (!selectedSale || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (amount > Number(selectedSale.remaining_amount)) {
      toast.error("Payment amount cannot exceed remaining amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Insert payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        sale_id: selectedSale.id,
        vyapari_id: selectedSale.vyapari_id,
        amount: amount,
        notes: paymentNotes || null,
        created_by: userData.user.id,
      });

      if (paymentError) throw paymentError;
      
      toast.success("Payment recorded successfully");
      setRecordPaymentDialog(false);
      loadSales();
      loadPayments();
    } catch (error: any) {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== "paid";
    
    if (status === "paid") {
      return <Badge variant="secondary" className="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
    }
    if (isOverdue || status === "overdue") {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>;
    }
    if (status === "partial") {
      return <Badge variant="secondary" className="gap-1 bg-amber-500 text-white hover:bg-amber-600"><Clock className="h-3 w-3" /> Partial</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  const getDaysIndicator = (dueDate: string, status: string) => {
    if (status === "paid") return null;
    
    const days = differenceInDays(new Date(dueDate), new Date());
    
    if (days < 0) {
      return <span className="text-destructive text-sm font-medium">{Math.abs(days)} days overdue</span>;
    }
    if (days === 0) {
      return <span className="text-warning text-sm font-medium">Due today</span>;
    }
    if (days <= 3) {
      return <span className="text-warning text-sm">{days} days left</span>;
    }
    return <span className="text-muted-foreground text-sm">{days} days left</span>;
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.vyapari?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.products?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.products?.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      sale.payment_status === statusFilter ||
      (statusFilter === "overdue" && new Date(sale.due_date) < new Date() && sale.payment_status !== "paid");

    const matchesDate = 
      dateFilter === "all" ||
      (dateFilter === "today" && isToday(new Date(sale.sale_date)));

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get unique merchants for filter dropdown
  const uniqueMerchants = payments
    .filter(p => p.vyapari?.id)
    .map(p => p.vyapari!)
    .filter((v, i, arr) => arr.findIndex(m => m.id === v.id) === i);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.vyapari?.name?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
      payment.sales?.products?.brand?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
      payment.sales?.products?.model?.toLowerCase().includes(paymentSearchTerm.toLowerCase());

    const matchesMerchant =
      paymentMerchantFilter === "all" || payment.vyapari_id === paymentMerchantFilter;

    let matchesDateRange = true;
    if (paymentDateFrom) {
      matchesDateRange = matchesDateRange && new Date(payment.payment_date) >= startOfDay(parseISO(paymentDateFrom));
    }
    if (paymentDateTo) {
      matchesDateRange = matchesDateRange && new Date(payment.payment_date) <= endOfDay(parseISO(paymentDateTo));
    }

    return matchesSearch && matchesMerchant && matchesDateRange;
  });

  const todayEntries = sales.filter(s => isToday(new Date(s.sale_date)));

  const stats = {
    total: sales.length,
    pending: sales.filter((s) => s.payment_status === "pending" || s.payment_status === "partial").length,
    overdue: sales.filter((s) => new Date(s.due_date) < new Date() && s.payment_status !== "paid").length,
    totalDue: sales.reduce((sum, s) => sum + Number(s.remaining_amount), 0),
    todayEntries: todayEntries.length,
    totalPayments: payments.length,
    totalReceived: payments.reduce((sum, p) => sum + Number(p.amount), 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Manage sales payments and send reminders</p>
        </div>
        <Button
          onClick={sendAllReminders}
          disabled={isSendingReminders}
          className="gap-2 shadow-lg"
        >
          {isSendingReminders ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send All Reminders
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Payments</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              ₹{stats.totalDue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">Total Due Amount</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.todayEntries}</div>
            <p className="text-xs text-muted-foreground">Today's Entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sales" className="gap-2">
            <IndianRupee className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by merchant or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today's Entries</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadSales}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Sales</CardTitle>
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
                        <TableHead className="hidden sm:table-cell">Product</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No payments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              <div className="font-medium">{sale.vyapari?.name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{sale.vyapari?.contact}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {sale.products?.brand} {sale.products?.model}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{Number(sale.total_amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-success hidden md:table-cell">
                              ₹{Number(sale.paid_amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-medium">
                              ₹{Number(sale.remaining_amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div>{format(new Date(sale.due_date), "dd MMM yyyy")}</div>
                              {getDaysIndicator(sale.due_date, sale.payment_status)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.payment_status, sale.due_date)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRecordPayment(sale)}
                                  disabled={sale.payment_status === "paid"}
                                  title="Record Payment"
                                >
                                  <IndianRupee className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDueDate(sale)}
                                  disabled={sale.payment_status === "paid"}
                                  title="Edit Due Date"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openWhatsApp(sale)}
                                  disabled={!sale.vyapari?.contact || sale.payment_status === "paid"}
                                  title="Send WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4 text-success" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendEmail(sale)}
                                  disabled={!sale.vyapari?.email || sale.payment_status === "paid"}
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4 text-primary" />
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
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Payment History Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalPayments}</div>
                <p className="text-xs text-muted-foreground">Total Payments Recorded</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-emerald-600">
                  ₹{stats.totalReceived.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Total Amount Received</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={paymentSearchTerm}
                    onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={paymentMerchantFilter} onValueChange={setPaymentMerchantFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Merchants</SelectItem>
                    {uniqueMerchants.map((merchant) => (
                      merchant && (
                        <SelectItem key={merchant.id} value={merchant.id}>
                          {merchant.name}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Input
                    type="date"
                    placeholder="From date"
                    value={paymentDateFrom}
                    onChange={(e) => setPaymentDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="To date"
                    value={paymentDateTo}
                    onChange={(e) => setPaymentDateTo(e.target.value)}
                  />
                  <Button variant="outline" onClick={loadPayments}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
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
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead className="hidden md:table-cell">Product</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No payment records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="font-medium">
                                {format(new Date(payment.payment_date), "dd MMM yyyy")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(payment.payment_date), "hh:mm a")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{payment.vyapari?.name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{payment.vyapari?.contact}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {payment.sales?.products?.brand} {payment.sales?.products?.model}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              ₹{Number(payment.amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                              {payment.notes || "-"}
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
        </TabsContent>
      </Tabs>

      {/* Edit Due Date Dialog */}
      <Dialog open={editDueDateDialog} onOpenChange={setEditDueDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Merchant</Label>
              <p className="text-sm text-muted-foreground">{selectedSale?.vyapari?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Remaining Amount</Label>
              <p className="text-lg font-bold text-destructive">
                ₹{Number(selectedSale?.remaining_amount || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">New Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <Button 
              onClick={updateDueDate} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Due Date"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentDialog} onOpenChange={setRecordPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Merchant</Label>
              <p className="text-sm text-muted-foreground">{selectedSale?.vyapari?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <p className="text-sm font-medium">
                  ₹{Number(selectedSale?.total_amount || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Remaining</Label>
                <p className="text-lg font-bold text-destructive">
                  ₹{Number(selectedSale?.remaining_amount || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="1"
                max={selectedSale?.remaining_amount || 0}
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea
                id="paymentNotes"
                placeholder="Payment notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            <Button 
              onClick={recordPayment} 
              className="w-full"
              disabled={isSubmitting || !paymentAmount}
            >
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
