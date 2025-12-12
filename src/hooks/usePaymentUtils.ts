// ============================================
// PAYMENT UTILITIES - Backend Logic Functions
// ============================================
// Place this file in: src/hooks/usePaymentUtils.ts

import { supabase } from "@/integrations/supabase/client";

// Types for payment utilities
export interface Merchant {
  id: string;
  name: string;
  email: string | null;
  contact: string;
  total_purchased: number;
  total_paid: number;
  remaining_balance: number;
  credit_score: number;
  overdueCount?: number;
  totalOverdueAmount?: number;
}

export interface OverduePayment {
  id: string;
  vyapari_id: string;
  product_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_status: string;
  merchant?: Merchant;
}

// ============================================
// 1. CHECK RISKY MERCHANTS
// Returns list of merchants with repeated late payments or high overdue amounts
// Risky = overdueCount >= 3 OR totalOverdueAmount >= 20000
// ============================================
export async function checkRiskyMerchants(): Promise<Merchant[]> {
  try {
    // Get all merchants
    const { data: merchants, error: merchantError } = await supabase
      .from("vyapari")
      .select("*");

    if (merchantError) throw merchantError;

    // Get all overdue sales
    const { data: overdueSales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .in("payment_status", ["overdue", "pending"])
      .lt("due_date", new Date().toISOString().split("T")[0]);

    if (salesError) throw salesError;

    // Calculate overdue stats per merchant
    const merchantStats: Record<string, { overdueCount: number; totalOverdueAmount: number }> = {};

    overdueSales?.forEach((sale) => {
      const vyapariId = sale.vyapari_id;
      if (!merchantStats[vyapariId]) {
        merchantStats[vyapariId] = { overdueCount: 0, totalOverdueAmount: 0 };
      }
      merchantStats[vyapariId].overdueCount += 1;
      merchantStats[vyapariId].totalOverdueAmount += Number(sale.remaining_amount) || 0;
    });

    // Filter risky merchants (overdueCount >= 3 OR totalOverdueAmount >= 20000)
    const riskyMerchants = merchants
      ?.filter((merchant) => {
        const stats = merchantStats[merchant.id];
        if (!stats) return false;
        return stats.overdueCount >= 3 || stats.totalOverdueAmount >= 20000;
      })
      .map((merchant) => ({
        ...merchant,
        overdueCount: merchantStats[merchant.id]?.overdueCount || 0,
        totalOverdueAmount: merchantStats[merchant.id]?.totalOverdueAmount || 0,
      })) || [];

    console.log("[checkRiskyMerchants] Found risky merchants:", riskyMerchants.length);
    return riskyMerchants;
  } catch (error) {
    console.error("[checkRiskyMerchants] Error:", error);
    throw error;
  }
}

// ============================================
// 2. CHECK OVERDUE PAYMENTS
// Returns list of payments where due_date < current date
// ============================================
export async function checkOverduePayments(): Promise<OverduePayment[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get overdue sales with merchant info
    const { data: overdueSales, error } = await supabase
      .from("sales")
      .select(`
        *,
        vyapari:vyapari_id (*)
      `)
      .in("payment_status", ["pending", "partial", "overdue"])
      .lt("due_date", today);

    if (error) throw error;

    const overduePayments: OverduePayment[] = (overdueSales || []).map((sale) => ({
      id: sale.id,
      vyapari_id: sale.vyapari_id,
      product_id: sale.product_id,
      total_amount: sale.total_amount,
      paid_amount: sale.paid_amount,
      remaining_amount: sale.remaining_amount,
      due_date: sale.due_date,
      payment_status: sale.payment_status,
      merchant: sale.vyapari as Merchant,
    }));

    console.log("[checkOverduePayments] Found overdue payments:", overduePayments.length);
    return overduePayments;
  } catch (error) {
    console.error("[checkOverduePayments] Error:", error);
    throw error;
  }
}

// ============================================
// 3. SEND EMAIL REMINDER
// Sends email reminder via edge function
// ============================================
export async function sendEmailReminder(merchant: Merchant, overdueAmount: number, dueDate: string): Promise<boolean> {
  try {
    if (!merchant.email) {
      console.warn("[sendEmailReminder] No email for merchant:", merchant.name);
      return false;
    }

    const { data, error } = await supabase.functions.invoke("send-whatsapp-reminder", {
      body: {
        type: "email_only",
        merchant: {
          name: merchant.name,
          email: merchant.email,
          phone: merchant.contact,
          amount: overdueAmount,
          dueDate: dueDate,
        },
      },
    });

    if (error) throw error;

    console.log("[sendEmailReminder] Email sent to:", merchant.email);
    return true;
  } catch (error) {
    console.error("[sendEmailReminder] Error:", error);
    return false;
  }
}

