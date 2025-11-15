import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVyapari } from "@/hooks/useVyapari";
import { useProducts } from "@/hooks/useProducts";
import { useEffect } from "react";
import { format } from "date-fns";

const saleSchema = z.object({
  vyapari_id: z.string().min(1, "Please select a customer"),
  product_id: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  paid_amount: z.coerce.number().min(0, "Paid amount must be positive"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSubmit: (values: SaleFormValues & { 
    total_amount: number; 
    remaining_amount: number;
    payment_status: "pending" | "partial" | "paid" | "overdue";
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SaleForm({ onSubmit, onCancel, isLoading }: SaleFormProps) {
  const { vyapari } = useVyapari();
  const { products } = useProducts();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      vyapari_id: "",
      product_id: "",
      quantity: 1,
      rate: 0,
      paid_amount: 0,
      due_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const selectedProductId = form.watch("product_id");
  const quantity = form.watch("quantity");
  const rate = form.watch("rate");
  const paidAmount = form.watch("paid_amount");

  // Auto-fill rate when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) {
        form.setValue("rate", product.unit_price);
      }
    }
  }, [selectedProductId, products, form]);

  const totalAmount = quantity * rate;
  const remainingAmount = totalAmount - paidAmount;

  const handleSubmit = (values: SaleFormValues) => {
    const paymentStatus: "pending" | "partial" | "paid" | "overdue" = 
      paidAmount >= totalAmount ? "paid" : 
      paidAmount > 0 ? "partial" : "pending";

    onSubmit({
      ...values,
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="vyapari_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer (Vyapari)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vyapari.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} - {v.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ₹{p.unit_price}/{p.unit} (Stock: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            Total Amount: ₹{totalAmount.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paid_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-3 bg-muted rounded-lg space-y-1">
          <p className="text-sm">
            Remaining: ₹{remainingAmount.toFixed(2)}
          </p>
          <p className="text-sm font-medium text-primary">
            Status: {paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Pending"}
          </p>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional notes..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Recording..." : "Record Sale"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
