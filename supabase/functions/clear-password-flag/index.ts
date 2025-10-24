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
  
  const userId = adminUser.id;

  // 3. Obter o app_metadata atual
  const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (fetchError || !userData.user) {
    return returnError("Failed to fetch user data.", 400);
  }
  
  const currentAppMetadata = userData.user.app_metadata;
  
  // 4. Remover o flag must_change_password
  const newAppMetadata = { ...currentAppMetadata };
  delete newAppMetadata.must_change_password;

  // 5. Atualizar o app_metadata do usuário
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { app_metadata: newAppMetadata }
  );

  if (updateError) {
    console.error("Supabase App Metadata Update Error:", updateError);
    return returnError(updateError.message, 400);
  }

  return new Response(JSON.stringify({ message: "Password change flag cleared successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});