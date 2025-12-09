import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { StockForm } from "@/components/products/StockForm";
import { supabase } from "@/integrations/supabase/client";

export default function StockEntry() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const { createProduct } = useProducts();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleAddProduct = (values: any) => {
    createProduct.mutate(
      { ...values, created_by: userId },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Entry</h2>
          <p className="text-muted-foreground mt-1">
            Add new devices to your inventory
          </p>
        </div>
        <Button className="gap-2 shadow-lg hover-scale" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Quick Add Card */}
      <Card className="hover:shadow-lg transition-all cursor-pointer border-dashed border-2" onClick={() => setIsAddDialogOpen(true)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl mb-2">Add New Stock Item</CardTitle>
          <CardDescription className="text-center max-w-md">
            Click here or use the "Add Stock" button to add a new mobile device to your inventory with all details including brand, model, IMEI, and pricing.
          </CardDescription>
          <Button className="mt-6 gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Entry Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">📱 Device Details</h4>
              <p className="text-sm text-muted-foreground">
                Enter the brand, model, color, and storage capacity of each device.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">🔢 IMEI Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Add IMEI or serial number for easy identification and warranty tracking.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">💰 Auto Profit</h4>
              <p className="text-sm text-muted-foreground">
                Profit is automatically calculated from purchase and selling prices.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">🌍 Country Variant</h4>
              <p className="text-sm text-muted-foreground">
                Track device origin - India, Dubai, US, Japan, etc.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">📝 Notes</h4>
              <p className="text-sm text-muted-foreground">
                Add any additional notes about condition, accessories, etc.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">📅 Auto Date</h4>
              <p className="text-sm text-muted-foreground">
                Entry date is automatically captured for accurate records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add New Stock Item
            </DialogTitle>
          </DialogHeader>
          <StockForm
            onSubmit={handleAddProduct}
            onCancel={() => setIsAddDialogOpen(false)}
            isLoading={createProduct.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
