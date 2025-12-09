import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, Filter, Package, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts, Product } from "@/hooks/useProducts";
import { StockForm } from "@/components/products/StockForm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Items per page for pagination
const ITEMS_PER_PAGE = 10;

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function StockList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [storageFilter, setStorageFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { products, isLoading, updateProduct, deleteProduct } = useProducts();
  
  // Debounced search for performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('stock-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // React Query handles refetching automatically
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get unique values for filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand).filter(Boolean));
    return Array.from(brands).sort();
  }, [products]);

  const uniqueStorages = useMemo(() => {
    const storages = new Set(products.map(p => p.storage).filter(Boolean));
    return Array.from(storages).sort();
  }, [products]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set(products.map(p => p.country_variant).filter(Boolean));
    return Array.from(countries).sort();
  }, [products]);

  // Optimized filtering with useMemo
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter (model, color, country, IMEI, brand)
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = !debouncedSearch || 
        product.brand?.toLowerCase().includes(searchLower) ||
        product.model?.toLowerCase().includes(searchLower) ||
        product.color?.toLowerCase().includes(searchLower) ||
        product.country_variant?.toLowerCase().includes(searchLower) ||
        product.imei?.toLowerCase().includes(searchLower);

      // Brand filter
      const matchesBrand = brandFilter === "all" || product.brand === brandFilter;

      // Storage filter
      const matchesStorage = storageFilter === "all" || product.storage === storageFilter;

      // Country filter
      const matchesCountry = countryFilter === "all" || product.country_variant === countryFilter;

      return matchesSearch && matchesBrand && matchesStorage && matchesCountry;
    });
  }, [products, debouncedSearch, brandFilter, storageFilter, countryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, brandFilter, storageFilter, countryFilter]);

  const handleEditProduct = useCallback((values: any) => {
    if (!selectedProduct) return;
    updateProduct.mutate(
      { id: selectedProduct.id, updates: values },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedProduct(null);
        },
      }
    );
  }, [selectedProduct, updateProduct]);

  const handleDeleteProduct = useCallback(() => {
    if (!deleteProductId) return;
    deleteProduct.mutate(deleteProductId, {
      onSuccess: () => {
        setDeleteProductId(null);
      },
    });
  }, [deleteProductId, deleteProduct]);

  const openEditDialog = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setBrandFilter("all");
    setStorageFilter("all");
    setCountryFilter("all");
  }, []);

  // Calculate profit for display
  const getProfit = (product: Product) => {
    return product.selling_price - product.purchase_price;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Stock List</h2>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} items found
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model, color, country, IMEI, brand..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters:
            </div>
            
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Storage</SelectItem>
                {uniqueStorages.map(storage => (
                  <SelectItem key={storage} value={storage!}>{storage}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || brandFilter !== "all" || storageFilter !== "all" || countryFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading stock...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No stock items found</p>
              <p className="text-sm">
                {searchTerm || brandFilter !== "all" || storageFilter !== "all" || countryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first stock item to get started"}
              </p>
            </div>
          ) : (
            <>
              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead className="text-right">Purchase ₹</TableHead>
                      <TableHead className="text-right">Selling ₹</TableHead>
                      <TableHead className="text-right">Profit ₹</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => {
                      const profit = getProfit(product);
                      return (
                        <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{product.brand}</TableCell>
                          <TableCell>{product.model}</TableCell>
                          <TableCell>{product.color || "-"}</TableCell>
                          <TableCell>{product.storage || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.country_variant}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{product.imei || "-"}</TableCell>
                          <TableCell className="text-right">₹{product.purchase_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{product.selling_price.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ₹{profit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(product.created_at), "dd MMM")}
                          </TableCell>
                          <TableCell>
                            {product.sold ? (
                              <Badge variant="secondary">Sold</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success border-success/20">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteProductId(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Stock Item</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <StockForm
              product={selectedProduct}
              onSubmit={handleEditProduct}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedProduct(null);
              }}
              isLoading={updateProduct.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this stock item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
