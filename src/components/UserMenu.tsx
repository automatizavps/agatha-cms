import { LogOut, User, Settings, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom"; // Importando useNavigate

export function UserMenu() {
  const { user, session } = useSession();
  const { data: profile, isLoading: isProfileLoading } = useCurrentUserProfile();
  const navigate = useNavigate(); // Usando useNavigate

  const handleLogout = async () => {
    let logoutSuccessful = false;
    
    if (session) {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Se o erro for "Auth session missing", ignoramos, pois o objetivo é deslogar.
        if (!error.message.includes("Auth session missing")) {
          showError("Falha ao fazer logout: " + error.message);
          // Se for um erro crítico, não prosseguimos com o sucesso/redirecionamento forçado
          return; 
        }
      }
      logoutSuccessful = true;
    } else {
      // Se não houver sessão, consideramos o logout como "já feito"
      logoutSuccessful = true;
    }
    
    if (logoutSuccessful) {
      showSuccess("Logout realizado com sucesso.");
      // Força o redirecionamento para /login, garantindo que o router reaja.
      // O SessionContextProvider também fará isso, mas esta é uma garantia extra.
      navigate('/login');
    }
  };

  const userEmail = user?.email || "Usuário";
  const userName = profile?.nome_completo || userEmail;
  const userRole = profile?.perfis?.nome || "Carregando...";
  const companyName = profile?.empresas?.nome; // Novo: Nome da empresa
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {isProfileLoading ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : (
              <>
                <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Exibe o Perfil */}
        <DropdownMenuItem className="text-xs text-muted-foreground">
          Perfil: {isProfileLoading ? "..." : userRole}
        </DropdownMenuItem>
        
        {/* Exibe a Empresa (se não for Super Admin ou se houver nome de empresa) */}
        {companyName && (
          <DropdownMenuItem className="text-xs text-muted-foreground flex items-center gap-2">
            <Building className="h-3 w-3" />
            Empresa: {isProfileLoading ? "..." : companyName}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}