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

  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  // 1. Inicializar cliente Admin (Service Role Key)
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

  // 2. Autenticação (Verificar se o usuário está logado)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  const adminUserId = userResponse.user.id;

  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { userIdToToggle, newStatus } = data;

  if (!userIdToToggle || typeof newStatus !== 'boolean') {
    return returnError("Missing required fields: userIdToToggle or newStatus", 400);
  }
  
  // Prevenção: Administradores não podem desativar a si mesmos
  if (userIdToToggle === adminUserId) {
    return returnError("Forbidden: Cannot change your own active status.", 403);
  }
  
  // 4. Atualizar o status 'is_active' na tabela 'usuarios'
  const { error: updateProfileError } = await supabaseAdmin
    .from("usuarios")
    .update({ is_active: newStatus })
    .eq("id", userIdToToggle);

  if (updateProfileError) {
    console.error("Supabase Profile Update Error:", updateProfileError);
    return returnError(updateProfileError.message, 400);
  }
  
  // 5. Atualizar o status 'banned_until' no Supabase Auth
  // Se newStatus for FALSE (desativar), definimos banned_until para uma data futura.
  // Se newStatus for TRUE (ativar), definimos banned_until para NULL.
  const bannedUntil = newStatus ? null : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 anos no futuro

  const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToToggle,
    { banned_until: bannedUntil }
  );

  if (authUpdateError) {
    console.error("Supabase Auth Update Error:", authUpdateError);
    // Se a atualização do Auth falhar, tentamos reverter a atualização do perfil (melhor esforço)
    await supabaseAdmin.from("usuarios").update({ is_active: !newStatus }).eq("id", userIdToToggle);
    return returnError(authUpdateError.message, 400);
  }

  return new Response(JSON.stringify({ message: "User status updated successfully", is_active: newStatus }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});