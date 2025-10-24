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
  
  const inviterUserId = userResponse.user.id;

  // Check if the user is a Super Admin (Perfil ID 1)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id, empresa_id")
    .eq("id", inviterUserId)
    .single();

  if (profileError || !profileData || profileData.perfil_id !== 1) {
    // Apenas Super Admin pode convidar agora
    return new Response("Forbidden: Only Super Admin can invite new users", {
      status: 403,
      headers: corsHeaders,
    });
  }
  
  const isSuperAdmin = profileData.perfil_id === 1;
  // const inviterCompanyId = profileData.empresa_id; // Não é mais usado, Super Admin define a empresa


  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id } = data;

  if (!email || !full_name || !perfil_id) {
    return new Response("Missing required fields: email, full_name, or perfil_id", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // Determinar a empresa alvo (obrigatório para Super Admin)
  let final_empresa_id = target_empresa_id || null;
  
  if (!final_empresa_id) {
    return new Response(JSON.stringify({ error: "A empresa é obrigatória para o Super Admin ao convidar." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // O perfil_id pode ser um INTEGER (1) ou um UUID (customizado)
  let meta_perfil_id: string | number = perfil_id;
  
  // Se for um número, converte para INTEGER
  if (!isNaN(Number(perfil_id)) && Number(perfil_id) === 1) {
      meta_perfil_id = 1;
  }
  // Se for um UUID, mantém como string (UUID)
  
  // Garantir que o redirectTo seja o URL de login fornecido pelo usuário
  const redirectUrl = `https://qdscirbsypclxzlojgug.supabase.co/auth/v1/verify?redirect_to=https://site-landing3.b9c03f.easypanel.host/login`;


  // 3. Convidar o usuário usando o Service Role Key
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: full_name,
        perfil_id: meta_perfil_id, // Passa o ID (INTEGER ou UUID)
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
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 4. Atualizar a empresa_id diretamente na tabela usuarios
  const invitedUserId = inviteData.user?.id;

  if (invitedUserId) {
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