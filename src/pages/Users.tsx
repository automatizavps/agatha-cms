import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Search, Building } from "lucide-react";
import { useUsers } from "@/integrations/supabase/users";
import UserTable from "@/components/UserTable";
import { showError } from "@/utils/toast";
import AddUserSheet from "@/components/AddUserSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanWrite } from "@/hooks/use-module-permission"; // REINTRODUZIDO

const Users = () => {
  const { data: users, isLoading, isError, error, refetch, isRefetching } = useUsers();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();
  
  // Usando o filtro global do dashboard
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Permissões reintroduzidas
  const canWriteUsers = useCanWrite('users');
  
  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let filtered = users;
    
    // 1. Filtragem por Empresa (se Super Admin e filtro ativo)
    if (isSuperAdmin && selectedCompanyId !== 'all') {
      filtered = filtered.filter(user => user.empresa_id === selectedCompanyId);
    }

    // 2. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
        user.perfis?.nome.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    return filtered;
  }, [users, searchTerm, selectedCompanyId, isSuperAdmin]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_users')}</h1>
        {canWriteUsers && <AddUserSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{t('user_list_title')}</CardTitle>
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
                placeholder={t('user_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isChecking}
              />
            </div>
            
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
          ) : filteredUsers.length > 0 ? (
            <UserTable users={filteredUsers} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_users_search') : t('no_users_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Users;