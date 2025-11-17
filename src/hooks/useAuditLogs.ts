import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(filters?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  tableName?: string;
}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }
      if (filters?.tableName) {
        query = query.eq("table_name", filters.tableName);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}