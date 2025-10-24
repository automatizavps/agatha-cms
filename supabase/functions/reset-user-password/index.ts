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

  // Check if the user is a Super Admin
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

  if (!isSuperAdmin) {
    return returnError("Forbidden: Only Super Admin can reset user passwords", 403);
  }

  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { userIdToUpdate, newPassword } = data;

  if (!userIdToUpdate || !newPassword) {
    return returnError("Missing required fields: userIdToUpdate or newPassword", 400);
  }
  
  // 4. Atualizar a senha do usuário alvo usando o Service Role Key
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToUpdate,
    { password: newPassword }
  );

  if (updateError) {
    console.error("Supabase Password Reset Error:", updateError);
    return returnError(updateError.message, 400);
  }

  return new Response(JSON.stringify({ message: "Password reset successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});