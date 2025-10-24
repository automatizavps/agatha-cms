import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Clock, Search, Building } from "lucide-react";
import { useServicesOnly } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddServiceSheet from "@/components/AddServiceSheet";
import ServiceOnlyTable from "@/components/ServiceOnlyTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission"; // Importando hooks de permissão
import { useDashboardFilter } from "@/hooks/useDashboardFilter"; // Importando useDashboardFilter
import { useCompanies } from "@/integrations/supabase/companies"; // Importando useCompanies
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importando Select

const ServicesContent = () => {
  const { t } = useTranslation();
  
  // Usando o filtro global do dashboard
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Passando filteredCompanyId para o hook de fetch
  const { data: allServices, isLoading, isError, error, refetch, isRefetching } = useServicesOnly();
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Permissões baseadas no perfil customizado
  const canReadServices = useCanRead('services');
  const canWriteServices = useCanWrite('services');
  
  if (!canReadServices) {
    return null;
  }
  
  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  // 1. Filtragem Inicial por Empresa (Lado do Cliente)
  const servicesByCompany = useMemo(() => {
    if (!allServices) return [];
    
    // Se for Super Admin e o filtro estiver em 'all', mostramos todos.
    if (isSuperAdmin && filteredCompanyId === undefined) {
      return allServices;
    }
    
    // Se houver um ID de empresa filtrado (seja pelo SA ou pelo Admin/Func fixo)
    if (filteredCompanyId) {
      return allServices.filter(p => p.empresa_id === filteredCompanyId);
    }
    
    // Caso contrário (Admin/Func sem empresa, ou erro de carregamento), retorna vazio
    return [];
  }, [allServices, filteredCompanyId, isSuperAdmin]);
  
  
  const filteredServices = useMemo(() => {
    if (!servicesByCompany) return [];
    if (!searchTerm) return servicesByCompany;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return servicesByCompany.filter(service => 
      service.nome.toLowerCase().includes(lowerCaseSearch) ||
      (service.categoria && service.categoria.toLowerCase().includes(lowerCaseSearch))
    );
  }, [servicesByCompany, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_services')}</h1>
        {canWriteServices && <AddServiceSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" /> {t('service_list_title')}
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
                placeholder={t('service_search_placeholder')}
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
          ) : filteredServices.length > 0 ? (
            <ServiceOnlyTable services={filteredServices} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_services_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Services = () => (
  // Permite acesso se for Super Admin (1) ou se tiver perfil customizado (3)
  <PermissionGuard allowedProfileIds={[1, 3]}>
    <ServicesContent />
  </PermissionGuard>
);

export default Services;