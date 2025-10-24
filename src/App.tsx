import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Login from "./pages/Login";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Companies from "./pages/Companies";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import Teams from "./pages/Teams";
import Categories from "./pages/Categories";
import Notifications from "./pages/Notifications";
import ProductHistory from "./pages/ProductHistory";
import CustomProfiles from "./pages/CustomProfiles"; // Importando a nova página
import { SessionContextProvider, ProtectedRoute, PublicRoute } from "@/integrations/supabase/auth";
import { DashboardFilterProvider } from "@/hooks/useDashboardFilter";
import React from "react";

const queryClient = new QueryClient();

// Componente Wrapper para forçar a transição de página
const RouteContentWrapper: React.FC = () => {
  const location = useLocation();
  
  // Usamos a chave da rota para forçar a remontagem dos componentes de página,
  // o que irá disparar a animação CSS de fade-in no DashboardLayout.
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Index />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/users" element={<Users />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:productId" element={<ProductHistory />} />
      <Route path="/services" element={<Services />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/companies/profiles" element={<CustomProfiles />} /> {/* NOVA ROTA */}
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/products/categories" element={<Categories />} />
      <Route path="/notifications" element={<Notifications />} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Protected Routes Wrapper */}
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <DashboardFilterProvider>
                    {/* Renderiza o wrapper de conteúdo de rota */}
                    <RouteContentWrapper />
                  </DashboardFilterProvider>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;