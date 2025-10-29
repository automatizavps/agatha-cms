import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, DollarSign, Search, Building, HandCoins } from "lucide-react";
import { useCommissionRules } from "@/integrations/supabase/commissions";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission";
import AddCommissionRuleSheet from "@/components/AddCommissionRuleSheet";
import CommissionRuleTable from "@/components/CommissionRuleTable";

const CommissionRules = () => {
  const { t } = useTranslation();
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Permissões (Novo módulo 'commissions')
  const canReadCommissions = useCanRead('commissions');
  const canWriteCommissions = useCanWrite('commissions');
  
  // Fetch data using filteredCompanyId
  const { data: rules, isLoading, isError, error, refetch, isRefetching } = useCommissionRules(filteredCompanyId);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (!searchTerm) return rules;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return rules.filter(rule => 
      rule.entidades?.some(e => e.nome.toLowerCase().includes(lowerCaseSearch)) ||
      rule.tipo_entidade.toLowerCase().includes(lowerCaseSearch)
    );
  }, [rules, searchTerm]);
  
  if (!canReadCommissions) {
    return (
      <DashboardLayout>
        <div className="text-center p-4 text-destructive">
          {t('access_denied_module', { defaultValue: 'Acesso negado ao módulo de Comissionamento.' })}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('commission_rules_title', { defaultValue: 'Regras de Comissionamento' })}</h1>
        {canWriteCommissions && <AddCommissionRuleSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HandCoins className="h-5 w-5" /> {t('commission_rules_title', { defaultValue: 'Regras de Comissionamento' })}
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
                placeholder={t('commission_search_placeholder', { defaultValue: 'Buscar por entidade ou tipo...' })}
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
          ) : filteredRules.length > 0 ? (
            <CommissionRuleTable rules={filteredRules} canWrite={canWriteCommissions} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_commission_rules_found', { defaultValue: 'Nenhuma regra de comissionamento encontrada.' })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CommissionRules;