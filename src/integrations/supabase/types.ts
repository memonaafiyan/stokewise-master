export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_reminders: {
        Row: {
          email_sent_to: string
          id: string
          reminder_type: string
          sale_id: string
          sent_at: string
          vyapari_id: string
        }
        Insert: {
          email_sent_to: string
          id?: string
          reminder_type: string
          sale_id: string
          sent_at?: string
          vyapari_id: string
        }
        Update: {
          email_sent_to?: string
          id?: string
          reminder_type?: string
          sale_id?: string
          sent_at?: string
          vyapari_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminders_vyapari_id_fkey"
            columns: ["vyapari_id"]
            isOneToOne: false
            referencedRelation: "vyapari"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          id: string
          rate: number
          target_currency: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          id?: string
          rate: number
          target_currency: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          id?: string
          rate?: number
          target_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          sale_id: string
          vyapari_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          sale_id: string
          vyapari_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          sale_id?: string
          vyapari_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vyapari_id_fkey"
            columns: ["vyapari_id"]
            isOneToOne: false
            referencedRelation: "vyapari"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          color: string | null
          country_variant: string | null
          created_at: string
          created_by: string
          currency: string | null
          customer_name: string | null
          id: string
          imei: string | null
          low_stock_threshold: number | null
          model: string | null
          name: string | null
          notes: string | null
          purchase_price: number | null
          quantity: number
          selling_price: number | null
          sold: boolean | null
          sold_date: string | null
          storage: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color?: string | null
          country_variant?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          customer_name?: string | null
          id?: string
          imei?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name?: string | null
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          selling_price?: number | null
          sold?: boolean | null
          sold_date?: string | null
          storage?: string | null
          unit?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color?: string | null
          country_variant?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          customer_name?: string | null
          id?: string
          imei?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name?: string | null
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          selling_price?: number | null
          sold?: boolean | null
          sold_date?: string | null
          storage?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          created_by: string
          currency: string | null
          due_date: string
          id: string
          notes: string | null
          paid_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_id: string
          quantity: number
          rate: number
          remaining_amount: number
          sale_date: string
          total_amount: number
          vyapari_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string | null
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_id: string
          quantity: number
          rate: number
          remaining_amount: number
          sale_date?: string
          total_amount: number
          vyapari_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_id?: string
          quantity?: number
          rate?: number
          remaining_amount?: number
          sale_date?: string
          total_amount?: number
          vyapari_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vyapari_id_fkey"
            columns: ["vyapari_id"]
            isOneToOne: false
            referencedRelation: "vyapari"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          created_at: string
          gst_number: string | null
          id: string
          logo_url: string | null
          shop_address: string | null
          shop_email: string | null
          shop_name: string | null
          shop_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vyapari: {
        Row: {
          address: string | null
          contact: string
          created_at: string
          created_by: string
          credit_score: number
          email: string | null
          id: string
          last_transaction_date: string | null
          name: string
          remaining_balance: number
          total_paid: number
          total_purchased: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact: string
          created_at?: string
          created_by: string
          credit_score?: number
          email?: string | null
          id?: string
          last_transaction_date?: string | null
          name: string
          remaining_balance?: number
          total_paid?: number
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact?: string
          created_at?: string
          created_by?: string
          credit_score?: number
          email?: string | null
          id?: string
          last_transaction_date?: string | null
          name?: string
          remaining_balance?: number
          total_paid?: number
          total_purchased?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_credit_score: { Args: { _vyapari_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      payment_status: "pending" | "partial" | "paid" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      payment_status: ["pending", "partial", "paid", "overdue"],
    },
  },
} as const
