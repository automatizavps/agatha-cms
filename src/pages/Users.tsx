import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useUsers } from "@/integrations/supabase/users";
import UserTable from "@/components/UserTable";
import { showError } from "@/utils/toast";
import AddUserSheet from "@/components/AddUserSheet";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";

const UsersContent = () => {
  const { data: users, isLoading, isError, error, refetch, isRefetching } = useUsers();

  if (isError && error) {
    // Note: We only show the toast if there is an actual error object
    showError("Erro ao carregar usuários: " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <AddUserSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                Não foi possível carregar os dados dos usuários.
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
          ) : users && users.length > 0 ? (
            <UserTable users={users} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum usuário encontrado para esta empresa.
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