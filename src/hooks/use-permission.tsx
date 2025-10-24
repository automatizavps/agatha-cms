import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Hook para verificar se o usuário logado possui permissão de acesso à página.
 * Acesso é concedido se for Super Admin OU se tiver um perfil customizado OU se for Admin de Empresa.
 * @param allowedProfileIds (Ignorado, mantido para compatibilidade de assinatura)
 */
export const usePermission = (allowedProfileIds: number[]) => {
  const { data: profile, isLoading: isProfileLoading } = useCurrentUserProfile();
  const navigate = useNavigate();

  const isChecking = isProfileLoading;
  
  // Acesso é permitido se for Super Admin OU se tiver um perfil customizado OU se tiver empresa_id (Admin/Funcionario)
  const hasPermission = profile?.is_super_admin || !!profile?.perfil_customizado_id || !!profile?.empresa_id;

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
  // Nota: allowedProfileIds é ignorado, pois a permissão é baseada em is_super_admin ou perfil_customizado_id/empresa_id
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