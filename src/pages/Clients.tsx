import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { useClients } from "@/integrations/supabase/clients";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import AddClientSheet from "@/components/AddClientSheet";

const ClientsContent = () => {
  const { data: clients, isLoading, isError, error, refetch, isRefetching } = useClients();

  if (isError && error) {
    showError("Erro ao carregar clientes: " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
        <AddClientSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Lista de Clientes
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
                Não foi possível carregar os dados dos clientes.
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
          ) : clients && clients.length > 0 ? (
            <ClientTable clients={clients} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum cliente cadastrado.
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Clients = () => (
  // Perfis 1 (Super Admin), 2 (Admin) e 3 (Funcionário) têm permissão para gerenciar clientes
  <PermissionGuard allowedProfileIds={[1, 2, 3]}>
    <ClientsContent />
  </PermissionGuard>
);

export default Clients;