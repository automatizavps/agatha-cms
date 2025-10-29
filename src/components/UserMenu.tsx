import { LogOut, User, Settings, Building, Globe, ShieldCheck } from "lucide-react";
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
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Importando useTranslation

export function UserMenu() {
  const { user, session } = useSession();
  const { data: profile, isLoading: isProfileLoading } = useCurrentUserProfile();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // Usando i18n para mudar o idioma

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
      navigate('/login');
    }
  };
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const userEmail = user?.email || "N/A";
  const userName = profile?.nome_completo || userEmail;
  const userRole = profile?.perfis?.nome || t("loading");
  const companyName = profile?.empresas?.nome;
  const userPlanName = profile?.empresas?.planos?.nome; // NOVO: Nome do plano
  const isSuperAdmin = profile?.is_super_admin; // NOVO: Flag Super Admin
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
          {t('profile_role')}: {isProfileLoading ? "..." : userRole}
        </DropdownMenuItem>
        
        {/* Exibe a Empresa */}
        {companyName && (
          <DropdownMenuItem className="text-xs text-muted-foreground flex items-center gap-2">
            <Building className="h-3 w-3" />
            {t('user_table_header_company')}: {isProfileLoading ? "..." : companyName}
          </DropdownMenuItem>
        )}
        
        {/* Exibe o Plano (Agora sem a restrição !isSuperAdmin) */}
        {userPlanName && (
          <DropdownMenuItem className="text-xs text-primary flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-3 w-3" />
            {t('plan_name', { defaultValue: 'Plano' })}: {isProfileLoading ? "..." : userPlanName}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>{t('nav_profile')}</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('nav_settings')}</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Seletor de Idioma */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('language', { defaultValue: 'Idioma' })}
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => changeLanguage('pt-BR')} 
          className={i18n.language === 'pt-BR' ? "font-bold bg-accent" : ""}
        >
          Português (BR)
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('logout', { defaultValue: 'Sair' })}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}