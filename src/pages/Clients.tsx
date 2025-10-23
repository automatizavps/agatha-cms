import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Users, Search } from "lucide-react";
import { useClients } from "@/integrations/supabase/clients";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import AddClientSheet from "@/components/AddClientSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

const ClientsContent = () => {
  const { data: clients, isLoading, isError, error, refetch, isRefetching } = useClients();
  const [searchTerm, setSearchTerm] = useState("");

  if (isError && error) {
    showError("Erro ao carregar clientes: " + error.message);
  }
  
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchTerm) return clients;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.nome.toLowerCase().includes(lowerCaseSearch) ||
      (client.email && client.email.toLowerCase().includes(lowerCaseSearch)) ||
      (client.telefone && client.telefone.toLowerCase().includes(lowerCaseSearch)) ||
      (client.endereco_completo && client.endereco_completo.toLowerCase().includes(lowerCaseSearch))
    );
  }, [clients, searchTerm]);

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
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou endereço..."
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
          ) : filteredClients.length > 0 ? (
            <ClientTable clients={filteredClients} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? "Nenhum cliente encontrado com o termo de busca." : "Nenhum cliente cadastrado."}
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