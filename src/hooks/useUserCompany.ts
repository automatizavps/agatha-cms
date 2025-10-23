import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

/**
 * Hook para obter o ID da empresa do usuário logado.
 * Retorna o ID da empresa ou null se o usuário for Super Admin (perfil_id 1) ou não tiver empresa associada.
 */
export const useUserCompany = () => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  
  const companyId = profile?.empresa_id || undefined;
  
  return { 
    companyId, 
    isLoading: isLoadingProfile,
    isSuperAdmin: profile?.perfil_id === 1,
  };
};