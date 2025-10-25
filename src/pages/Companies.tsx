import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Building } from "lucide-react";
import { useCompanies } from "@/integrations/supabase/companies";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import AddCompanySheet from "@/components/AddCompanySheet";
import CompanyTable from "@/components/CompanyTable";
import { useTranslation } from "react-i18next";

const Companies = () => {
  const { data: companies, isLoading, isError, error, refetch, isRefetching } = useCompanies();
  const { t } = useTranslation();

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_companies')}</h1>
        <AddCompanySheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="h-5 w-5" /> {t('company_list_title')}
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
          ) : companies && companies.length > 0 ? (
            <CompanyTable companies={companies} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_companies_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Companies;