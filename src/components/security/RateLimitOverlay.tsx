"use client";

import React from 'react';
import { useRateLimit } from '@xynes/auth-sdk';
import { Button } from '@lumia-ui/components';

/**
 * Rate Limit Overlay Component
 * Displays a modal-like overlay when the user is rate limited (429).
 * Blocks interaction until the coundown expires.
 */
export function RateLimitOverlay() {
  const { isRateLimited, remainingSeconds, reset } = useRateLimit();

  // Don't render anything if not rate limited
  if (!isRateLimited) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rate-limit-title"
        aria-describedby="rate-limit-desc"
        className="bg-background border border-border shadow-lg rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
             <svg 
               xmlns="http://www.w3.org/2000/svg" 
               width="24" 
               height="24" 
               viewBox="0 0 24 24" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="2" 
               strokeLinecap="round" 
               strokeLinejoin="round"
             >
               <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
               <path d="M12 9v4" />
               <path d="M12 17h.01" />
             </svg>
          </div>
          
          <h2 id="rate-limit-title" className="text-xl font-bold tracking-tight text-foreground">
            Too Many Attempts
          </h2>
          
          <p id="rate-limit-desc" className="text-muted-foreground">
            Please wait <span className="font-mono font-bold text-foreground mx-1">{remainingSeconds}</span> seconds before trying again.
          </p>
          
          <div className="w-full pt-4">
            <Button 
                className="w-full" 
                disabled={remainingSeconds > 0} 
                onClick={reset}
                variant={remainingSeconds > 0 ? "secondary" : undefined}
                size="lg"
            >
              {remainingSeconds > 0 ? `Try Again (${remainingSeconds}s)` : 'Try Again'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
