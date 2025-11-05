import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const mockVyapari = [
  {
    id: 1,
    name: "Rajesh Trading Co.",
    contact: "+91 98765 43210",
    totalPurchased: 125000,
    totalPaid: 98000,
    remaining: 27000,
    creditScore: 75,
    lastTransaction: "2024-01-15",
  },
  {
    id: 2,
    name: "Kumar Stores",
    contact: "+91 98765 43211",
    totalPurchased: 85000,
    totalPaid: 70000,
    remaining: 15000,
    creditScore: 85,
    lastTransaction: "2024-01-18",
  },
  {
    id: 3,
    name: "Sharma & Sons",
    contact: "+91 98765 43212",
    totalPurchased: 200000,
    totalPaid: 150000,
    remaining: 50000,
    creditScore: 45,
    lastTransaction: "2024-01-10",
  },
  {
    id: 4,
    name: "Patel Wholesale",
    contact: "+91 98765 43213",
    totalPurchased: 95000,
    totalPaid: 88000,
    remaining: 7000,
    creditScore: 92,
    lastTransaction: "2024-01-20",
  },
];

const getCreditScoreBadge = (score: number) => {
  if (score >= 80) {
    return <Badge className="bg-success/10 text-success border-success/20">Excellent</Badge>;
  } else if (score >= 50) {
    return <Badge className="bg-warning/10 text-warning border-warning/20">Average</Badge>;
  } else {
    return <Badge variant="destructive">Risky</Badge>;
  }
};

export default function Vyapari() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVyapari = mockVyapari.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vyapari Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage your customers and track their credits
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Vyapari
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vyapari..."
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Purchased</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Credit Score</TableHead>
                <TableHead>Last Transaction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVyapari.map((vyapari) => (
                <TableRow key={vyapari.id}>
                  <TableCell className="font-medium">{vyapari.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vyapari.contact}</TableCell>
                  <TableCell>₹{vyapari.totalPurchased.toLocaleString()}</TableCell>
                  <TableCell className="text-success">₹{vyapari.totalPaid.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-destructive">
                    ₹{vyapari.remaining.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{vyapari.creditScore}</span>
                      {getCreditScoreBadge(vyapari.creditScore)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(vyapari.lastTransaction).toLocaleDateString()}
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
