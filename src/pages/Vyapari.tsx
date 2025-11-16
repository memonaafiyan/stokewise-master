import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { useVyapari } from "@/hooks/useVyapari";
import { useSalesOperations } from "@/hooks/useSalesOperations";
import { VyapariForm, type VyapariFormData } from "@/components/vyapari/VyapariForm";
import { CreditScoreBadge } from "@/components/vyapari/CreditScoreBadge";
import { VyapariDetailsDialog } from "@/components/vyapari/VyapariDetailsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Vyapari = Tables<"vyapari">;

export default function VyapariPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVyapari, setEditingVyapari] = useState<Vyapari | null>(null);
  const [viewingVyapariId, setViewingVyapariId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingVyapari, setDeletingVyapari] = useState<Vyapari | null>(null);

  const { vyapari, isLoading, createVyapari, updateVyapari } = useVyapari();
  const { deleteVyapariWithSales } = useSalesOperations();

  const filteredVyapari = vyapari?.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contact.includes(searchQuery) ||
      v.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (data: VyapariFormData) => {
    createVyapari(data);
    setIsAddOpen(false);
  };

  const handleUpdate = (data: VyapariFormData) => {
    if (editingVyapari) {
      updateVyapari({ id: editingVyapari.id, updates: data });
      setEditingVyapari(null);
    }
  };

  const handleDelete = (vyapariToDelete: Vyapari) => {
    setDeletingVyapari(vyapariToDelete);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingVyapari) {
      await deleteVyapariWithSales.mutateAsync(deletingVyapari.id);
      setIsDeleteDialogOpen(false);
      setDeletingVyapari(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vyapari Management</h1>
          <p className="text-muted-foreground">Manage customers and track credit scores</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vyapari
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vyapari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vyapari?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ₹
              {vyapari
                ?.reduce((sum, v) => sum + v.remaining_balance, 0)
                .toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹
              {vyapari
                ?.reduce((sum, v) => sum + v.total_paid, 0)
                .toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredVyapari && filteredVyapari.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVyapari.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.contact}</TableCell>
                    <TableCell>{v.email || "-"}</TableCell>
                    <TableCell>
                      <CreditScoreBadge score={v.credit_score} />
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      ₹{v.remaining_balance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      ₹{v.total_paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingVyapariId(v.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingVyapari(v)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(v)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No vyapari found matching your search" : "No vyapari added yet"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vyapari</DialogTitle>
          </DialogHeader>
          <VyapariForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingVyapari} onOpenChange={() => setEditingVyapari(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vyapari</DialogTitle>
          </DialogHeader>
          <VyapariForm
            vyapari={editingVyapari || undefined}
            onSubmit={handleUpdate}
            onCancel={() => setEditingVyapari(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {viewingVyapariId && (
        <VyapariDetailsDialog
          vyapariId={viewingVyapariId}
          open={!!viewingVyapariId}
          onOpenChange={(open) => !open && setViewingVyapariId(null)}
        />
      )}
    </div>
  );
}
