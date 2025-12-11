import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Extended Product type that includes all our custom fields
export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  low_stock_threshold: number | null;
  currency: string | null;
  imei: string | null;
  barcode: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  // New Stock Maker fields
  brand: string | null;
  model: string | null;
  color: string | null;
  storage: string | null;
  country_variant: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  customer_name: string | null;
  notes: string | null;
  sold: boolean | null;
  sold_date: string | null;
}

export interface ProductInsert {
  brand?: string;
  model?: string;
  color?: string;
  storage?: string;
  country_variant?: string;
  imei?: string;
  barcode?: string;
  purchase_price?: number;
  selling_price?: number;
  customer_name?: string;
  notes?: string;
  sold?: boolean;
  sold_date?: string;
  // Required by original schema but with defaults
  name?: string;
  category?: string;
  unit_price?: number;
  created_by: string;
}

export interface ProductUpdate {
  brand?: string;
  model?: string;
  color?: string;
  storage?: string;
  country_variant?: string;
  imei?: string;
  barcode?: string;
  purchase_price?: number;
  selling_price?: number;
  customer_name?: string;
  notes?: string;
  sold?: boolean;
  sold_date?: string;
  name?: string;
  category?: string;
}

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (newProduct: ProductInsert) => {
      const { data, error } = await supabase
        .from("products")
        .insert(newProduct as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success! ✓",
        description: "Stock item added successfully",
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

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductUpdate }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success! ✓",
        description: "Stock item updated successfully",
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

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success! ✓",
        description: "Stock item deleted successfully",
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
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
