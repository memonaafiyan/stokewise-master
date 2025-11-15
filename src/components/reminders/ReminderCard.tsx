import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface ReminderCardProps {
  sale: {
    id: string;
    due_date: string;
    remaining_amount: number;
    total_amount: number;
    payment_status: string;
    vyapari: {
      id: string;
      name: string;
      email: string | null;
      contact: string;
    };
    products: {
      name: string;
    };
  };
  onReminderSent: (vyapari_id: string, sale_id: string, type: string, email: string) => void;
}

export function ReminderCard({ sale, onReminderSent }: ReminderCardProps) {
  const daysOverdue = differenceInDays(new Date(), new Date(sale.due_date));

  const handleEmailReminder = () => {
    if (!sale.vyapari.email) {
      toast({
        title: "No email address",
        description: "This customer doesn't have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would trigger an email via edge function
    toast({
      title: "Email reminder",
      description: `Email reminder feature requires backend integration. Contact: ${sale.vyapari.email}`,
    });
    
    onReminderSent(sale.vyapari.id, sale.id, "email", sale.vyapari.email);
  };

  const handleWhatsAppReminder = () => {
    const message = encodeURIComponent(
      `Hi ${sale.vyapari.name}, this is a payment reminder for ${sale.products.name}. Amount due: ₹${Number(sale.remaining_amount).toLocaleString()}. Due date was ${format(new Date(sale.due_date), "dd MMM yyyy")}. Please make the payment at your earliest convenience.`
    );
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${sale.vyapari.contact}?text=${message}`;
    window.open(whatsappUrl, "_blank");
    
    onReminderSent(sale.vyapari.id, sale.id, "whatsapp", sale.vyapari.contact);
  };

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{sale.vyapari.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{sale.products.name}</p>
          </div>
          <Badge variant="destructive" className="gap-1">
            <Clock className="h-3 w-3" />
            {daysOverdue} days overdue
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium text-foreground">{format(new Date(sale.due_date), "dd MMM yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount Due</p>
            <p className="font-medium text-destructive">₹{Number(sale.remaining_amount).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contact</p>
            <p className="font-medium text-foreground">{sale.vyapari.contact}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{sale.vyapari.email || "N/A"}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleEmailReminder}
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
            disabled={!sale.vyapari.email}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            onClick={handleWhatsAppReminder}
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
