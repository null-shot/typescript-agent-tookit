'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RegistryLoadingScreenProps {
  isLoading: boolean;
  progress?: number;
  status?: string;
  error?: string;
  onRetry?: () => void;
}

export function RegistryLoadingScreen({
  isLoading,
  progress = 0,
  status = 'Loading MCP Registry...',
  error,
  onRetry
}: RegistryLoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
  const [shouldStartFade, setShouldStartFade] = useState(false);
  const [fadeCompleted, setFadeCompleted] = useState(false);

  // Track animation start time and reset states
  useEffect(() => {
    if (isLoading) {
      if (animationStartTime === null) {
        setAnimationStartTime(Date.now());
      }
      // Reset all fade states when loading starts
      setShouldStartFade(false);
      setFadeOut(false);
      setFadeCompleted(false);
    }
  }, [isLoading, animationStartTime]);

  // Animated dots effect
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle completion with minimum animation time
  useEffect(() => {
    if (!isLoading && !error && animationStartTime) {
      const elapsed = Date.now() - animationStartTime;
      const minAnimationTime = 1600; // One complete cycle (1.6s)
      
      if (elapsed >= minAnimationTime) {
        // Animation has run for at least one cycle, start fade immediately
        setShouldStartFade(true);
      } else {
        // Wait for remaining time to complete one cycle
        const remainingTime = minAnimationTime - elapsed;
        setTimeout(() => {
          setShouldStartFade(true);
        }, remainingTime);
      }
         } else if (error) {
       // Reset states on error
       setShouldStartFade(false);
       setFadeOut(false);
       setFadeCompleted(false);
     }
  }, [isLoading, error, animationStartTime]);

  // Start fade out after minimum animation time
  useEffect(() => {
    if (shouldStartFade && !fadeOut) {
      setFadeOut(true);
      // After fade animation completes (500ms), mark as completed
      setTimeout(() => {
        setFadeCompleted(true);
      }, 500);
    }
  }, [shouldStartFade, fadeOut]);

  // Don't render if fade has fully completed
  if (fadeCompleted && !isLoading && !error) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-500",
        "bg-gradient-to-br from-[#1A1B28] via-[#222531] to-[#2A2B3E]",
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            <div className="w-1 h-1 bg-white/10 rounded-full" />
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {error ? (
          // Error state
          <div className="space-y-6">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-red-500/20 rounded-full" />
              <div className="absolute inset-2 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-400">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">
                Failed to Load Registry
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {error}
              </p>
            </div>

            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white rounded-lg hover:from-[#0038A0] hover:to-[#724BED] transition-all duration-200 font-medium text-sm"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          // Loading state
          <div className="space-y-8">
            {/* Chat-style Loading Animation */}
            <div className="w-24 h-24 mx-auto relative flex items-center justify-center">
              {/* Agent avatar with animated logo - same as chat */}
              <img 
                src="/images/badge_light_bg.png" 
                alt="Loading"
                className="w-24 h-24 rounded-lg"
                style={{
                  animation: "iconThinking 1.6s infinite ease-in-out",
                  filter: "drop-shadow(0 0 12px rgba(120, 73, 239, 0.6))",
                  transition: "filter 0.3s ease"
                }}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">
                Loading MCP Registry
              </h2>
              
              <p className="text-white/60 text-lg">
                {status}{dots}
              </p>

              {/* Progress bar if progress is provided */}
              {progress > 0 && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#7849EF] to-[#326CD8] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-white/40 text-sm mt-2">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}

              <div className="space-y-2 text-white/40 text-sm">
                <p>📡 Fetching official registry data</p>
                <p>🔍 Filtering NPX-compatible servers</p>
                <p>💾 Caching for faster loading</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation - Same as chat component */}
      <style jsx>{`
        @keyframes iconThinking {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          12.5% {
            transform: scale(1.08) rotate(45deg);
            opacity: 0.85;
          }
          25% {
            transform: scale(1.05) rotate(90deg);
            opacity: 0.9;
          }
          37.5% {
            transform: scale(1.08) rotate(135deg);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.02) rotate(180deg);
            opacity: 0.95;
          }
          62.5% {
            transform: scale(1.08) rotate(225deg);
            opacity: 0.85;
          }
          75% {
            transform: scale(1.05) rotate(270deg);
            opacity: 0.9;
          }
          87.5% {
            transform: scale(1.08) rotate(315deg);
            opacity: 0.85;
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 