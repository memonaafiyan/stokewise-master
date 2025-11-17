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
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const todayStr = today.toISOString().split("T")[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    const { data: sales, error } = await supabase
      .from("sales")
      .select("*, vyapari(*), products(*)")
      .in("payment_status", ["pending", "partial"])
      .or(`due_date.eq.${todayStr},due_date.eq.${threeDaysStr}`)
      .gt("remaining_amount", 0);

    if (error) throw error;

    const emailsSent = [];
    
    for (const sale of sales || []) {
      if (!sale.vyapari.email) continue;

      const isDueToday = sale.due_date === todayStr;
      const subject = isDueToday 
        ? "Payment Due Today - Reminder"
        : "Payment Due in 3 Days - Reminder";
      
      const dueAmount = Number(sale.remaining_amount).toLocaleString();
      const dueDate = new Date(sale.due_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .amount { font-size: 24px; font-weight: bold; color: #DC2626; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Payment Reminder</h1>
              </div>
              <div class="content">
                <p>Dear ${sale.vyapari.name},</p>
                
                <p>This is a friendly reminder about your upcoming payment.</p>
                
                <div class="highlight">
                  <p><strong>Product:</strong> ${sale.products.name}</p>
                  <p><strong>Quantity:</strong> ${sale.quantity} ${sale.products.unit}</p>
                  <p><strong>Due Date:</strong> ${dueDate}</p>
                  <p class="amount">Amount Due: ₹${dueAmount}</p>
                </div>

                ${isDueToday 
                  ? '<p style="color: #DC2626; font-weight: bold;">⚠️ Payment is due today. Please make the payment at your earliest convenience.</p>'
                  : '<p>Your payment is due in 3 days. Please ensure timely payment to maintain a good credit score.</p>'
                }

                <p>If you have already made the payment, please ignore this reminder.</p>

                <p>Thank you for your business!</p>

                <div class="footer">
                  <p>This is an automated reminder. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const emailResponse = await sendEmail(resendApiKey, {
          from: "Payment Reminders <onboarding@resend.dev>",
          to: [sale.vyapari.email],
          subject,
          html,
        });

        await supabase.from("email_reminders").insert({
          vyapari_id: sale.vyapari_id,
          sale_id: sale.id,
          reminder_type: "email",
          email_sent_to: sale.vyapari.email,
        });

        emailsSent.push({
          vyapari: sale.vyapari.name,
          email: sale.vyapari.email,
          type: isDueToday ? "due_today" : "due_in_3_days",
          messageId: emailResponse.id,
        });

        console.log(`Email sent to ${sale.vyapari.name} (${sale.vyapari.email})`);
      } catch (emailError) {
        console.error(`Failed to send email to ${sale.vyapari.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        details: emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});