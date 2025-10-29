import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth"; // Importando useSession
import { createNotification } from "./notifications"; // Importando createNotification
import { QueryClient } from "@tanstack/react-query"; // Importando QueryClient

export interface Company {
  id: string;
  nome: string;
  cnpj: string | null;
  dono_id: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
  created_at: string;
  is_active: boolean;
  plano_id: string | null; // NOVO CAMPO
  planos: { // NOVO RELACIONAMENTO
    nome: string;
    data_inicio: string | null; // NOVO
    data_fim: string | null; // NOVO
  } | null;
}

// --- Fetch ---

const fetchCompanies = async (): Promise<Company[]> => {
  // A política RLS existente só permite que Admins/Funcionários vejam a própria empresa.
  // Para o Super Admin (ID 1), a política 'Super Admin pode gerenciar todas as empresas' permite SELECT *.
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, dono_id, telefone, endereco_completo, email, created_at, is_active, plano_id, planos (nome, data_inicio, data_fim)") // Incluindo data_inicio e data_fim
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching companies:", error);
    throw new Error("Failed to fetch companies");
  }

  return data as Company[];
};

export const useCompanies = () => {
  return useQuery<Company[], Error>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
};

// --- Create ---

interface CreateCompanyParams {
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
  plano_id?: string | null; // NOVO: Opcional na criação
}

export const createCompany = async ({ nome, cnpj, telefone, endereco_completo, email, plano_id }: CreateCompanyParams) => {
  // O dono_id é o usuário logado (Super Admin)
  const { data: { user } } = await supabase.auth.getUser();
  const dono_id = user?.id;

  if (!dono_id) {
    throw new Error("Usuário não autenticado.");
  }
  
  // Se plano_id não for fornecido, busca o plano padrão
  let final_plano_id = plano_id;
  if (!final_plano_id) {
    const { data: defaultPlan, error: planError } = await supabase
      .from('planos')
      .select('id')
      .eq('nome', 'Plano Básico')
      .single();
      
    if (planError || !defaultPlan) {
      console.warn("Could not find default plan, proceeding without plan_id.");
    } else {
      final_plano_id = defaultPlan.id;
    }
  }

  // 2. Inserir a empresa
  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nome: nome,
      cnpj: cnpj,
      dono_id: dono_id, // O trigger 'on_empresa_created' usará este ID
      telefone: telefone,
      endereco_completo: endereco_completo,
      email: email,
      is_active: true, // Sempre ativa na criação
      plano_id: final_plano_id, // NOVO CAMPO
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating company:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Update ---

interface UpdateCompanyParams {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
  is_active?: boolean;
  plano_id?: string | null; // NOVO: Opcional na atualização
}

export const updateCompany = async ({ id, nome, cnpj, telefone, endereco_completo, email, is_active, plano_id }: UpdateCompanyParams) => {
  const updatePayload: Partial<UpdateCompanyParams> = {
    nome: nome,
    cnpj: cnpj,
    telefone: telefone,
    endereco_completo: endereco_completo,
    email: email,
  };
  
  // 1. Se o plano_id foi fornecido ou se a empresa está sendo atualizada,
  // precisamos verificar a vigência do plano.
  if (plano_id !== undefined) {
    updatePayload.plano_id = plano_id;
    
    let is_currently_active = is_active; // Mantém o status se não houver plano
    
    if (plano_id) {
      // Busca a vigência do novo plano
      const { data: planData, error: planError } = await supabase
        .from('planos')
        .select('data_inicio, data_fim')
        .eq('id', plano_id)
        .single();
        
      if (planError || !planData) {
        console.warn("Could not fetch plan data for status check:", planError?.message);
        // Se não puder buscar o plano, mantemos o status atual (ou o fornecido)
      } else {
        const now = new Date();
        const dataInicio = planData.data_inicio ? new Date(planData.data_inicio) : null;
        const dataFim = planData.data_fim ? new Date(planData.data_fim) : null;
        
        // Lógica de Vigência: Ativo se (data_inicio <= now) E (data_fim >= now)
        const isVigent = (!dataInicio || dataInicio <= now) && (!dataFim || dataFim >= now);
        
        // Se o status de vigência for diferente do status atual da empresa, forçamos a mudança.
        // Se is_active não foi fornecido, usamos o status de vigência.
        if (is_active === undefined || is_active !== isVigent) {
          is_currently_active = isVigent;
        } else {
          is_currently_active = is_active;
        }
      }
    } else {
      // Se o plano_id for NULL, a empresa deve ser desativada (a menos que seja o SA)
      // Por segurança, se o plano for removido, desativamos, a menos que o is_active tenha sido explicitamente definido.
      if (is_active === undefined) {
        is_currently_active = false;
      }
    }
    
    // Força a atualização do status de atividade
    if (is_currently_active !== undefined) {
      updatePayload.is_active = is_currently_active;
    }
  } else if (is_active !== undefined) {
    // Se is_active foi explicitamente fornecido, usamos ele (ex: toggle manual do SA)
    updatePayload.is_active = is_active;
  }
  
  // 2. Executar a atualização
  const { data, error } = await supabase
    .from("empresas")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating company:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Delete (Agora usa Edge Function) ---

export const deleteCompany = async (companyIdToDelete: string, companyName: string, queryClient: QueryClient) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  
  if (!accessToken) {
    throw new Error("Sessão de administrador ausente.");
  }
  
  const { data, error } = await supabase.functions.invoke("delete-company", {
    body: { companyIdToDelete },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error deleting company via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }
  
  // Notificação de exclusão (após sucesso da Edge Function)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: null, // Empresa excluída, notificação global
      titulo: "Empresa Excluída",
      mensagem: `A empresa '${companyName}' (ID: ${companyIdToDelete.slice(0, 8)}) foi excluída permanentemente.`,
      link: "/companies",
      queryClient: queryClient,
    });
  }

  return data;
};