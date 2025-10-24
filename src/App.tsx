import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Notifications from "./pages/Notifications"; // Importando a nova página
import { SessionContextProvider, ProtectedRoute } from "@/integrations/supabase/auth";
import { DashboardFilterProvider } from "@/hooks/useDashboardFilter"; // Importando o novo provider

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Wrapper */}
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <DashboardFilterProvider>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/teams" element={<Teams />} />
                      <Route path="/companies" element={<Companies />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/products/categories" element={<Categories />} />
                      <Route path="/notifications" element={<Notifications />} /> {/* Nova Rota */}
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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