import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Vyapari = Tables<"vyapari">;
type VyapariInsert = TablesInsert<"vyapari">;
type VyapariUpdate = TablesUpdate<"vyapari">;

export function useVyapari() {
  const queryClient = useQueryClient();

  const { data: vyapari, isLoading } = useQuery({
    queryKey: ["vyapari"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vyapari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Vyapari[];
    },
  });

  const createVyapari = useMutation({
    mutationFn: async (newVyapari: Omit<VyapariInsert, "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("vyapari")
        .insert({ ...newVyapari, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast.success("Vyapari created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateVyapari = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: VyapariUpdate }) => {
      const { data, error } = await supabase
        .from("vyapari")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast.success("Vyapari updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteVyapari = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vyapari").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast.success("Vyapari deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    vyapari,
    isLoading,
    createVyapari: createVyapari.mutate,
    updateVyapari: updateVyapari.mutate,
    deleteVyapari: deleteVyapari.mutate,
  };
}

export function useVyapariDetails(id: string) {
  return useQuery({
    queryKey: ["vyapari", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vyapari")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Vyapari;
    },
    enabled: !!id,
  });
}

export function useVyapariTransactions(id: string) {
  return useQuery({
    queryKey: ["vyapari-transactions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          products:product_id (name, unit),
          payments (*)
        `)
        .eq("vyapari_id", id)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
