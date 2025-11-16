import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSalesOperations = () => {
  const queryClient = useQueryClient();

  const deleteSale = useMutation({
    mutationFn: async (saleId: string) => {
      // Get sale details first to restore stock
      const { data: sale, error: fetchError } = await supabase
        .from("sales")
        .select("product_id, quantity")
        .eq("id", saleId)
        .single();

      if (fetchError) throw fetchError;

      // Restore product stock
      if (sale) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", sale.product_id)
          .single();

        if (product) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ quantity: product.quantity + sale.quantity })
            .eq("id", sale.product_id);

          if (updateError) throw updateError;
        }
      }

      // Delete the sale
      const { error } = await supabase.from("sales").delete().eq("id", saleId);
      if (error) throw error;

      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      toast.success("Sale deleted and stock restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sale: ${error.message}`);
    },
  });

  const deleteVyapariWithSales = useMutation({
    mutationFn: async (vyapariId: string) => {
      // Get all sales for this vyapari to restore stock
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, product_id, quantity")
        .eq("vyapari_id", vyapariId);

      if (salesError) throw salesError;

      // Restore stock for each product
      if (sales && sales.length > 0) {
        for (const sale of sales) {
          const { data: product } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", sale.product_id)
            .single();

          if (product) {
            const { error: updateError } = await supabase
              .from("products")
              .update({ quantity: product.quantity + sale.quantity })
              .eq("id", sale.product_id);

            if (updateError) throw updateError;
          }
        }

        // Delete all payments for these sales
        const { error: paymentsError } = await supabase
          .from("payments")
          .delete()
          .eq("vyapari_id", vyapariId);

        if (paymentsError) throw paymentsError;

        // Delete all sales
        const { error: deleteSalesError } = await supabase
          .from("sales")
          .delete()
          .eq("vyapari_id", vyapariId);

        if (deleteSalesError) throw deleteSalesError;
      }

      // Delete the vyapari
      const { error } = await supabase.from("vyapari").delete().eq("id", vyapariId);
      if (error) throw error;

      return vyapariId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vyapari"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Vyapari deleted, sales removed, and stock restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete vyapari: ${error.message}`);
    },
  });

  return {
    deleteSale,
    deleteVyapariWithSales,
  };
};
