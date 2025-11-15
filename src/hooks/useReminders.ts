import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  vyapari_id: string;
  sale_id: string;
  reminder_type: string;
  email_sent_to: string;
  sent_at: string;
}

interface OverdueSale {
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
}

export function useReminders() {
  const queryClient = useQueryClient();

  // Fetch overdue sales
  const { data: overdueSales, isLoading: loadingOverdue } = useQuery({
    queryKey: ["overdue-sales"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sales")
        .select("*, vyapari(*), products(*)")
        .lt("due_date", today)
        .in("payment_status", ["pending", "partial"])
        .gt("remaining_amount", 0)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as OverdueSale[];
    },
  });

  // Fetch reminder history
  const { data: reminders, isLoading: loadingReminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_reminders")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Reminder[];
    },
  });

  // Create reminder (for tracking purposes)
  const createReminder = useMutation({
    mutationFn: async (params: {
      vyapari_id: string;
      sale_id: string;
      reminder_type: string;
      email_sent_to: string;
    }) => {
      const { data, error } = await supabase
        .from("email_reminders")
        .insert([params])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({
        title: "Reminder logged",
        description: "Payment reminder has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    overdueSales,
    loadingOverdue,
    reminders,
    loadingReminders,
    createReminder: createReminder.mutate,
  };
}
