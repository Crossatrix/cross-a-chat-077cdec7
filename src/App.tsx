import { useEffect, useState } from "react";
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
import BetaPaywall from "@/components/BetaPaywall";
import { supabase } from "@/integrations/supabase/client";
import { checkBetaStatus, isPreviewDomain } from "@/utils/betaSubscription";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [betaUnlocked, setBetaUnlocked] = useState(false);
  const [needsBetaCheck, setNeedsBetaCheck] = useState(false);

  useEffect(() => {
    if (!isPreviewDomain()) {
      setBetaUnlocked(true);
      return;
    }
    const evaluate = async (userId: string | undefined) => {
      if (!userId) {
        setBetaUnlocked(true);
        setNeedsBetaCheck(false);
        return;
      }
      const ok = await checkBetaStatus(userId);
      setBetaUnlocked(ok);
      setNeedsBetaCheck(!ok);
    };
    supabase.auth.getSession().then(({ data }) => evaluate(data.session?.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      evaluate(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
                  {needsBetaCheck && !betaUnlocked && (
                    <BetaPaywall onUnlocked={() => { setBetaUnlocked(true); setNeedsBetaCheck(false); }} />
                  )}
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
