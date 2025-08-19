"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { UserPlus } from "lucide-react";
import { AuthForm } from "../../components/auth";

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    // Use router.push for smoother navigation
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute top-4 right-4">
        <Link href="/signup">
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Sign Up
          </Button>
        </Link>
      </div>

      <AuthForm mode="login" onSuccess={handleLoginSuccess} />
    </div>
  );
}
