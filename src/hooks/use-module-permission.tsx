import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { AccessType } from "@/integrations/supabase/customProfiles";

/**
 * Hook para verificar o nível de acesso do usuário logado a um módulo específico.
 * @param moduleName O nome do módulo (ex: 'users', 'products', 'analytics').
 * @returns O nível de acesso ('leitura', 'escrita', 'sem_acesso') ou 'sem_acesso' se não for Super Admin e não tiver perfil customizado.
 */
export const useModulePermission = (moduleName: string): AccessType => {
  const { data: profile, isLoading } = useCurrentUserProfile();

  if (isLoading || !profile) {
    return 'sem_acesso';
  }
  
  // 1. Super Admin (perfil_id 1) tem acesso total (já definido no useCurrentUserProfile)
  if (profile.perfil_id === 1) {
    return 'escrita';
  }
  
  // 2. Usuários com perfil customizado (perfil_id 3)
  if (profile.perfil_customizado_id) {
    return profile.permissions[moduleName] || 'sem_acesso';
  }
  
  // 3. Outros (ex: Admin/Funcionário sem perfil customizado)
  // Como removemos os perfis 2 e 3 da seleção, qualquer usuário que não seja SA
  // e não tenha perfil customizado deve ter 'sem_acesso' por padrão.
  return 'sem_acesso';
};

/**
 * Verifica se o usuário tem pelo menos permissão de leitura.
 */
export const useCanRead = (moduleName: string): boolean => {
  const access = useModulePermission(moduleName);
  return access === 'leitura' || access === 'escrita';
};

/**
 * Verifica se o usuário tem permissão de escrita (que implica leitura).
 */
export const useCanWrite = (moduleName: string): boolean => {
  const access = useModulePermission(moduleName);
  return access === 'escrita';
};