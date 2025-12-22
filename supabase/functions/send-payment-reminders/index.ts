import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

async function sendEmail(apiKey: string, emailData: ResendEmailRequest) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - skipping email reminders");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: "No API key configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const today = new Date();
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const todayStr = today.toISOString().split("T")[0];
    const oneDayStr = oneDayFromNow.toISOString().split("T")[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    console.log(`[AUTO REMINDER] Checking for reminders - Today: ${todayStr}, 1 day: ${oneDayStr}, 3 days: ${threeDaysStr}`);

    // Fetch sales due today, in 1 day, or in 3 days
    const { data: sales, error } = await supabase
      .from("sales")
      .select("*, vyapari(*), products(*)")
      .in("payment_status", ["pending", "partial"])
      .or(`due_date.eq.${todayStr},due_date.eq.${oneDayStr},due_date.eq.${threeDaysStr}`)
      .gt("remaining_amount", 0);

    if (error) throw error;

    console.log(`[AUTO REMINDER] Found ${sales?.length || 0} sales to process`);

    const emailsSent = [];
    const whatsappReminders = [];
    
    for (const sale of sales || []) {
      const isDueToday = sale.due_date === todayStr;
      const isDueIn1Day = sale.due_date === oneDayStr;
      const isDueIn3Days = sale.due_date === threeDaysStr;

      const dueAmount = Number(sale.remaining_amount).toLocaleString("en-IN");
      const productName = `${sale.products?.brand || ""} ${sale.products?.model || ""}`.trim() || "Product";
      const customerName = sale.vyapari?.name || "Customer";
      const customerPhone = sale.vyapari?.contact || "";
      const customerEmail = sale.vyapari?.email || "";
      const dueDate = new Date(sale.due_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // Generate and store WhatsApp reminder (auto-generated URLs for integration)
      if (customerPhone) {
        let whatsappMessage = "";
        if (isDueToday) {
          whatsappMessage = `⚠️ *URGENT: Payment Due Today*

Dear ${customerName},

Your payment for *${productName}* is due TODAY.

📅 Due Date: ${dueDate}
💰 Amount Due: ₹${dueAmount}

Please make the payment immediately.

Thank you!
~Phonex Telecom
📞 7874455980`;
        } else if (isDueIn1Day) {
          whatsappMessage = `🔔 *Payment Due Tomorrow*

Dear ${customerName},

Your payment for *${productName}* is due tomorrow.

📅 Due Date: ${dueDate}
💰 Amount Due: ₹${dueAmount}

Please arrange the payment.

Thank you!
~Phonex Telecom
📞 7874455980`;
        } else if (isDueIn3Days) {
          whatsappMessage = `📅 *Payment Reminder - 3 Days Left*

Dear ${customerName},

Your payment for *${productName}* is due in 3 days.

📅 Due Date: ${dueDate}
💰 Amount Due: ₹${dueAmount}

Please ensure timely payment.

Thank you!
~Phonex Telecom
📞 7874455980`;
        }

        const cleanPhone = customerPhone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
        
        whatsappReminders.push({
          vyapari: customerName,
          phone: customerPhone,
          type: isDueToday ? "due_today" : isDueIn1Day ? "due_1_day" : "due_3_days",
          whatsapp_url: whatsappUrl,
        });
        
        console.log(`[AUTO REMINDER] WhatsApp reminder generated for ${customerName} (${customerPhone})`);
      }

      // Send email reminder automatically
      if (customerEmail) {
        let subject = "";
        let urgencyMessage = "";

        if (isDueToday) {
          subject = "⚠️ Payment Due Today - Urgent Reminder";
          urgencyMessage = '<p style="color: #DC2626; font-weight: bold; font-size: 18px;">⚠️ PAYMENT IS DUE TODAY! Please make the payment immediately.</p>';
        } else if (isDueIn1Day) {
          subject = "🔔 Payment Due Tomorrow - Reminder";
          urgencyMessage = '<p style="color: #F59E0B; font-weight: bold;">⏰ Your payment is due tomorrow. Please arrange the payment.</p>';
        } else if (isDueIn3Days) {
          subject = "📅 Payment Due in 3 Days - Reminder";
          urgencyMessage = '<p>Your payment is due in 3 days. Please ensure timely payment to maintain a good credit score.</p>';
        }

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 25px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
                .amount { font-size: 28px; font-weight: bold; color: #DC2626; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
                .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">💳 Payment Reminder</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Phonex Telecom</p>
                </div>
                <div class="content">
                  <p>Dear <strong>${customerName}</strong>,</p>
                  
                  ${urgencyMessage}
                  
                  <div class="highlight">
                    <p style="margin: 5px 0;"><strong>📦 Product:</strong> ${productName}</p>
                    <p style="margin: 5px 0;"><strong>📊 Quantity:</strong> ${sale.quantity}</p>
                    <p style="margin: 5px 0;"><strong>📅 Due Date:</strong> ${dueDate}</p>
                    <p style="margin: 15px 0 5px 0;"><strong>Amount Due:</strong></p>
                    <p class="amount">₹${dueAmount}</p>
                  </div>

                  <p>If you have already made the payment, please ignore this reminder.</p>

                  <p style="margin-top: 25px;">For any queries, contact us:</p>
                  <p>📞 <strong>7874455980</strong></p>

                  <p style="margin-top: 25px;">Thank you for your business!</p>

                  <div class="footer">
                    <p>This is an automated reminder from Phonex Telecom.</p>
                    <p>📍 Ahmedabad | 📧 memonaafiyan01@gmail.com</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        try {
          const emailResponse = await sendEmail(resendApiKey, {
            from: "Phonex Telecom <onboarding@resend.dev>",
            to: [customerEmail],
            subject,
            html,
          });

          await supabase.from("email_reminders").insert({
            vyapari_id: sale.vyapari_id,
            sale_id: sale.id,
            reminder_type: isDueToday ? "due_today" : isDueIn1Day ? "due_1_day" : "due_3_days",
            email_sent_to: customerEmail,
          });

          emailsSent.push({
            vyapari: customerName,
            email: customerEmail,
            type: isDueToday ? "due_today" : isDueIn1Day ? "due_1_day" : "due_3_days",
            messageId: emailResponse.id,
          });

          console.log(`[AUTO REMINDER] Email sent to ${customerName} (${customerEmail}) - ${isDueToday ? 'Due Today' : isDueIn1Day ? 'Due in 1 day' : 'Due in 3 days'}`);
        } catch (emailError) {
          console.error(`[AUTO REMINDER] Failed to send email to ${customerEmail}:`, emailError);
        }
      }
    }

    console.log(`[AUTO REMINDER] Total emails sent: ${emailsSent.length}, WhatsApp reminders: ${whatsappReminders.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        whatsappReminders: whatsappReminders.length,
        emails: emailsSent,
        whatsapp: whatsappReminders,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[AUTO REMINDER] Error in send-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
