import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Users, Search, Building } from "lucide-react";
import { useClients } from "@/integrations/supabase/clients";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import AddClientSheet from "@/components/AddClientSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ClientsContent = () => {
  const { data: clients, isLoading, isError, error, refetch, isRefetching } = useClients();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilterId, setCompanyFilterId] = useState<string | 'all'>('all');

  const isSuperAdmin = profile?.perfil_id === 1;
  const isChecking = isLoading || isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError("Erro ao carregar clientes: " + error.message);
  }
  
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let filtered = clients;

    // 1. Filtragem por Empresa (se Super Admin e filtro ativo)
    if (isSuperAdmin && companyFilterId !== 'all') {
      filtered = filtered.filter(client => client.empresa_id === companyFilterId);
    }
    
    // 2. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.nome.toLowerCase().includes(lowerCaseSearch) ||
        (client.email && client.email.toLowerCase().includes(lowerCaseSearch)) ||
        (client.telefone && client.telefone.toLowerCase().includes(lowerCaseSearch)) ||
        (client.endereco_completo && client.endereco_completo.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [clients, searchTerm, companyFilterId, isSuperAdmin]);

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
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3">
            
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="w-full md:w-48">
                <Select 
                  onValueChange={setCompanyFilterId} 
                  value={companyFilterId} 
                  disabled={isLoadingCompanies || isChecking}
                >
                  <SelectTrigger className="w-full">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Empresas</SelectItem>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Campo de Busca Textual */}
            <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isChecking}
              />
            </div>
            
            {/* Botão de Recarregar */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="shrink-0"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isChecking && !isRefetching ? (
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
              {searchTerm || companyFilterId !== 'all' ? "Nenhum cliente encontrado com os filtros aplicados." : "Nenhum cliente cadastrado."}
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