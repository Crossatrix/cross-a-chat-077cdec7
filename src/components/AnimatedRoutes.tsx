import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

// Eagerly load Index (main page)
import Index from "@/pages/Index";

// Lazy load non-critical routes
const Auth = lazy(() => import("@/pages/Auth"));
const Admin = lazy(() => import("@/pages/Admin"));
const Banned = lazy(() => import("@/pages/Banned"));
const Settings = lazy(() => import("@/pages/Settings"));
const GroupInvites = lazy(() => import("@/pages/GroupInvites"));
const Store = lazy(() => import("@/pages/Store"));
const Studio = lazy(() => import("@/pages/Studio"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const Support = lazy(() => import("@/pages/Support"));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  const { isMaintenanceMode, isAdmin, loading } = useMaintenanceMode();

  if (loading) return <LoadingSpinner />;

  // During maintenance, non-admins can only see maintenance + auth pages
  const isMaintenancePage = location.pathname === "/maintenance";
  const isAuthPage = location.pathname === "/auth";
  const isAdminPage = location.pathname === "/admin";

  if (isMaintenanceMode && !isAdmin && !isMaintenancePage && !isAuthPage) {
    return <Navigate to="/maintenance" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Index />
              </PageTransition>
            }
          />
          <Route
            path="/auth"
            element={
              <PageTransition>
                <Auth />
              </PageTransition>
            }
          />
          <Route
            path="/admin"
            element={
              <PageTransition>
                <Admin />
              </PageTransition>
            }
          />
          <Route
            path="/banned"
            element={
              <PageTransition>
                <Banned />
              </PageTransition>
            }
          />
          <Route
            path="/settings"
            element={
              <PageTransition>
                <Settings />
              </PageTransition>
            }
          />
          <Route
            path="/invites"
            element={
              <PageTransition>
                <GroupInvites />
              </PageTransition>
            }
          />
          <Route
            path="/store"
            element={
              <PageTransition>
                <Store />
              </PageTransition>
            }
          />
          <Route
            path="/studio"
            element={
              <PageTransition>
                <Studio />
              </PageTransition>
            }
          />
          <Route
            path="/maintenance"
            element={
              <PageTransition>
                <Maintenance />
              </PageTransition>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
