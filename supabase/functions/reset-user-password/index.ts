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

  // Check if the user is a Super Admin (perfil_customizado_id is NULL AND empresa_id is NULL)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id")
    .eq("id", adminUserId)
    .single();

  const isSuperAdmin = profileData?.perfil_customizado_id === null && profileData?.empresa_id === null;

  if (profileError || !isSuperAdmin) {
    return new Response("Forbidden: Only Super Admin can reset user passwords", {
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

  const { userIdToUpdate, newPassword } = data;

  if (!userIdToUpdate || !newPassword) {
    return new Response("Missing required fields: userIdToUpdate or newPassword", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // 4. Atualizar a senha do usuário alvo usando o Service Role Key
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToUpdate,
    { password: newPassword }
  );

  if (updateError) {
    console.error("Supabase Password Reset Error:", updateError);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Password reset successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});