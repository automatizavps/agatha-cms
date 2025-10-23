import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

export interface CurrentUserProfile {
  id: string;
  nome_completo: string;
  perfil_id: number;
  avatar_url: string | null;
  perfis: {
    nome: string;
  } | null;
}

const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, avatar_url, perfis (nome)")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  return data as CurrentUserProfile;
};

export const useCurrentUserProfile = () => {
  const { user, isLoading: isAuthLoading } = useSession();
  const userId = user?.id;

  return useQuery<CurrentUserProfile, Error>({
    queryKey: ["currentUserProfile", userId],
    queryFn: () => fetchCurrentUserProfile(userId!),
    enabled: !!userId && !isAuthLoading,
  });
};