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

  // 1. Autenticação (Verificar se o usuário é um administrador)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
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

  // Get user claims
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  const inviterUserId = userResponse.user.id;

  // Check if the user is a Super Admin (perfil_customizado_id is NULL AND empresa_id is NULL)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id")
    .eq("id", inviterUserId)
    .single();

  const isSuperAdmin = profileData?.perfil_customizado_id === null && profileData?.empresa_id === null;

  if (profileError || !isSuperAdmin) {
    // Apenas Super Admin pode convidar agora
    return returnError("Forbidden: Only Super Admin can invite new users", 403);
  }
  
  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id } = data;

  if (!email || !full_name || !perfil_id) {
    return returnError("Missing required fields: email, full_name, or perfil_id", 400);
  }
  
  // Determinar a empresa alvo (obrigatório para Super Admin)
  let final_empresa_id = target_empresa_id || null;
  
  if (!final_empresa_id && perfil_id !== '1') {
    return returnError("A empresa é obrigatória para o Super Admin ao convidar, a menos que o perfil seja Super Admin.", 400);
  }

  // O perfil_id pode ser um UUID (customizado) ou '1' (Super Admin)
  let meta_perfil_id: string = perfil_id;
  
  // Garantir que o redirectTo seja o URL de login fornecido pelo usuário
  const redirectUrl = `https://qdscirbsypclxzlojgug.supabase.co/auth/v1/verify?redirect_to=https://site-landing3.b9c03f.easypanel.host/login`;

  console.log("Attempting to invite user with metadata:", {
    email,
    full_name,
    perfil_id: meta_perfil_id,
    telefone,
    endereco_completo,
    final_empresa_id,
  });

  // 3. Convidar o usuário usando o Service Role Key
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: full_name,
        perfil_id: meta_perfil_id, // Passa o ID (UUID ou '1')
        telefone: telefone,
        endereco_completo: endereco_completo,
      },
      redirectTo: redirectUrl,
      // NOVO: Adicionando app_metadata para forçar a mudança de senha
      app_metadata: {
        must_change_password: true,
      }
    }
  );

  if (inviteError) {
    console.error("Supabase Invite Error:", inviteError);
    // Retorna a mensagem de erro específica do Supabase Auth
    return returnError(inviteError.message, 400);
  }
  
  // 4. Atualizar a empresa_id diretamente na tabela usuarios
  const invitedUserId = inviteData.user?.id;

  if (invitedUserId && final_empresa_id) {
    const { error: updateCompanyError } = await supabaseAdmin
      .from("usuarios")
      .update({ empresa_id: final_empresa_id })
      .eq("id", invitedUserId);

    if (updateCompanyError) {
      console.error("Supabase Update Company ID Error:", updateCompanyError);
    }
  }


  return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});