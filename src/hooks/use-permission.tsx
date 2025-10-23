import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Hook para verificar se o usuário logado possui um dos perfis permitidos.
 * Se não tiver, redireciona para a página inicial.
 * @param allowedProfileIds Array de IDs de perfil permitidos (e.g., [1, 2] para Admin/Super Admin).
 */
export const usePermission = (allowedProfileIds: number[]) => {
  const { data: profile, isLoading: isProfileLoading } = useCurrentUserProfile();
  const navigate = useNavigate();

  const hasPermission = profile && allowedProfileIds.includes(profile.perfil_id);
  const isChecking = isProfileLoading;

  useEffect(() => {
    if (!isChecking && !hasPermission) {
      // Redireciona para a página inicial se não tiver permissão
      navigate("/", { replace: true });
    }
  }, [isChecking, hasPermission, navigate]);

  return { hasPermission, isChecking };
};

// Componente de wrapper para proteger o conteúdo da página
export const PermissionGuard: React.FC<{ allowedProfileIds: number[]; children: React.ReactNode }> = ({ allowedProfileIds, children }) => {
  const { hasPermission, isChecking } = usePermission(allowedProfileIds);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission) {
    // O hook usePermission já lida com o redirecionamento,
    // mas retornamos null para evitar renderizar o conteúdo não autorizado.
    return null;
  }

  return <>{children}</>;
};