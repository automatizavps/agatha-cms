import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    return new Response("Unauthorized: Missing Authorization header", {
      status: 401,
      headers: corsHeaders,
    });
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return new Response("Unauthorized: Invalid token", {
      status: 401,
      headers: corsHeaders,
    });
  }
  
  const adminUserId = userResponse.user.id;

  // Check if the user is a Super Admin (Perfil ID 1)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData || profileData.perfil_id !== 1) {
    return new Response("Forbidden: Only Super Admin can delete companies", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { companyIdToDelete } = data;

  if (!companyIdToDelete) {
    return new Response("Missing required field: companyIdToDelete", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // 4. Buscar todos os IDs de usuários associados à empresa
  const { data: usersData, error: fetchUsersError } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("empresa_id", companyIdToDelete);
    
  if (fetchUsersError) {
    console.error("Supabase Fetch Users Error:", fetchUsersError);
    return new Response(JSON.stringify({ error: "Failed to fetch associated users." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const userIdsToDelete = usersData.map(u => u.id);
  
  // 5. Excluir a empresa da tabela 'empresas'
  // Esta ação deve disparar a exclusão em cascata de todos os dados relacionados (clientes, produtos, pedidos, agendamentos, etc.)
  const { error: deleteCompanyError } = await supabaseAdmin
    .from("empresas")
    .delete()
    .eq("id", companyIdToDelete);

  if (deleteCompanyError) {
    console.error("Supabase Delete Company Error:", deleteCompanyError);
    return new Response(JSON.stringify({ error: deleteCompanyError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 6. Excluir os usuários do Supabase Auth (requer Service Role Key)
  // Isso deve ser feito APÓS a exclusão da empresa, pois a exclusão da empresa
  // já remove as entradas da tabela 'usuarios' via CASCADE.
  for (const userId of userIdsToDelete) {
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthUserError) {
      console.warn(`Warning: Failed to delete auth user ${userId}: ${deleteAuthUserError.message}`);
      // Continuamos, pois a exclusão da empresa já limpou os dados principais.
    }
  }

  return new Response(JSON.stringify({ message: "Company and all associated data deleted successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});