// ============================================
// 4. SEND WHATSAPP REMINDER
// Sends WhatsApp reminder via edge function
// ============================================
export async function sendWhatsAppReminder(merchant: Merchant, overdueAmount: number, dueDate: string): Promise<string> {
  try {
    if (!merchant.contact) {
      console.warn("[sendWhatsAppReminder] No phone for merchant:", merchant.name);
      return "";
    }

    // Generate WhatsApp URL for direct messaging
    const message = `🔔 Payment Reminder

Dear ${merchant.name},

Your payment of ₹${overdueAmount.toLocaleString("en-IN")} was due on ${new Date(dueDate).toLocaleDateString("en-IN")}.

Please clear your dues at the earliest.

Thank you,
Phonex Telecom
📞 7874455980`;

    const phoneNumber = merchant.contact.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phoneNumber.startsWith("91") ? phoneNumber : "91" + phoneNumber}?text=${encodeURIComponent(message)}`;

    console.log("[sendWhatsAppReminder] WhatsApp URL generated for:", merchant.name);
    return whatsappUrl;
  } catch (error) {
    console.error("[sendWhatsAppReminder] Error:", error);
    return "";
  }
}

// ============================================
// 5. PROCESS ALL OVERDUE REMINDERS
// Master function to check and send all reminders
// ============================================
export async function processOverdueReminders(): Promise<{
  emailsSent: number;
  whatsappLinks: string[];
  errors: string[];
}> {
  const result = {
    emailsSent: 0,
    whatsappLinks: [] as string[],
    errors: [] as string[],
  };

  try {
    const overduePayments = await checkOverduePayments();

    for (const payment of overduePayments) {
      if (!payment.merchant) continue;

      // Send email
      const emailSent = await sendEmailReminder(
        payment.merchant,
        payment.remaining_amount,
        payment.due_date
      );
      if (emailSent) result.emailsSent++;

      // Generate WhatsApp link
      const whatsappUrl = await sendWhatsAppReminder(
        payment.merchant,
        payment.remaining_amount,
        payment.due_date
      );
      if (whatsappUrl) result.whatsappLinks.push(whatsappUrl);
    }

    console.log("[processOverdueReminders] Completed:", result);
  } catch (error: any) {
    result.errors.push(error.message);
    console.error("[processOverdueReminders] Error:", error);
  }

  return result;
}

// ============================================
// 6. ADD PRODUCT TO PAYMENT (for Payments module)
// Backend logic for adding product inside payments
// ============================================
export interface PaymentProductInput {
  vyapari_id: string;
  product_id: string;
  quantity: number;
  rate: number;
  due_date: string;
  notes?: string;
  created_by: string;
}

export async function addProductToPayment(input: PaymentProductInput): Promise<{ success: boolean; error?: string; saleId?: string }> {
  try {
    // Validation
    if (!input.vyapari_id) {
      return { success: false, error: "Merchant (vyapari_id) is required" };
    }
    if (!input.product_id) {
      return { success: false, error: "Product (product_id) is required" };
    }
    if (!input.quantity || input.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than 0" };
    }
    if (!input.rate || input.rate <= 0) {
      return { success: false, error: "Rate must be greater than 0" };
    }
    if (!input.due_date) {
      return { success: false, error: "Due date is required" };
    }
    if (!input.created_by) {
      return { success: false, error: "Created by (user id) is required" };
    }

    const total_amount = input.quantity * input.rate;

    const { data, error } = await supabase
      .from("sales")
      .insert({
        vyapari_id: input.vyapari_id,
        product_id: input.product_id,
        quantity: input.quantity,
        rate: input.rate,
        total_amount: total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        due_date: input.due_date,
        payment_status: "pending",
        notes: input.notes || null,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[addProductToPayment] Sale created:", data.id);
    return { success: true, saleId: data.id };
  } catch (error: any) {
    console.error("[addProductToPayment] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// REACT HOOK - usePaymentUtils
// Provides all payment utility functions
// ============================================
export function usePaymentUtils() {
  return {
    checkRiskyMerchants,
    checkOverduePayments,
    sendEmailReminder,
    sendWhatsAppReminder,
    processOverdueReminders,
    addProductToPayment,
  };
}
