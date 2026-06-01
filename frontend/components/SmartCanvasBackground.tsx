import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../libs/utils';

interface SmartCanvasBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  opacity?: number; // range: 0 to 1, defaults to 0.20
}

export const SmartCanvasBackground: React.FC<SmartCanvasBackgroundProps> = ({
  children,
  className,
  opacity = 0.20,
}) => {
  // Configured with multiple diagonal intersecting glowing paths representing real-time telemetry beams
  const paths = [
    "M-100 150 L1200 800",
    "M100 -50 L1500 900",
    "M-50 300 L1400 1100",
    "M300 -100 L1600 700",
    "M-200 600 L1000 -100",
    "M500 1200 L-100 200"
  ];

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-[#1C1D22]", className)}>
      {/* Photon Beam Base Layer */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity }}
      >
        {/* Subtle grid of points */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)]" 
          style={{ backgroundSize: '24px 24px' }} 
        />
        
        {/* Radial Ambient Glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#ea580c]/20 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#00D8F6]/15 to-transparent blur-[100px]" />

        {/* Animated Beams SVG */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="beam-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0" />
              <stop offset="50%" stopColor="#ea580c" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beam-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D8F6" stopOpacity="0" />
              <stop offset="50%" stopColor="#00D8F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00D8F6" stopOpacity="0" />
            </linearGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {paths.map((path, idx) => {
            const isPurple = idx % 2 === 0;
            const duration = 8 + (idx * 3);
            const delay = idx * 1.5;

            return (
              <g key={idx}>
                {/* Background static path for reference */}
                <path
                  d={path}
                  fill="none"
                  stroke={isPurple ? "rgba(124, 90, 237, 0.03)" : "rgba(0, 216, 246, 0.03)"}
                  strokeWidth="2"
                />
                
                {/* Glowing animated beam */}
                <motion.path
                  d={path}
                  fill="none"
                  stroke={`url(#beam-gradient-${isPurple ? '1' : '2'})`}
                  strokeWidth={isPurple ? "3" : "2"}
                  filter="url(#glow)"
                  initial={{ pathLength: 0.2, pathOffset: 0 }}
                  animate={{
                    pathOffset: [0, 1.2],
                  }}
                  transition={{
                    duration,
                    repeat: Infinity,
                    ease: "linear",
                    delay,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Grid Canvas Wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
