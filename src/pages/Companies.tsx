import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Building } from "lucide-react";
import { useCompanies } from "@/integrations/supabase/companies";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddCompanySheet from "@/components/AddCompanySheet";
import CompanyTable from "@/components/CompanyTable";

const CompaniesContent = () => {
  const { data: companies, isLoading, isError, error, refetch, isRefetching } = useCompanies();

  if (isError && error) {
    showError("Erro ao carregar empresas: " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Empresas</h1>
        <AddCompanySheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" /> Lista de Empresas
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
                Não foi possível carregar os dados das empresas.
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
          ) : companies && companies.length > 0 ? (
            <CompanyTable companies={companies} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              Nenhuma empresa cadastrada.
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Companies = () => (
  // Apenas Super Admin (Perfil ID 1) pode gerenciar empresas
  <PermissionGuard allowedProfileIds={[1]}>
    <CompaniesContent />
  </PermissionGuard>
);

export default Companies;