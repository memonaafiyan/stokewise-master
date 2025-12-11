import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  newPassword: string;
  otp: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword, otp }: ResetPasswordRequest = await req.json();

    if (!email || !newPassword || !otp) {
      throw new Error("Email, new password, and OTP are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP one more time
    const { data: otpData, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError || !otpData || otpData.length === 0) {
      throw new Error("Invalid or expired OTP");
    }

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) throw userError;

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpData[0].id);

    console.log(`Password reset successful for: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
