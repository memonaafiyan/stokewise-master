import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, ArrowLeft, KeyRound, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthView = 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password';

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please check your credentials.");
        } else {
          toast.error(error.message);
        }
      } else {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        toast.success("Login successful! Welcome back.");
      }
    } catch (error: any) {
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        toast.success("Account created successfully! You can now login.");
        setView('login');
      }
    } catch (error: any) {
      toast.error("An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

      // Save OTP to database
      const { error: otpError } = await supabase
        .from('password_reset_otps')
        .insert({
          email,
          otp_code: otpCode,
          expires_at: expiresAt
        });

      if (otpError) throw otpError;

      // Send OTP via edge function
      const { error: sendError } = await supabase.functions.invoke('send-otp', {
        body: { email, otp: otpCode }
      });

      if (sendError) {
        console.error('Error sending OTP:', sendError);
        // Still proceed - OTP is saved, user can see it in dev
      }

      toast.success("OTP sent to your email. Please check your inbox.");
      setView('verify-otp');
    } catch (error: any) {
      toast.error("Failed to send OTP. Please try again.");
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify OTP from database
      const { data, error } = await supabase
        .from('password_reset_otps')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otp)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Invalid or expired OTP. Please try again.");
        return;
      }

      toast.success("OTP verified! Please set your new password.");
      setView('reset-password');
    } catch (error: any) {
      toast.error("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }

    setLoading(true);

    try {
      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('email', email)
        .eq('otp_code', otp);

      // Reset password using Supabase admin
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { email, newPassword, otp }
      });

      if (error) throw error;

      toast.success("Password reset successful! Please login with your new password.");
      setView('login');
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Failed to reset password. Please try again.");
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-11"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 h-11"
            required
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remember" 
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          />
          <Label htmlFor="remember" className="text-sm cursor-pointer">Remember me</Label>
        </div>
        <Button 
          type="button" 
          variant="link" 
          className="p-0 h-auto text-sm"
          onClick={() => setView('forgot-password')}
        >
          Forgot password?
        </Button>
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );

  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10 h-11"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-11"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 h-11"
            required
            minLength={6}
          />
        </div>
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        className="gap-2 p-0 h-auto"
        onClick={() => setView('login')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Button>
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Forgot Password?</h3>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a 6-digit OTP to reset your password.
        </p>
      </div>
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="forgot-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Sending OTP..." : "Send OTP"}
        </Button>
      </form>
    </div>
  );

  const renderVerifyOTPForm = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        className="gap-2 p-0 h-auto"
        onClick={() => setView('forgot-password')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Enter OTP</h3>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>
      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          OTP expires in 5 minutes
        </p>
        <Button type="submit" className="w-full h-11" disabled={loading || otp.length !== 6}>
          {loading ? "Verifying..." : "Verify OTP"}
        </Button>
        <Button 
          type="button" 
          variant="link" 
          className="w-full"
          onClick={() => handleForgotPassword({ preventDefault: () => {} } as React.FormEvent)}
        >
          Resend OTP
        </Button>
      </form>
    </div>
  );

  const renderResetPasswordForm = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-success" />
        </div>
        <h3 className="text-lg font-semibold">Set New Password</h3>
        <p className="text-sm text-muted-foreground">
          Create a strong password for your account
        </p>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-11"
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-11"
              required
              minLength={6}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">SM</span>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Stock Maker
          </CardTitle>
          <CardDescription>
            Mobile Stock Management Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'forgot-password' && renderForgotPasswordForm()}
          {view === 'verify-otp' && renderVerifyOTPForm()}
          {view === 'reset-password' && renderResetPasswordForm()}
          {(view === 'login' || view === 'signup') && (
            <Tabs value={view} onValueChange={(v) => setView(v as AuthView)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                {renderLoginForm()}
              </TabsContent>
              
              <TabsContent value="signup">
                {renderSignupForm()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
