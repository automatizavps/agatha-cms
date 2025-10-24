import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Profile {
  id: number;
  nome: string;
  descricao: string | null;
}

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, descricao")
    .in("id", [1]) // Apenas Super Admin (ID 1)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error("Failed to fetch profiles");
  }

  return data as Profile[];
};

export const useProfiles = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
};