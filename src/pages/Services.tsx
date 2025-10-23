import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Clock } from "lucide-react";
import { useServicesOnly } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddServiceSheet from "@/components/AddServiceSheet";
import ServiceOnlyTable from "@/components/ServiceOnlyTable";

const ServicesContent = () => {
  const { data: services, isLoading, isError, error, refetch, isRefetching } = useServicesOnly();

  if (isError && error) {
    showError("Erro ao carregar serviços: " + error.message);
  }

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
          ) : services && services.length > 0 ? (
            <ServiceOnlyTable services={services} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum serviço cadastrado.
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