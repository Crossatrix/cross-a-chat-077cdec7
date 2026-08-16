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
import ModUIHost from "@/components/ModUIHost";
import ModFontHost from "@/components/ModFontHost";
import { supabase } from "@/integrations/supabase/client";
import { checkBetaStatus, isPreviewDomain } from "@/utils/betaSubscription";
import { emitModEvent } from "@/utils/modEvents";
import { syncInstalledModsFromAccount } from "@/utils/mods";
import { loadVideoCategories } from "@/utils/videoCategories";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [betaUnlocked, setBetaUnlocked] = useState(false);
  const [needsBetaCheck, setNeedsBetaCheck] = useState(false);

  useEffect(() => {
    emitModEvent("reload");
    loadVideoCategories();
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
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      evaluate(uid);
      if (uid) syncInstalledModsFromAccount(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === "SIGNED_IN") {
        emitModEvent("login", { userId: session?.user?.id });
        if (session?.user?.id) syncInstalledModsFromAccount(session.user.id);
      }
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
                  <ModUIHost />
                  <ModFontHost />
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
