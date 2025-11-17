import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Filter } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/exportUtils";

export default function AuditLogs() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [action, setAction] = useState("");
  const [tableName, setTableName] = useState("");

  const { data: logs, isLoading } = useAuditLogs({
    startDate,
    endDate,
    action: action || undefined,
    tableName: tableName || undefined,
  });

  const handleExport = () => {
    if (!logs || logs.length === 0) return;
    
    const exportData = logs.map(log => ({
      'Date & Time': format(new Date(log.created_at), "dd MMM yyyy, hh:mm a"),
      'Action': log.action,
      'Table': log.table_name,
      'User ID': log.user_id,
      'Record ID': log.record_id || 'N/A',
    }));
    
    exportToExcel(exportData, `audit-logs-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "INSERT": return "default";
      case "UPDATE": return "secondary";
      case "DELETE": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">
            Track all system changes and user actions
          </p>
        </div>
        <Button onClick={handleExport} disabled={!logs || logs.length === 0}>
          <FileText className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Table</label>
              <Select value={tableName} onValueChange={setTableName}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="vyapari">Vyapari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Date & Time</th>
                    <th className="text-left p-4 font-medium text-sm">Action</th>
                    <th className="text-left p-4 font-medium text-sm">Table</th>
                    <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Record ID</th>
                    <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-4 text-sm">
                        {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}
                      </td>
                      <td className="p-4">
                        <Badge variant={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm capitalize">{log.table_name}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                        {log.record_id?.substring(0, 8) || 'N/A'}...
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">
                        {log.user_id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}