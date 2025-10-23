import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

export interface CurrentUserProfile {
  id: string;
  nome_completo: string;
  perfil_id: number;
  avatar_url: string | null;
  telefone: string | null; // Adicionado
  endereco_completo: string | null; // Adicionado
  empresa_id: string | null; // Adicionado
  perfis: {
    nome: string;
  } | null;
}

const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile | null> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, avatar_url, telefone, endereco_completo, empresa_id, perfis (nome)")
    .eq("id", userId)
    // Removido .single() para evitar PGRST116 se o perfil não existir
    .limit(1); 

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  // Retorna o primeiro item ou null se o array estiver vazio
  return data?.[0] || null;
};

export const useCurrentUserProfile = () => {
  const { user, isLoading: isAuthLoading } = useSession();
  const userId = user?.id;

  return useQuery<CurrentUserProfile | null, Error>({
    queryKey: ["currentUserProfile", userId],
    queryFn: () => fetchCurrentUserProfile(userId!),
    enabled: !!userId && !isAuthLoading,
  });
};