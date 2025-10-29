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

  // 1. Autenticação (Verificar se o usuário está logado)
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
  
  // **REMOVIDA A VERIFICAÇÃO DE SUPER ADMIN**
  // Assumimos que o usuário autenticado pode convidar.

  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id } = data;

  if (!email || !full_name || !perfil_id || !target_empresa_id) {
    return returnError("Missing required fields: email, full_name, perfil_id, or target_empresa_id", 400);
  }
  
  // O perfil_id deve ser um UUID (customizado)
  if (perfil_id !== '1' && !perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return returnError("Invalid profile ID provided. Must be a custom profile UUID or '1' for Super Admin.", 400);
  }
  
  const final_empresa_id = target_empresa_id;
  const meta_perfil_id: string = perfil_id;
  
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
        perfil_id: meta_perfil_id,
        telefone: telefone,
        endereco_completo: endereco_completo,
      },
      redirectTo: redirectUrl,
      app_metadata: {
        must_change_password: true,
      }
    }
  );

  if (inviteError) {
    console.error("Supabase Invite Error:", inviteError);
    return returnError(inviteError.message, 400);
  }
  
  // 4. Inserir/Atualizar o perfil do usuário na tabela 'usuarios'
  const invitedUserId = inviteData.user?.id;

  if (invitedUserId) {
    const { error: upsertProfileError } = await supabaseAdmin
      .from("usuarios")
      .upsert({ 
        id: invitedUserId, // Chave primária para upsert
        nome_completo: full_name,
        empresa_id: final_empresa_id,
        perfil_customizado_id: meta_perfil_id === '1' ? null : meta_perfil_id, // '1' é NULL no banco
        telefone: telefone,
        endereco_completo: endereco_completo,
      }, { onConflict: 'id' }); // Usa onConflict para garantir que o registro exista

    if (upsertProfileError) {
      console.error("Supabase Upsert Profile Error:", upsertProfileError);
      // Não retornamos erro 400 aqui, pois o convite Auth já foi enviado.
    }
  }


  return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
    status: 200,
    headers: corsHeaders,
  });
});