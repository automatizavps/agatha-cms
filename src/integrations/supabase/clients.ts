import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Client {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  created_at: string;
}

// --- Fetch ---

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, empresa_id, nome, email, telefone, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error);
    throw new Error("Failed to fetch clients");
  }

  return data as Client[];
};

export const useClients = () => {
  return useQuery<Client[], Error>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
};

// --- Create ---

interface CreateClientParams {
  nome: string;
  email: string | null;
  telefone: string | null;
}

export const createClient = async ({ nome, email, telefone }: CreateClientParams) => {
  // 1. Obter o ID da empresa do usuário logado
  const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

  if (companyError || !companyData) {
    console.error("Error fetching user company ID:", companyError);
    throw new Error("Não foi possível determinar a empresa do usuário.");
  }
  
  const empresa_id = companyData;

  // 2. Inserir o cliente
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      email: email,
      telefone: telefone,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating client:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Update ---

interface UpdateClientParams {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

export const updateClient = async ({ id, nome, email, telefone }: UpdateClientParams) => {
  const { data, error } = await supabase
    .from("clientes")
    .update({
      nome: nome,
      email: email,
      telefone: telefone,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating client:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Delete ---

export const deleteClient = async (id: string) => {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting client:", error);
    throw new Error(error.message);
  }
};