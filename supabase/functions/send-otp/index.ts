import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  otp: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: OTPRequest = await req.json();

    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - OTP generated but email not sent");
      // Return success even if email not sent - OTP is saved in DB
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP generated. Check database for code.",
          otp_code: otp // Only for development - remove in production
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #fff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; text-align: center; }
            .otp-box { background: #f0f9ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: monospace; }
            .timer { color: #dc2626; font-size: 14px; margin-top: 10px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset OTP</h1>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>You requested to reset your password for <strong>Stock Maker</strong>. Use the OTP below to proceed:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="timer">⏰ This code expires in 5 minutes</div>
              </div>
              
              <p>If you didn't request this, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
              <p>Stock Maker - Mobile Stock Management<br>
              This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Stock Maker <onboarding@resend.dev>",
        to: [email],
        subject: `${otp} - Your Password Reset OTP`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      // Still return success - OTP is in database
      return new Response(
        JSON.stringify({ success: true, message: "OTP generated. Email delivery may be delayed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const result = await response.json();
    console.log("OTP email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
