import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

type AccessType = 'leitura' | 'escrita';

/**
 * Verifica o nível de acesso do usuário logado a um módulo específico
 * usando a função RPC check_access.
 * @param moduleName O nome do módulo (ex: 'clients', 'products').
 * @param requiredAccess O nível de acesso necessário ('leitura' ou 'escrita').
 */
const fetchAccessCheck = async (moduleName: string, requiredAccess: AccessType): Promise<boolean> => {
  // A função RPC check_access já lida com a lógica de Super Admin, Admin de Empresa e Plano.
  const { data, error } = await supabase.rpc('check_access', {
    module_name: moduleName,
    required_access: requiredAccess,
  });

  if (error) {
    console.error(`Error checking access for ${moduleName}:`, error);
    // Em caso de erro no RPC, por segurança, negamos o acesso.
    return false;
  }

  // O RPC retorna um booleano
  return data === true;
};

export const useModulePermission = (moduleName: string) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const userId = profile?.id;
  
  // A chave da query deve incluir o ID do usuário para garantir que o cache seja por usuário
  // e o nome do módulo.
  const queryKey = ["modulePermission", userId, moduleName];

  const { data: canRead, isLoading: isLoadingRead } = useQuery<boolean, Error>({
    queryKey: [...queryKey, 'read'],
    queryFn: () => fetchAccessCheck(moduleName, 'leitura'),
    enabled: !!userId && !isLoadingProfile,
    staleTime: 1000 * 60 * 5, // 5 minutos de validade
  });

  const { data: canWrite, isLoading: isLoadingWrite } = useQuery<boolean, Error>({
    queryKey: [...queryKey, 'write'],
    queryFn: () => fetchAccessCheck(moduleName, 'escrita'),
    enabled: !!userId && !isLoadingProfile,
    staleTime: 1000 * 60 * 5, // 5 minutos de validade
  });

  return {
    canRead: canRead ?? false,
    canWrite: canWrite ?? false,
    isLoading: isLoadingRead || isLoadingWrite,
  };
};

// Hooks de conveniência
export const useCanRead = (moduleName: string) => useModulePermission(moduleName).canRead;
export const useCanWrite = (moduleName: string) => useModulePermission(moduleName).canWrite;