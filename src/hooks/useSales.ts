import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Sale {
  id: string;
  vyapari_id: string;
  product_id: string;
  quantity: number;
  rate: number;
  total_amount: number;
  remaining_amount: number;
  paid_amount: number;
  payment_status: "pending" | "partial" | "paid" | "overdue";
  sale_date: string;
  due_date: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface SaleWithDetails extends Sale {
  vyapari?: {
    name: string;
    contact: string;
    remaining_balance: number;
  };
  products?: {
    name: string;
    unit: string;
    quantity: number;
  };
}

export interface SaleInsert {
  vyapari_id: string;
  product_id: string;
  quantity: number;
  rate: number;
  total_amount: number;
  remaining_amount: number;
  paid_amount: number;
  payment_status: "pending" | "partial" | "paid" | "overdue";
  sale_date: string;
  due_date: string;
  notes?: string;
  created_by: string;
}

export const useSales = () => {
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          vyapari (
            name,
            contact,
            remaining_balance
          ),
          products (
            name,
            unit,
            quantity
          )
        `)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return data as SaleWithDetails[];
    },
  });

  const createSale = useMutation({
    mutationFn: async (newSale: SaleInsert) => {
      const { data, error } = await supabase
        .from("sales")
        .insert(newSale)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      queryClient.invalidateQueries({ queryKey: ["outstanding-sales"] });
      toast({
        title: "Success",
        description: "Sale recorded successfully",
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

  const updateSale = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SaleInsert> }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast({
        title: "Success",
        description: "Sale updated successfully",
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
    sales,
    isLoading,
    createSale,
    updateSale,
  };
};
