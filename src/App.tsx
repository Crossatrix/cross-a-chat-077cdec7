import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import LoadingScreen from "@/components/LoadingScreen";
import AnimatedRoutes from "@/components/AnimatedRoutes";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ThemeProvider>
            <TooltipProvider>
              {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
              <div className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AnimatedRoutes />
                </BrowserRouter>
              </div>
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
