import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useUsers } from "@/integrations/supabase/users";
import UserTable from "@/components/UserTable";
import { showError } from "@/utils/toast";

const Users = () => {
  const { data: users, isLoading, isError, error } = useUsers();

  if (isError) {
    showError("Erro ao carregar usuários: " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center text-destructive p-4 border border-destructive rounded-md">
              Não foi possível carregar os dados dos usuários.
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

export default Users;