import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCapacitorInit } from '@/hooks/use-capacitor-init';
import LaunchSplash from '@/components/LaunchSplash';
import { Capacitor } from '@capacitor/core';
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppContent = () => {
  useCapacitorInit();
  const [showLaunchSplash, setShowLaunchSplash] = useState(() => Capacitor.isNativePlatform());
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  useEffect(() => {
    if (!showLaunchSplash) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLaunchSplash(false);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [showLaunchSplash]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LaunchSplash visible={showLaunchSplash} />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
