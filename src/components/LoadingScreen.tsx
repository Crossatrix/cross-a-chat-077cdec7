import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

// Define all lazy imports to preload
const lazyImports = [
  () => import("@/pages/Auth"),
  () => import("@/pages/Admin"),
  () => import("@/pages/Banned"),
  () => import("@/pages/Settings"),
  () => import("@/pages/GroupInvites"),
  () => import("@/pages/NotFound"),
];

// Typing effect hook
const useTypingEffect = (text: string, speed: number = 50) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return displayedText;
};

// Floating bubble component
const FloatingBubble = ({ delay, size, left, duration }: { delay: number; size: number; left: number; duration: number }) => (
  <div
    className="absolute rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm"
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      bottom: -size,
      animation: `float-up ${duration}s ease-in-out ${delay}s infinite`,
    }}
  />
);

const LoadingScreen = ({ onLoadComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing...");
  const typedStage = useTypingEffect(loadingStage, 40);

  useEffect(() => {
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 3000;

    const preloadAll = async () => {
      const totalSteps = lazyImports.length + 2;
      let currentStep = 0;

      const updateProgress = (stage: string) => {
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
        setLoadingStage(stage);
      };

      try {
        updateProgress("Loading core modules...");
        await new Promise((r) => setTimeout(r, 200));

        setLoadingStage("Loading pages...");
        const preloadPromises = lazyImports.map((importFn) => 
          importFn().then(() => {
            setProgress((prev) => Math.min(prev + (80 / lazyImports.length), 95));
          })
        );
        
        await Promise.all(preloadPromises);
        updateProgress("Preparing interface...");

        await new Promise((r) => setTimeout(r, 300));
        setProgress(100);
        setLoadingStage("Ready to chat!");

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);

        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onLoadComplete, 500);
        }, remainingTime + 200);
      } catch (error) {
        console.error("Preload error:", error);
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onLoadComplete, 500);
        }, remainingTime);
      }
    };

    preloadAll();
  }, [onLoadComplete]);

  // Generate random bubbles
  const bubbles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: Math.random() * 3,
    size: 8 + Math.random() * 24,
    left: 5 + Math.random() * 90,
    duration: 4 + Math.random() * 4,
  }));

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
        @keyframes icon-float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-8px) rotate(5deg);
          }
          75% {
            transform: translateY(-4px) rotate(-5deg);
          }
        }
      `}</style>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${
          fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Floating bubbles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {bubbles.map((bubble) => (
            <FloatingBubble key={bubble.id} {...bubble} />
          ))}
        </div>

        {/* Logo/Brand Animation */}
        <div className="relative mb-8">
          {/* Outer pulsing rings */}
          <div 
            className="absolute inset-0 w-24 h-24 -m-2 rounded-2xl bg-primary/10"
            style={{ animation: "pulse-ring 2s ease-in-out infinite" }}
          />
          <div 
            className="absolute inset-0 w-24 h-24 -m-2 rounded-2xl bg-primary/5"
            style={{ animation: "pulse-ring 2s ease-in-out 0.5s infinite" }}
          />
          
          {/* Main icon container */}
          <div 
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/20"
            style={{ animation: "icon-float 3s ease-in-out infinite" }}
          >
            <MessageCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
          
          {/* Rotating ring */}
          <div className="absolute inset-0 w-20 h-20">
            <div className="w-full h-full rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" style={{ animationDuration: "1.5s" }} />
          </div>
        </div>

        {/* App Name with gradient */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mb-3">
          Cross Chat
        </h1>
        
        {/* Typing effect text */}
        <div className="h-6 mb-6">
          <p className="text-muted-foreground text-sm">
            {typedStage}
            <span className="inline-block w-0.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
        
        <span className="text-sm font-medium text-muted-foreground mt-3">
          {Math.min(Math.round(progress), 100)}%
        </span>

        {/* Decorative dots */}
        <div className="absolute bottom-8 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/40"
              style={{
                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
