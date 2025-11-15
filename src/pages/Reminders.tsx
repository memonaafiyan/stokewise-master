import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Clock, Mail, MessageSquare } from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Reminders() {
  const { overdueSales, loadingOverdue, reminders, loadingReminders, createReminder } = useReminders();

  const handleReminderSent = (vyapari_id: string, sale_id: string, type: string, email: string) => {
    createReminder({
      vyapari_id,
      sale_id,
      reminder_type: type,
      email_sent_to: email,
    });
  };

  const totalOverdue = overdueSales?.reduce((sum, sale) => sum + Number(sale.remaining_amount), 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Reminders</h2>
        <p className="text-muted-foreground mt-1">
          Manage overdue payments and send reminders
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Sales</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueSales?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue Amount</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₹{totalOverdue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reminders Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reminders?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Sales */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Overdue Payments</h3>
        {loadingOverdue ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : overdueSales && overdueSales.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {overdueSales.map((sale) => (
              <ReminderCard key={sale.id} sale={sale} onReminderSent={handleReminderSent} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No overdue payments</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reminder History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Reminder History</h3>
        {loadingReminders ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : reminders && reminders.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {reminder.reminder_type === "email" ? (
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{reminder.email_sent_to}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reminder.sent_at), "dd MMM yyyy, hh:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {reminder.reminder_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No reminders sent yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
