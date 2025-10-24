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

  // Função auxiliar para retornar erro JSON
  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  // 1. Autenticação: Obter o token do usuário logado
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  // 2. Inicializar cliente Admin (Service Role Key) para decodificar o token e buscar dados
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
  
  // Decodificar o token para obter o ID do usuário logado (Admin/Editor)
  const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

  if (userError || !adminUser) {
    // Se o token for inválido ou expirado, retorna 401
    return returnError("Unauthorized: Invalid token or session expired", 401);
  }
  
  const adminUserId = adminUser.id;

  // 3. Verificar se o usuário logado tem permissão (Admin de Empresa ou Super Admin)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id, perfis_customizados (nome)")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData) {
    return returnError("Forbidden: User profile not found", 403);
  }
  
  // New SA check: perfil_customizado_id is NULL AND empresa_id is NULL (OLD SA)
  const isOldSuperAdmin = profileData.perfil_customizado_id === null && profileData.empresa_id === null;
  
  // New SA check: perfil_customizado_id is 'Super Admin' AND empresa_id is NOT NULL (NEW SA)
  const isNewSuperAdmin = 
    profileData.empresa_id !== null && 
    profileData.perfil_customizado_id !== null && 
    profileData.perfis_customizados?.nome === 'Super Admin';
    
  const isSuperAdmin = isOldSuperAdmin || isNewSuperAdmin;
  const isCompanyUser = profileData.empresa_id !== null;

  // Permissão: Super Admin OU qualquer usuário com empresa_id (Admin/Funcionário)
  if (!isSuperAdmin && !isCompanyUser) {
    return returnError("Forbidden: User does not have administrative privileges", 403);
  }

  // 4. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { userId } = data;

  if (!userId) {
    return returnError("Missing required field: userId", 400);
  }
  
  // 5. Buscar o email do usuário alvo usando o Service Role Key
  const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (fetchError) {
    console.error("Supabase Fetch User Error:", fetchError);
    return returnError(fetchError.message, 400);
  }
  
  const email = userData.user?.email;

  if (!email) {
    return returnError("Email not found for user.", 404);
  }

  return new Response(JSON.stringify({ email: email }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});