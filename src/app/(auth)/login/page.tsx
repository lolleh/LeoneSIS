"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { api } from "@/client/lib/api";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Loader2, ArrowRight, School } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: schools, isLoading: schoolsLoading } =
    api.school.listPublic.useQuery();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolId) {
      setError("Please select a school");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        schoolId,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password. Please try again.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-6 text-center">
          <div className="mx-auto">
            <img src="/logo.png" alt="LeoneSIS Logo" className="h-50 w-auto mx-auto" />
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="school" className="text-sm font-semibold">School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger id="school" className="h-11 rounded-xl border-2 focus:border-primary">
                  <SelectValue
                    placeholder={
                      schoolsLoading ? "Loading schools..." : "Select your school"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-primary" />
                        {school.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoading}
                className="h-11 rounded-xl border-2 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="h-11 rounded-xl border-2 focus:border-primary"
              />
            </div>
          </CardContent>

          <CardFooter className="pb-8">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover-lift"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs text-white/70">
        Powered by LeoneSIS &middot; Sierra Leone
      </p>
    </div>
  );
}
