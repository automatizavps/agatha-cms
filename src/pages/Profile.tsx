import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useSession } from "@/integrations/supabase/auth";
import { Loader2, User, Mail, Briefcase, Building } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Profile = () => {
  const { user } = useSession();
  const { data: profile, isLoading: isLoadingProfile, isError } = useCurrentUserProfile();

  const userEmail = user?.email || "N/A";
  const userName = profile?.nome_completo || "Carregando...";
  const userRole = profile?.perfis?.nome || "N/A";
  const companyId = profile?.empresa_id; // O ID da empresa está disponível no perfil do usuário

  if (isLoadingProfile) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !profile) {
    return (
      <DashboardLayout>
        <div className="text-center p-8 text-destructive border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
          Não foi possível carregar os dados do seu perfil.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Visualize e gerencie suas informações de conta.</p>
        
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex items-center space-x-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nome Completo</p>
                <p className="text-lg font-semibold">{userName}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center space-x-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-lg font-semibold">{userEmail}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center space-x-4">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Perfil de Acesso</p>
                <p className="text-lg font-semibold capitalize">{userRole}</p>
              </div>
            </div>
            
            {companyId && (
              <>
                <Separator />
                <div className="flex items-center space-x-4">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">ID da Empresa</p>
                    <p className="text-xs font-mono text-muted-foreground">{companyId}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;