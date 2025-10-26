import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { useCurrentUserProfile } from "./user-profile"; // Importando para verificar o perfil
import { createNotification } from "./notifications"; // Importando createNotification

export interface Client {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco_completo: string | null; // Novo campo
  created_at: string;
  empresa: { // Adicionando o relacionamento com a empresa
    nome: string;
  } | null;
}

// --- Fetch ---

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, empresa_id, nome, email, telefone, endereco_completo, created_at, empresa:empresas (nome)") // Usando alias 'empresa' para o relacionamento 'empresas'
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error);
    throw new Error("Failed to fetch clients");
  }

  // Mapeamento para corrigir a tipagem de relacionamentos 1:1 que retornam array
  return data.map(client => ({
    ...client,
    empresa: Array.isArray(client.empresa) ? client.empresa[0] : client.empresa,
  })) as Client[];
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
  endereco_completo: string | null; // Novo campo
  empresa_id?: string; // Opcional: Usado apenas pelo Super Admin
}

export const createClient = async ({ nome, email, telefone, endereco_completo, empresa_id: provided_empresa_id }: CreateClientParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    // Se o ID da empresa foi fornecido (Super Admin), usamos ele.
    empresa_id = provided_empresa_id;
  } else {
    // Caso contrário (Admin/Funcionário), obtemos o ID da empresa do usuário logado.
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

    if (companyError || !companyData) {
      console.error("Error fetching user company ID:", companyError);
      // Se o usuário não for Super Admin e não tiver empresa, isso é um erro de configuração.
      throw new Error("Não foi possível determinar a empresa do usuário. Verifique se o seu perfil está associado a uma empresa.");
    }
    empresa_id = companyData;
  }
  
  // Se empresa_id for nulo ou indefinido neste ponto, a inserção falhará no RLS ou na restrição NOT NULL.
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar um cliente.");
  }

  // 2. Inserir o cliente
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      email: email,
      telefone: telefone,
      endereco_completo: endereco_completo, // Novo campo
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
  endereco_completo: string | null; // Novo campo
}

export const updateClient = async ({ id, nome, email, telefone, endereco_completo }: UpdateClientParams) => {
  const { data, error } = await supabase
    .from("clientes")
    .update({
      nome: nome,
      email: email,
      telefone: telefone,
      endereco_completo: endereco_completo, // Novo campo
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

export const deleteClient = async (id: string, clientName: string, companyId: string, queryClient: QueryClient) => {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting client:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: "Cliente Excluído",
      mensagem: `O cliente '${clientName}' (ID: ${id.slice(0, 8)}) foi excluído.`,
      link: "/clients",
      queryClient: queryClient,
    });
  }
};

// --- Bulk Delete ---
export const deleteClients = async (clientIds: string[], clientNames: string[], companyId: string, queryClient: QueryClient) => {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .in("id", clientIds);

  if (error) {
    console.error("Error deleting clients:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão em massa
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: "Exclusão em Massa de Clientes",
      mensagem: `${clientIds.length} cliente(s) foram excluídos.`,
      link: "/clients",
      queryClient: queryClient,
    });
  }
};