import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Tag, Search, Building } from "lucide-react";
import { useCustomProfiles } from "@/integrations/supabase/customProfiles";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import AddCustomProfileSheet from "@/components/AddCustomProfileSheet";
import CustomProfileTable from "@/components/CustomProfileTable";

const CustomProfilesContent = () => {
  // O hook busca todos os perfis customizados (RLS garante que apenas SA veja todos)
  const { data: profiles, isLoading, isError, error, refetch, isRefetching } = useCustomProfiles();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!searchTerm) return profiles;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return profiles.filter(profile => 
      profile.nome.toLowerCase().includes(lowerCaseSearch) ||
      (profile.empresas?.nome && profile.empresas.nome.toLowerCase().includes(lowerCaseSearch))
    );
  }, [profiles, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_custom_profiles')}</h1>
        <AddCustomProfileSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5" /> {t('custom_profile_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('custom_profile_search_placeholder')}
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
          ) : filteredProfiles.length > 0 ? (
            <CustomProfileTable profiles={filteredProfiles} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_custom_profiles_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const CustomProfiles = () => (
  // Apenas Super Admin (Perfil ID 1) tem permissão
  <PermissionGuard allowedProfileIds={[1]}>
    <CustomProfilesContent />
  </PermissionGuard>
);

export default CustomProfiles;