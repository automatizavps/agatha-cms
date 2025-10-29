import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { usePlans } from "@/integrations/supabase/plans";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import AddPlanSheet from "@/components/AddPlanSheet";
import PlanTable from "@/components/PlanTable";
import { useCanWrite } from "@/hooks/use-module-permission";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { cn } from "@/lib/utils";

const Plans = () => {
  const { t } = useTranslation();
  
  // 1. CHAME TODOS OS HOOKS INCONDICIONALMENTE NO TOPO
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: plans, isLoading, isError, error, refetch, isRefetching } = usePlans();
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Acesso a planos é restrito ao Super Admin
  const isSuperAdmin = profile?.is_super_admin;
  const canWritePlans = isSuperAdmin; // Apenas SA pode escrever
  
  const isChecking = isLoading || isLoadingProfile;

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    if (!searchTerm) return plans;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return plans.filter(plan => 
      plan.nome.toLowerCase().includes(lowerCaseSearch)
    );
  }, [plans, searchTerm]);

  // 2. RETORNO CONDICIONAL DE PERMISSÃO
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full text-center border-destructive/50 bg-destructive/5">
            <CardHeader>
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <CardTitle className="text-2xl text-destructive">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">
                {t('error_loading_data')}: Esta página é restrita ao Super Admin.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_plans', { defaultValue: 'Gestão de Planos' })}</h1>
        {canWritePlans && <AddPlanSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" /> {t('plan_list_title', { defaultValue: 'Lista de Planos de Assinatura' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            
            {/* Campo de Busca Textual */}
            <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('plan_search_placeholder', { defaultValue: 'Buscar por nome do plano...' })}
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
          ) : filteredPlans.length > 0 ? (
            <PlanTable plans={filteredPlans} canWrite={canWritePlans} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_plans_found', { defaultValue: 'Nenhum plano de assinatura encontrado.' })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Plans;