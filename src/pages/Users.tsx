import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Users, Search, Building } from "lucide-react";
import { useUsers } from "@/integrations/supabase/users";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/UserTable";
import AddUserSheet from "@/components/AddUserSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";

const UsersContent = () => {
  const { t } = useTranslation();
  
  // Usando o filtro global do dashboard
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Fetch data (the hook handles filtering based on RLS, but we pass filteredCompanyId for query key)
  const { data: allUsers, isLoading, isError, error, refetch, isRefetching } = useUsers(filteredCompanyId);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Permissões baseadas no perfil customizado
  const canReadUsers = useCanRead('users');
  const canWriteUsers = useCanWrite('users');
  
  if (!canReadUsers) {
    return null;
  }
  
  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  // Client-side filtering by search term
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!searchTerm) return allUsers;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return allUsers.filter(user => 
      user.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
      user.email.toLowerCase().includes(lowerCaseSearch) ||
      (user.perfis?.nome && user.perfis.nome.toLowerCase().includes(lowerCaseSearch)) ||
      (user.empresa?.nome && user.empresa.nome.toLowerCase().includes(lowerCaseSearch))
    );
  }, [allUsers, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_users')}</h1>
        {canWriteUsers && <AddUserSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> {t('user_list_title')}
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
              {searchTerm ? t('no_data_found') : t('no_users_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Users = () => (
  // Permite acesso se for Super Admin (1) ou se tiver perfil customizado (3)
  <PermissionGuard allowedProfileIds={[1, 3]}>
    <UsersContent />
  </PermissionGuard>
);

export default Users;