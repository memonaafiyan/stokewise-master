import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  type?: 'daily_check' | 'manual';
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Find all sales with due date <= today and not paid
    const { data: overdueSales, error } = await supabase
      .from("sales")
      .select("*, vyapari(*), products(*)")
      .in("payment_status", ["pending", "partial", "overdue"])
      .lte("due_date", todayStr)
      .gt("remaining_amount", 0);

    if (error) throw error;

    const remindersSent = [];
    const emailsSent = [];

    for (const sale of overdueSales || []) {
      const dueDate = new Date(sale.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysOverdue > 0;
      const isDueToday = daysOverdue === 0;

      const customerName = sale.vyapari?.name || "Customer";
      const customerPhone = sale.vyapari?.contact || "";
      const customerEmail = sale.vyapari?.email || "";
      const productName = `${sale.products?.brand || ''} ${sale.products?.model || ''}`.trim() || "Product";
      const remainingAmount = Number(sale.remaining_amount).toLocaleString('en-IN');
      const formattedDueDate = dueDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // Generate WhatsApp message
      let whatsappMessage = "";
      if (isOverdue) {
        whatsappMessage = `🔔 *Payment Overdue Reminder*

Dear ${customerName},

Your payment for *${productName}* is overdue by *${daysOverdue} days*.

📅 Due Date: ${formattedDueDate}
💰 Amount Due: ₹${remainingAmount}

Please make the payment at your earliest convenience to avoid any inconvenience.

Thank you!
~Phonex Telecom
📞 7874455980`;
      } else if (isDueToday) {
        whatsappMessage = `⚠️ *Payment Due Today*

Dear ${customerName},

This is a reminder that your payment for *${productName}* is due today.

📅 Due Date: ${formattedDueDate}
💰 Amount Due: ₹${remainingAmount}

Please make the payment today.

Thank you!
~Phonex Telecom
📞 7874455980`;
      }

      // Create WhatsApp URL (for manual sending or integration)
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
        
        remindersSent.push({
          customer: customerName,
          phone: customerPhone,
          type: isOverdue ? "overdue" : "due_today",
          days_overdue: daysOverdue,
          whatsapp_url: whatsappUrl,
          message: whatsappMessage
        });
      }

      // Send email reminder if email exists
      if (customerEmail && resendApiKey) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${isOverdue ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .highlight { background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${isOverdue ? '#dc2626' : '#f59e0b'}; }
                .amount { font-size: 28px; font-weight: bold; color: ${isOverdue ? '#dc2626' : '#d97706'}; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${isOverdue ? '⚠️ Payment Overdue' : '🔔 Payment Due Today'}</h1>
                </div>
                <div class="content">
                  <p>Dear ${customerName},</p>
                  
                  <p>${isOverdue 
                    ? `Your payment for <strong>${productName}</strong> is overdue by <strong>${daysOverdue} days</strong>.`
                    : `This is a reminder that your payment for <strong>${productName}</strong> is due today.`
                  }</p>
                  
                  <div class="highlight">
                    <p><strong>Product:</strong> ${productName}</p>
                    <p><strong>Due Date:</strong> ${formattedDueDate}</p>
                    <p class="amount">Amount Due: ₹${remainingAmount}</p>
                  </div>

                  <p>Please make the payment at your earliest convenience${isOverdue ? ' to avoid any further inconvenience' : ''}.</p>

                  <p>Thank you for your business!</p>

                  <div class="footer">
                    <p><strong>Phonex Telecom</strong><br>
                    📞 7874455980<br>
                    📧 memonaafiyan01@gmail.com</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Phonex Telecom <onboarding@resend.dev>",
              to: [customerEmail],
              subject: isOverdue 
                ? `⚠️ Payment Overdue - ${daysOverdue} days (₹${remainingAmount})`
                : `🔔 Payment Due Today (₹${remainingAmount})`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            emailsSent.push({
              customer: customerName,
              email: customerEmail,
              type: isOverdue ? "overdue" : "due_today"
            });

            // Log reminder
            await supabase.from("email_reminders").insert({
              vyapari_id: sale.vyapari_id,
              sale_id: sale.id,
              reminder_type: isOverdue ? "overdue_email" : "due_today_email",
              email_sent_to: customerEmail,
            });
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${customerEmail}:`, emailError);
        }
      }

      // Update payment status to overdue if needed
      if (isOverdue && sale.payment_status !== 'overdue') {
        await supabase
          .from('sales')
          .update({ payment_status: 'overdue' })
          .eq('id', sale.id);
      }
    }

    console.log(`Reminders generated: ${remindersSent.length}, Emails sent: ${emailsSent.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        whatsapp_reminders: remindersSent.length,
        emails_sent: emailsSent.length,
        reminders: remindersSent,
        emails: emailsSent
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
