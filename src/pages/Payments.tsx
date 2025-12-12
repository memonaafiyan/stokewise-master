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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Payments() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
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

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sales.length,
    pending: sales.filter((s) => s.payment_status === "pending" || s.payment_status === "partial").length,
    overdue: sales.filter((s) => new Date(s.due_date) < new Date() && s.payment_status !== "paid").length,
    totalDue: sales.reduce((sum, s) => sum + Number(s.remaining_amount), 0),
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
      </div>

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
            <Button variant="outline" onClick={loadSales}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
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
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Due Date</TableHead>
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
                        <TableCell>
                          {sale.products?.brand} {sale.products?.model}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{Number(sale.total_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          ₹{Number(sale.paid_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          ₹{Number(sale.remaining_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <div>{format(new Date(sale.due_date), "dd MMM yyyy")}</div>
                          {getDaysIndicator(sale.due_date, sale.payment_status)}
                        </TableCell>
                        <TableCell>{getStatusBadge(sale.payment_status, sale.due_date)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
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
    </div>
  );
}
