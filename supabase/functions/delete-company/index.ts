import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json", // Adicionado Content-Type para todas as respostas
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Função auxiliar para retornar erro com CORS
  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: corsHeaders,
    });
  };

  // 1. Inicializar cliente Admin
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // 2. Autenticação e Verificação de Super Admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  const adminUserId = userResponse.user.id;

  // Check if the user is a Super Admin (using the new definition)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select(`
      empresa_id, 
      perfil_customizado_id,
      perfis_customizados (nome)
    `)
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData) {
    return returnError("Forbidden: User profile not found", 403);
  }
  
  // NOVO CHECK: Super Admin é um usuário com empresa_id IS NOT NULL E perfil_customizado.nome = 'Super Admin'
  const isSuperAdmin = 
    profileData.empresa_id !== null && 
    profileData.perfil_customizado_id !== null && 
    profileData.perfis_customizados?.nome === 'Super Admin';

  if (!isSuperAdmin) {
    return returnError("Forbidden: Only Super Admin (with custom profile 'Super Admin' and associated company) can delete companies", 403);
  }

  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { companyIdToDelete } = data;

  if (!companyIdToDelete) {
    return returnError("Missing required field: companyIdToDelete", 400);
  }
  
  // 4. Buscar todos os IDs de usuários associados à empresa
  const { data: usersData, error: fetchUsersError } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("empresa_id", companyIdToDelete);
    
  if (fetchUsersError) {
    console.error("Supabase Fetch Users Error:", fetchUsersError);
    return returnError("Failed to fetch associated users.", 400);
  }
  
  // Filtra a lista de usuários a serem excluídos do Auth, excluindo o Super Admin logado
  const userIdsToDelete = usersData
    .map(u => u.id)
    .filter(id => id !== adminUserId); // NÃO exclui o Super Admin logado

  // 5. Excluir a empresa da tabela 'empresas'
  // Esta ação deve disparar a exclusão em cascata de todos os dados relacionados (clientes, produtos, pedidos, agendamentos, etc.)
  const { error: deleteCompanyError } = await supabaseAdmin
    .from("empresas")
    .delete()
    .eq("id", companyIdToDelete);

  if (deleteCompanyError) {
    console.error("Supabase Delete Company Error:", deleteCompanyError);
    return returnError(deleteCompanyError.message, 400);
  }
  
  // 6. Excluir os usuários associados do Supabase Auth (exceto o Super Admin)
  for (const userId of userIdsToDelete) {
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthUserError) {
      console.warn(`Warning: Failed to delete auth user ${userId}: ${deleteAuthUserError.message}`);
      // Continuamos, pois a exclusão da empresa já limpou os dados principais.
    }
  }

  return new Response(JSON.stringify({ message: "Company and all associated data deleted successfully" }), {
    status: 200,
    headers: corsHeaders,
  });
});