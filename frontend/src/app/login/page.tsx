'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { UserPlus } from 'lucide-react';
import { AuthForm } from '../../components/auth';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLoginSuccess = () => {
    router.push('/');
  };

  if (user) {
    return null; // Prevent flash of login form
  }

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