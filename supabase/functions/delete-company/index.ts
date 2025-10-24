import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json", // Garantindo Content-Type aqui
};

serve(async (req) => {
  // Função auxiliar para retornar erro com CORS
  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: corsHeaders,
    });
  };
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Autenticação: Obter o token do usuário logado
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  // 2. Inicializar cliente Admin (Service Role Key)
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
  
  // Decodificar o token para obter o ID do usuário logado
  const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

  if (userError || !adminUser) {
    return returnError("Unauthorized: Invalid token or session expired", 401);
  }
  
  const adminUserId = adminUser.id;

  // 3. Autenticação e Verificação de Super Admin
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

  // 4. Processar o corpo da requisição
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
  
  // 5. Buscar todos os IDs de usuários associados à empresa
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

  // 6. Excluir a empresa da tabela 'empresas'
  // Esta ação deve disparar a exclusão em cascata de todos os dados relacionados (clientes, produtos, pedidos, agendamentos, etc.)
  const { error: deleteCompanyError } = await supabaseAdmin
    .from("empresas")
    .delete()
    .eq("id", companyIdToDelete);

  if (deleteCompanyError) {
    console.error("Supabase Delete Company Error:", deleteCompanyError);
    return returnError(deleteCompanyError.message, 400);
  }
  
  // 7. Excluir os usuários associados do Supabase Auth (exceto o Super Admin)
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