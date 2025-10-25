import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface UserProfile {
  id: string;
  nome_completo: string;
  empresa_id: string | null;
  avatar_url: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string; 
  perfil_customizado_id: string | null;
  perfis: {
    nome: string;
  } | null;
  empresa: {
    nome: string;
  } | null;
}

const fetchUsers = async (): Promise<UserProfile[]> => {
  // RLS should handle filtering by company_id automatically for non-Super Admins.
  // Super Admins see all users.
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, empresa_id, avatar_url, telefone, endereco_completo, perfil_customizado_id, perfis:perfis_customizados (nome), empresa:empresas (nome)")
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users: " + error.message);
  }
  
  // Map profile names (Admin/Super Admin logic is handled in user-profile.ts, but we replicate the naming here for consistency)
  return data.map(user => {
    let profileName = user.perfis?.nome;
    
    if (!user.perfil_customizado_id) {
      if (user.empresa_id === null) {
        profileName = 'Super Admin';
      } else {
        profileName = 'Admin';
      }
    }
    
    return {
      ...user,
      email: 'N/A', 
      perfis: { nome: profileName || 'N/A' },
    };
  }) as UserProfile[];
};

export const useUsers = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
};