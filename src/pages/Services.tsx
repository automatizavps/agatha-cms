import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Clock, Search } from "lucide-react";
import { useServicesOnly } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddServiceSheet from "@/components/AddServiceSheet";
import ServiceOnlyTable from "@/components/ServiceOnlyTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

const ServicesContent = () => {
  const { data: services, isLoading, isError, error, refetch, isRefetching } = useServicesOnly();
  const [searchTerm, setSearchTerm] = useState("");

  if (isError && error) {
    showError("Erro ao carregar serviços: " + error.message);
  }
  
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchTerm) return services;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return services.filter(service => 
      service.nome.toLowerCase().includes(lowerCaseSearch) ||
      (service.categoria && service.categoria.toLowerCase().includes(lowerCaseSearch))
    );
  }, [services, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Serviços</h1>
        <AddServiceSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Lista de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isLoading && !isRefetching}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="ml-2"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                Não foi possível carregar os dados dos serviços.
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Tentar Novamente
              </Button>
            </div>
          ) : filteredServices.length > 0 ? (
            <ServiceOnlyTable services={filteredServices} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? "Nenhum serviço encontrado com o termo de busca." : "Nenhum serviço cadastrado."}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Services = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para gerenciar serviços
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <ServicesContent />
  </PermissionGuard>
);

export default Services;