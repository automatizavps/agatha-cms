import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Target, Search } from "lucide-react";
import { useTeams } from "@/integrations/supabase/teams";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import TeamTable from "@/components/TeamTable";
import AddTeamSheet from "@/components/AddTeamSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission"; // Importando hooks de permissão

const TeamsContent = () => {
  const { data: teams, isLoading, isError, error, refetch, isRefetching } = useTeams();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();
  
  // Permissões baseadas no perfil customizado
  const canReadTeams = useCanRead('teams');
  const canWriteTeams = useCanWrite('teams');
  
  if (!canReadTeams) {
    return null;
  }

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!searchTerm) return teams;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return teams.filter(team => 
      team.nome.toLowerCase().includes(lowerCaseSearch) ||
      (team.empresas?.nome && team.empresas.nome.toLowerCase().includes(lowerCaseSearch))
    );
  }, [teams, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_teams')}</h1>
        {canWriteTeams && <AddTeamSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" /> {t('team_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('team_search_placeholder')}
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
          ) : filteredTeams.length > 0 ? (
            <TeamTable teams={filteredTeams} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_teams_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Teams = () => (
  // Permite acesso se for Super Admin (1) ou se tiver perfil customizado (3)
  <PermissionGuard allowedProfileIds={[1, 3]}>
    <TeamsContent />
  </PermissionGuard>
);

export default Teams;