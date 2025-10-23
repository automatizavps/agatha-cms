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

  // 1. Autenticação (Verificar se o usuário é um administrador)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized: Missing Authorization header", {
      status: 401,
      headers: corsHeaders,
    });
  }

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

  // Get user claims to check profile/role
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return new Response("Unauthorized: Invalid token", {
      status: 401,
      headers: corsHeaders,
    });
  }
  
  const adminUserId = userResponse.user.id;

  // Check if the user is an Admin (Perfil ID 2 - Administrador, ou 1 - Super Admin)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData || (profileData.perfil_id !== 1 && profileData.perfil_id !== 2)) {
    return new Response("Forbidden: User does not have administrative privileges", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { userIdToDelete } = data;

  if (!userIdToDelete) {
    return new Response("Missing required field: userIdToDelete", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // Prevenção: Administradores não podem excluir a si mesmos
  if (userIdToDelete === adminUserId) {
    return new Response("Forbidden: Cannot delete your own account via this endpoint", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 3. Excluir o usuário usando o Service Role Key
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (deleteError) {
    console.error("Supabase Delete User Error:", deleteError);
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "User deleted successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});