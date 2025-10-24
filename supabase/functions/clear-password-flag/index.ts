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

  // 1. Autenticação (Verificar se o usuário está logado)
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

  // Obter o usuário logado
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return new Response("Unauthorized: Invalid token", {
      status: 401,
      headers: corsHeaders,
    });
  }
  
  const userId = userResponse.user.id;

  // 2. Obter o app_metadata atual
  const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (fetchError || !userData.user) {
    return new Response(JSON.stringify({ error: "Failed to fetch user data." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const currentAppMetadata = userData.user.app_metadata;
  
  // 3. Remover o flag must_change_password
  const newAppMetadata = { ...currentAppMetadata };
  delete newAppMetadata.must_change_password;

  // 4. Atualizar o app_metadata do usuário
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { app_metadata: newAppMetadata }
  );

  if (updateError) {
    console.error("Supabase App Metadata Update Error:", updateError);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Password change flag cleared successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});