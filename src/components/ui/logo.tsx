
import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconOnly?: boolean
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
        {/* Glow effect background */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          className="h-10 w-10 relative z-10 drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
          
          {/* Stylized 'A' shape matching the user request */}
          <path 
            d="M50 15L85 85H72L50 45L28 85H15L50 15Z" 
            fill="url(#aurora-grad)" 
          />
          
          {/* Swirl lines/stelas */}
          <path 
            d="M30 75C40 65 60 65 70 75" 
            stroke="white" 
            strokeWidth="4" 
            strokeLinecap="round" 
            opacity="0.6"
          />
          <path 
            d="M35 85C45 78 55 78 65 85" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            opacity="0.4"
          />
          
          {/* Outer orbital stelar */}
          <path 
            d="M80 30C85 45 80 60 70 70" 
            stroke="url(#aurora-grad)" 
            strokeWidth="2" 
            strokeDasharray="4 4"
          />
        </svg>
      </div>
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Aurora
          </span>
          <span className="text-[8px] font-black tracking-[0.4em] text-slate-300 uppercase mt-0.5">
            Operating System
          </span>
        </div>
      )}
    </div>
  )
}
