import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkSalesImportProps {
  onSuccess: () => void;
  userId: string;
}

export function BulkSalesImport({ onSuccess, userId }: BulkSalesImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const downloadTemplate = () => {
    const csvContent = `vyapari_name,product_name,quantity,rate,paid_amount,due_date,notes
Example Customer,Example Product,10,100,500,2024-12-31,Sample sale
`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    return rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const salesData = parseCSV(text);

      // Get all vyapari and products for matching
      const { data: vyapariList } = await supabase.from("vyapari").select("id, name");
      const { data: productsList } = await supabase.from("products").select("id, name");

      const salesToInsert = [];

      for (const row of salesData) {
        const vyapari = vyapariList?.find(
          (v) => v.name.toLowerCase() === row.vyapari_name?.toLowerCase()
        );
        const product = productsList?.find(
          (p) => p.name.toLowerCase() === row.product_name?.toLowerCase()
        );

        if (!vyapari || !product) {
          toast.error(`Vyapari or Product not found: ${row.vyapari_name}, ${row.product_name}`);
          continue;
        }

        const quantity = parseFloat(row.quantity || "0");
        const rate = parseFloat(row.rate || "0");
        const paidAmount = parseFloat(row.paid_amount || "0");
        const totalAmount = quantity * rate;
        const remainingAmount = totalAmount - paidAmount;

        salesToInsert.push({
          vyapari_id: vyapari.id,
          product_id: product.id,
          quantity,
          rate,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payment_status:
            paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : "pending",
          sale_date: new Date().toISOString(),
          due_date: row.due_date || new Date().toISOString(),
          notes: row.notes || null,
          created_by: userId,
        });
      }

      if (salesToInsert.length > 0) {
        const { error } = await supabase.from("sales").insert(salesToInsert);
        if (error) throw error;

        toast.success(`${salesToInsert.length} sales imported successfully`);
        setFile(null);
        onSuccess();
      } else {
        toast.error("No valid sales data found in the file");
      }
    } catch (error: any) {
      toast.error(`Failed to import sales: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Upload a CSV file with sales data. Make sure vyapari and product names match exactly.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Upload CSV File</Label>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name}
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={downloadTemplate}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Template
        </Button>

        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Importing..." : "Import Sales"}
        </Button>
      </div>
    </div>
  );
}
