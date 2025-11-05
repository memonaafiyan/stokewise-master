import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function Sales() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales & Udhari</h2>
          <p className="text-muted-foreground mt-1">
            Record sales and manage credit payments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Sale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No transactions yet. Click "New Sale" to record your first transaction.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
