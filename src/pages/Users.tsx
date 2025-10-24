import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { useUsers } from "@/integrations/supabase/users";
import UserTable from "@/components/UserTable";
import { showError } from "@/utils/toast";
import AddUserSheet from "@/components/AddUserSheet";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const UsersContent = () => {
  const { data: users, isLoading, isError, error, refetch, isRefetching } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return users.filter(user => 
      user.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
      user.perfis?.nome.toLowerCase().includes(lowerCaseSearch)
    );
  }, [users, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_users')}</h1>
        <AddUserSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{t('user_list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('user_search_placeholder')}
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

const Users = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <UsersContent />
  </PermissionGuard>
);

export default Users;