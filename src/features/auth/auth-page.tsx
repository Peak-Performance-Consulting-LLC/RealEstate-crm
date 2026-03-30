import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/services/auth.service";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = signInSchema.extend({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  async function handleSignIn(values: SignInValues) {
    try {
      await signIn(values.email, values.password);
      toast.success("Signed in");
      navigate("/workspaces/select");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    }
  }

  async function handleSignUp(values: SignUpValues) {
    try {
      await signUp(values.email, values.password, values.firstName, values.lastName);
      toast.success("Account created. Check your inbox if email confirmation is enabled.");
      navigate("/workspaces/select");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex gap-2">
            <Button onClick={() => setMode("signin")} type="button" variant={mode === "signin" ? "default" : "outline"}>
              Sign in
            </Button>
            <Button onClick={() => setMode("signup")} type="button" variant={mode === "signup" ? "default" : "outline"}>
              Sign up
            </Button>
          </div>
          <CardTitle className="pt-4">{mode === "signin" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>{mode === "signin" ? "Access your workspaces and continue operating the CRM." : "New users start here, then create or join a workspace."}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "signin" ? (
            <form className="space-y-4" onSubmit={signInForm.handleSubmit(handleSignIn)}>
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" {...signInForm.register("email")} placeholder="owner@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" {...signInForm.register("password")} />
              </div>
              <Button className="w-full" type="submit">
                Sign in
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={signUpForm.handleSubmit(handleSignUp)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-first-name">First name</Label>
                  <Input id="signup-first-name" {...signUpForm.register("firstName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-last-name">Last name</Label>
                  <Input id="signup-last-name" {...signUpForm.register("lastName")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" {...signUpForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" {...signUpForm.register("password")} />
              </div>
              <Button className="w-full" type="submit">
                Create account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
