import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationResult {
  type: 'email' | 'whatsapp' | 'sms';
  success: boolean;
  recipient: string;
  error?: string;
}

// Send Email via Resend
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Payment Reminders <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await response.json();
    console.log(`Email sent to ${to}:`, result);
    return response.ok;
  } catch (error) {
    console.error(`Email error for ${to}:`, error);
    return false;
  }
}

// Send WhatsApp via UltraMsg
async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  
  if (!instanceId || !token) {
    console.log("UltraMsg not configured, skipping WhatsApp");
    return false;
  }

  try {
    // Format phone number (remove + and spaces)
    const formattedPhone = phone.replace(/[\s+\-()]/g, '');
    
    const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        to: formattedPhone,
        body: message,
      }),
    });

    const result = await response.json();
    console.log(`WhatsApp sent to ${phone}:`, result);
    return response.ok && !result.error;
  } catch (error) {
    console.error(`WhatsApp error for ${phone}:`, error);
    return false;
  }
}

// Send SMS via Twilio
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !twilioPhone) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    // Format phone number with country code if missing
    let formattedPhone = phone.replace(/[\s\-()]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; // Default to India
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhone,
          Body: message,
        }),
      }
    );

    const result = await response.json();
    console.log(`SMS sent to ${phone}:`, result);
    return response.ok;
  } catch (error) {
    console.error(`SMS error for ${phone}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting automated notification check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate reminder dates
    const oneDayBefore = new Date(today);
    oneDayBefore.setDate(today.getDate() + 1);
    const oneDayBeforeStr = oneDayBefore.toISOString().split('T')[0];

    const threeDaysBefore = new Date(today);
    threeDaysBefore.setDate(today.getDate() + 3);
    const threeDaysBeforeStr = threeDaysBefore.toISOString().split('T')[0];

    // Fetch sales that need reminders
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        due_date,
        remaining_amount,
        total_amount,
        payment_status,
        vyapari:vyapari_id (
          id,
          name,
          contact,
          email
        ),
        product:product_id (
          name
        )
      `)
      .in('payment_status', ['pending', 'partial', 'overdue'])
      .gt('remaining_amount', 0)
      .lte('due_date', threeDaysBeforeStr);

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw salesError;
    }

    console.log(`Found ${sales?.length || 0} sales to process`);

    const results: NotificationResult[] = [];
    const processedSales: string[] = [];

    for (const sale of sales || []) {
      const vyapari = sale.vyapari as any;
      const product = sale.product as any;
      
      if (!vyapari) continue;

      const dueDate = new Date(sale.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let reminderType = '';
      let urgency = '';
      
      if (daysUntilDue < 0) {
        reminderType = 'overdue';
        urgency = `⚠️ OVERDUE by ${Math.abs(daysUntilDue)} day(s)`;
      } else if (daysUntilDue === 0) {
        reminderType = 'due_today';
        urgency = '🔴 DUE TODAY';
      } else if (daysUntilDue === 1) {
        reminderType = 'due_tomorrow';
        urgency = '🟠 Due Tomorrow';
      } else if (daysUntilDue <= 3) {
        reminderType = 'due_soon';
        urgency = `🟡 Due in ${daysUntilDue} days`;
      }

      if (!reminderType) continue;

      // Check if we already sent a reminder today for this sale
      const { data: existingReminder } = await supabase
        .from('email_reminders')
        .select('id')
        .eq('sale_id', sale.id)
        .eq('reminder_type', reminderType)
        .gte('sent_at', todayStr)
        .limit(1);

      if (existingReminder && existingReminder.length > 0) {
        console.log(`Already sent ${reminderType} reminder for sale ${sale.id} today`);
        continue;
      }

      const formattedAmount = `₹${sale.remaining_amount.toLocaleString('en-IN')}`;
      const formattedDueDate = dueDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Prepare messages
      const smsWhatsAppMessage = `${urgency}

Dear ${vyapari.name},

Payment reminder for ${product?.name || 'your purchase'}:
Amount Due: ${formattedAmount}
Due Date: ${formattedDueDate}

Please clear your dues at the earliest.

Thank you!`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${daysUntilDue < 0 ? '#ef4444' : daysUntilDue === 0 ? '#f97316' : '#eab308'}; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0;">${urgency}</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>${vyapari.name}</strong>,</p>
            <p>This is a reminder for your pending payment:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Product</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${product?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Amount Due</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #ef4444; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Due Date</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${formattedDueDate}</td>
              </tr>
            </table>
            <p>Please clear your dues at the earliest to avoid any inconvenience.</p>
            <p style="margin-top: 30px;">Thank you for your business!</p>
          </div>
        </div>
      `;

      // Send Email
      if (vyapari.email) {
        const emailSuccess = await sendEmail(
          vyapari.email,
          `Payment Reminder: ${formattedAmount} - ${reminderType === 'overdue' ? 'OVERDUE' : 'Due ' + formattedDueDate}`,
          emailHtml
        );
        results.push({
          type: 'email',
          success: emailSuccess,
          recipient: vyapari.email,
        });
      }

      // Send WhatsApp
      if (vyapari.contact) {
        const whatsappSuccess = await sendWhatsApp(vyapari.contact, smsWhatsAppMessage);
        results.push({
          type: 'whatsapp',
          success: whatsappSuccess,
          recipient: vyapari.contact,
        });
      }

      // Send SMS
      if (vyapari.contact) {
        const smsSuccess = await sendSMS(vyapari.contact, smsWhatsAppMessage);
        results.push({
          type: 'sms',
          success: smsSuccess,
          recipient: vyapari.contact,
        });
      }

      // Record the reminder
      await supabase.from('email_reminders').insert({
        sale_id: sale.id,
        vyapari_id: vyapari.id,
        email_sent_to: vyapari.email || vyapari.contact,
        reminder_type: reminderType,
      });

      // Update overdue status
      if (daysUntilDue < 0 && sale.payment_status !== 'overdue') {
        await supabase
          .from('sales')
          .update({ payment_status: 'overdue' })
          .eq('id', sale.id);
      }

      processedSales.push(sale.id);
    }

    const summary = {
      processed: processedSales.length,
      emails: results.filter(r => r.type === 'email').length,
      emailsSuccess: results.filter(r => r.type === 'email' && r.success).length,
      whatsapp: results.filter(r => r.type === 'whatsapp').length,
      whatsappSuccess: results.filter(r => r.type === 'whatsapp' && r.success).length,
      sms: results.filter(r => r.type === 'sms').length,
      smsSuccess: results.filter(r => r.type === 'sms' && r.success).length,
    };

    console.log("Notification summary:", summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automated notifications processed",
        summary,
        details: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in automated notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
