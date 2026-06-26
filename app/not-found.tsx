'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full blur-xl"></div>
            <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-lg">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-2">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h2>

        {/* Error Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4" />
            Home Page
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Need help? Here are some helpful links:
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              Profile
            </button>
            <button
              onClick={() => router.push('/login')}
              className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
