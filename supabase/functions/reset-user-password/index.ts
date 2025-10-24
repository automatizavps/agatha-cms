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
  
  // Decodificar o token para obter o ID do usuário logado (Admin/Editor)
  const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

  if (userError || !adminUser) {
    return returnError("Unauthorized: Invalid token or session expired", 401);
  }
  
  const adminUserId = adminUser.id;

  // 3. Verificar se o usuário logado é Super Admin
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id")
    .eq("id", adminUserId)
    .single();

  // A Edge Function de reset de senha só deve ser usada pelo Super Admin (Antigo SA)
  const isSuperAdmin = profileData?.perfil_customizado_id === null && profileData?.empresa_id === null;

  if (profileError || !isSuperAdmin) {
    return returnError("Forbidden: Only Super Admin can reset user passwords", 403);
  }

  // 4. Processar o corpo da requisição
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
  
  // 5. Atualizar a senha do usuário alvo usando o Service Role Key
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