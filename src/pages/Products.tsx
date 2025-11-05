import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const mockProducts = [
  {
    id: 1,
    name: "Product A",
    category: "Electronics",
    quantity: 45,
    unit: "pcs",
    price: 2500,
    lowStock: false,
  },
  {
    id: 2,
    name: "Product B",
    category: "Hardware",
    quantity: 8,
    unit: "pcs",
    price: 1200,
    lowStock: true,
  },
  {
    id: 3,
    name: "Product C",
    category: "Accessories",
    quantity: 120,
    unit: "pcs",
    price: 450,
    lowStock: false,
  },
  {
    id: 4,
    name: "Product D",
    category: "Electronics",
    quantity: 5,
    unit: "pcs",
    price: 3200,
    lowStock: true,
  },
  {
    id: 5,
    name: "Product E",
    category: "Tools",
    quantity: 67,
    unit: "pcs",
    price: 890,
    lowStock: false,
  },
];

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Stock Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    {product.quantity} {product.unit}
                  </TableCell>
                  <TableCell>₹{product.price.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">
                    ₹{(product.quantity * product.price).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {product.lowStock ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
