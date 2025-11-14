import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Payment {
  id: string;
  sale_id: string;
  vyapari_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface PaymentWithDetails extends Payment {
  sales?: {
    id: string;
    total_amount: number;
    remaining_amount: number;
    paid_amount: number;
    payment_status: string;
    sale_date: string;
    products?: {
      name: string;
    };
  };
  vyapari?: {
    name: string;
    contact: string;
  };
}

export interface PaymentInsert {
  sale_id: string;
  vyapari_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
  created_by: string;
}

export const usePayments = () => {
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          sales (
            id,
            total_amount,
            remaining_amount,
            paid_amount,
            payment_status,
            sale_date,
            products (name)
          ),
          vyapari (
            name,
            contact
          )
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as PaymentWithDetails[];
    },
  });

  const { data: outstandingSales = [] } = useQuery({
    queryKey: ["outstanding-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          products (name),
          vyapari (name, contact)
        `)
        .in("payment_status", ["pending", "partial"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createPayment = useMutation({
    mutationFn: async (newPayment: PaymentInsert) => {
      const { data, error } = await supabase
        .from("payments")
        .insert(newPayment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["outstanding-sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
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

  const getPaymentsBySale = (saleId: string) => {
    return payments.filter((p) => p.sale_id === saleId);
  };

  const getPaymentsByVyapari = (vyapariId: string) => {
    return payments.filter((p) => p.vyapari_id === vyapariId);
  };

  return {
    payments,
    outstandingSales,
    isLoading,
    createPayment,
    getPaymentsBySale,
    getPaymentsByVyapari,
  };
};
