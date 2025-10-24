import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Users, Search, Building, Trash2 } from "lucide-react";
import { useClients, deleteClients } from "@/integrations/supabase/clients";
import { showError, showSuccess } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import AddClientSheet from "@/components/AddClientSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import ExportButton from "@/components/ExportButton";
import { format } from "date-fns";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission"; // Importando hooks de permissão
import { useDashboardFilter } from "@/hooks/useDashboardFilter"; // Importando useDashboardFilter

const ClientsContent = () => {
  const { data: clients, isLoading, isError, error, refetch, isRefetching } = useClients();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  
  // Usando o filtro global do dashboard
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, isLoadingFilter } = useDashboardFilter();

  // O perfil do usuário logado é obtido dentro do useDashboardFilter, mas precisamos do isSuperAdmin aqui
  // O isSuperAdmin do useDashboardFilter é a fonte de verdade.
  
  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);
  
  // Permissões baseadas no perfil customizado
  const canReadClients = useCanRead('clients');
  const canWriteClients = useCanWrite('clients');

  if (!canReadClients) {
    return null; 
  }

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let filtered = clients;

    // 1. Filtragem por Empresa (se Super Admin e filtro ativo)
    if (isSuperAdmin && selectedCompanyId !== 'all') {
      filtered = filtered.filter(client => client.empresa_id === selectedCompanyId);
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
  }, [clients, searchTerm, selectedCompanyId, isSuperAdmin]);
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredClients.map(client => ({
      ID_Cliente: client.id,
      Nome: client.nome,
      Email: client.email || 'N/A',
      Telefone: client.telefone || 'N/A',
      Endereco: client.endereco_completo || 'N/A',
      Data_Cadastro: format(new Date(client.created_at), 'dd/MM/yyyy HH:mm'),
      Empresa: client.empresa?.nome || 'N/A',
    }));
  }, [filteredClients]);
  
  // Mutação para exclusão em massa
  const bulkDeleteMutation = useMutation({
    mutationFn: deleteClients,
    onSuccess: () => {
      showSuccess(t('clients_deleted_success', { count: selectedClientIds.size }));
      setSelectedClientIds(new Set()); // Limpa a seleção
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });
  
  const handleBulkDelete = () => {
    if (selectedClientIds.size === 0) return;
    
    const count = selectedClientIds.size;
    const confirmMessage = count === 1 
      ? t('confirm_delete_single') 
      : t('confirm_delete_bulk', { count });
      
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(Array.from(selectedClientIds));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_clients')}</h1>
        {canWriteClients && <AddClientSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> {t('client_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="w-full md:w-48">
                <Select 
                  onValueChange={setSelectedCompanyId} 
                  value={selectedCompanyId} 
                  disabled={isLoadingCompanies || isChecking}
                >
                  <SelectTrigger className="w-full">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={t('filter_all_companies')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filter_all_companies')}</SelectItem>
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
                placeholder={t('client_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isChecking}
              />
            </div>
            
            {/* Botões de Ação */}
            <div className="flex gap-2">
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
              <ExportButton 
                data={exportData} 
                fileName={`Relatorio_Clientes_${format(new Date(), 'yyyyMMdd')}`}
                disabled={isChecking || filteredClients.length === 0}
                isLoading={false}
              />
            </div>
          </div>
          
          {/* Barra de Ações em Massa */}
          {canWriteClients && selectedClientIds.size > 0 && (
            <div className={cn(
              "mb-4 p-3 border border-destructive/50 shadow-lg rounded-lg transition-all duration-300",
              "flex items-center justify-between bg-card"
            )}>
              <span className="text-sm font-medium text-foreground">
                {t('selected_items_count', { count: selectedClientIds.size })}
              </span>
              
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('delete')} ({selectedClientIds.size})
              </Button>
            </div>
          )}

          {isChecking && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                {t('error_loading_data')}
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('try_again')}
              </Button>
            </div>
          ) : filteredClients.length > 0 ? (
            <ClientTable 
              clients={filteredClients} 
              selectedIds={selectedClientIds}
              onSelectChange={setSelectedClientIds}
            />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_clients_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Clients = () => (
  // Permite acesso se for Super Admin (1) ou se tiver perfil customizado (3)
  <PermissionGuard allowedProfileIds={[1, 3]}>
    <ClientsContent />
  </PermissionGuard>
);

export default Clients;