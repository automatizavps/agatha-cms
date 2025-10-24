import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json", // Garantindo Content-Type aqui
};

serve(async (req) => {
  // Função auxiliar para retornar erro JSON
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

  // Check if the user is Super Admin
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

  // *** REFORÇO DE SEGURANÇA: APENAS SUPER ADMIN PODE DELETAR ***
  if (!isSuperAdmin) {
    return returnError("Forbidden: Only Super Admin can delete users", 403);
  }
  // ************************************************************

  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { userIdToDelete } = data;

  if (!userIdToDelete) {
    return returnError("Missing required field: userIdToDelete", 400);
  }
  
  // Prevenção: Administradores não podem excluir a si mesmos
  if (userIdToDelete === adminUserId) {
    return returnError("Forbidden: Cannot delete your own account via this endpoint", 403);
  }
  
  // 4. Excluir o usuário usando o Service Role Key
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (deleteError) {
    console.error("Supabase Delete User Error:", deleteError);
    return returnError(deleteError.message, 400);
  }

  return new Response(JSON.stringify({ message: "User deleted successfully" }), {
    status: 200,
    headers: corsHeaders,
  });
});