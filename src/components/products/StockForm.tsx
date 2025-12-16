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
import { Product, useProducts } from "@/hooks/useProducts";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { RotateCcw, Calculator, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// IMEI validation: exactly 15 digits
const imeiRegex = /^\d{15}$/;

// Validation schema with all required fields
const stockSchema = z.object({
  brand: z.string().min(1, "Brand name is required").max(100),
  model: z.string().min(1, "Model name is required").max(100),
  color: z.string().optional(),
  storage: z.string().optional(),
  country_variant: z.string().default("IN"),
  imei: z.string().optional().refine((val) => {
    if (!val || val.length === 0) return true;
    return imeiRegex.test(val);
  }, "IMEI must be exactly 15 digits"),
  purchase_price: z.coerce.number().min(0, "Purchase price must be positive"),
  customer_name: z.string().optional(),
  notes: z.string().optional(),
});

type StockFormValues = z.infer<typeof stockSchema>;

interface StockFormProps {
  product?: Product;
  onSubmit: (values: StockFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Country variants
const COUNTRY_VARIANTS = [
  { value: "IN", label: "🇮🇳 India" },
  { value: "Dubai", label: "🇦🇪 Dubai" },
  { value: "US", label: "🇺🇸 United States" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "UK", label: "🇬🇧 United Kingdom" },
  { value: "China", label: "🇨🇳 China" },
  { value: "Korea", label: "🇰🇷 Korea" },
  { value: "Other", label: "🌍 Other" },
];

// Storage options
const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];

// Popular brands
const BRAND_SUGGESTIONS = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Realme", "Vivo", "Oppo", "Motorola", "Google", "Nothing"];

export function StockForm({ product, onSubmit, onCancel, isLoading }: StockFormProps) {
  const [isCheckingIMEI, setIsCheckingIMEI] = useState(false);
  const [imeiStatus, setImeiStatus] = useState<'valid' | 'duplicate' | 'checking' | null>(null);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      brand: product?.brand || "",
      model: product?.model || "",
      color: product?.color || "",
      storage: product?.storage || "",
      country_variant: product?.country_variant || "IN",
      imei: product?.imei || "",
      purchase_price: product?.purchase_price || 0,
      customer_name: product?.customer_name || "",
      notes: product?.notes || "",
    },
  });

  const imeiValue = form.watch("imei");

  // Check for duplicate IMEI
  const checkDuplicateIMEI = async (imei: string) => {
    if (!imei || imei.length !== 15) {
      setImeiStatus(null);
      return;
    }

    setIsCheckingIMEI(true);
    setImeiStatus('checking');

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, brand, model')
        .eq('imei', imei)
        .neq('id', product?.id || '00000000-0000-0000-0000-000000000000')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setImeiStatus('duplicate');
        form.setError('imei', { 
          message: `This IMEI already exists for ${data[0].brand} ${data[0].model}` 
        });
      } else {
        setImeiStatus('valid');
        form.clearErrors('imei');
      }
    } catch (error) {
      console.error('Error checking IMEI:', error);
    } finally {
      setIsCheckingIMEI(false);
    }
  };

  // Reset form function
  const handleReset = () => {
    form.reset({
      brand: "",
      model: "",
      color: "",
      storage: "",
      country_variant: "IN",
      imei: "",
      purchase_price: 0,
      customer_name: "",
      notes: "",
    });
    setImeiStatus(null);
  };

  // Custom submit handler with duplicate check
  const handleFormSubmit = async (values: StockFormValues) => {
    // Check IMEI duplicate before submitting
    if (values.imei && values.imei.length === 15) {
      const { data } = await supabase
        .from('products')
        .select('id')
        .eq('imei', values.imei)
        .neq('id', product?.id || '00000000-0000-0000-0000-000000000000')
        .limit(1);

      if (data && data.length > 0) {
        toast.error("This IMEI already exists in the system!");
        return;
      }
    }

    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Brand and Model Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Apple, Samsung" 
                    list="brand-suggestions"
                    className="h-11"
                    {...field} 
                  />
                </FormControl>
                <datalist id="brand-suggestions">
                  {BRAND_SUGGESTIONS.map(brand => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., iPhone 15 Pro" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Color and Storage Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Black, Blue, Gold" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage (GB)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select storage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STORAGE_OPTIONS.map(storage => (
                      <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Country and IMEI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="country_variant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country Variant</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRY_VARIANTS.map(country => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
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
            name="imei"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  IMEI / Serial Number
                  {imeiStatus === 'checking' && (
                    <span className="text-xs text-muted-foreground animate-pulse">Checking...</span>
                  )}
                  {imeiStatus === 'valid' && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  {imeiStatus === 'duplicate' && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="15 digit IMEI" 
                    maxLength={15}
                    className="h-11 font-mono"
                    {...field} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                      field.onChange(value);
                      if (value.length === 15) {
                        checkDuplicateIMEI(value);
                      } else {
                        setImeiStatus(null);
                      }
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {imeiValue?.length || 0}/15 digits
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price Row with Profit Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchase_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Price (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="0" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="selling_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="0" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Auto-calculated Profit Display */}
        <div className={`p-4 rounded-lg border transition-colors ${
          profit >= 0 
            ? 'bg-success/10 border-success/20' 
            : 'bg-destructive/10 border-destructive/20'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Calculator className="h-4 w-4" />
            Auto-Calculated Profit
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₹{profit.toLocaleString('en-IN')}
            </span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              profit >= 0 
                ? 'bg-success/20 text-success' 
                : 'bg-destructive/20 text-destructive'
            }`}>
              {profit >= 0 ? '+' : ''}{profitPercentage}%
            </span>
          </div>
        </div>

        {/* Customer Name */}
        <FormField
          control={form.control}
          name="customer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter customer name (optional)" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about this stock item..."
                  className="resize-none min-h-[80px]"
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Today's Date Display */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground">
            📅 Entry Date: <span className="font-medium text-foreground">{format(new Date(), "PPP")}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleReset} className="gap-2 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || imeiStatus === 'duplicate'}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Saving..." : product ? "Update Stock" : "Add Stock"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
