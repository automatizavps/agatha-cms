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
  
  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id, password } = data;

  if (!email || !full_name || !perfil_id || !target_empresa_id) {
    return returnError("Missing required fields: email, full_name, perfil_id, or target_empresa_id", 400);
  }
  
  // O perfil_id deve ser um UUID (customizado)
  if (perfil_id !== '1' && !perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return returnError("Invalid profile ID provided. Must be a custom profile UUID or '1' for Super Admin.", 400);
  }
  
  const final_empresa_id = target_empresa_id;
  const meta_perfil_id: string = perfil_id;
  
  // URL de redirecionamento para o fluxo de convite (se usado)
  const redirectUrl = `https://qdscirbsypclxzlojgug.supabase.co/auth/v1/verify?redirect_to=https://site-landing3.b9c03f.easypanel.host/login`;

  let authResult;
  let authError;
  let invitedUserId;
  
  const userMetadata = {
    full_name: full_name,
    perfil_id: meta_perfil_id,
    telefone: telefone,
    endereco_completo: endereco_completo,
  };

  if (password) {
    // Opção 1: Criar usuário diretamente com senha (signUp)
    console.log("Attempting to sign up user with password.");
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: userMetadata,
    });
    
    authResult = signUpData;
    authError = signUpError;
    invitedUserId = signUpData.user?.id;
    
  } else {
    // Opção 2: Enviar convite por email (inviteUserByEmail)
    console.log("Attempting to invite user by email.");
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: userMetadata,
        redirectTo: redirectUrl,
        app_metadata: {
          must_change_password: true, // Mantém o flag para forçar a mudança no primeiro login
        }
      }
    );
    
    authResult = inviteData;
    authError = inviteError;
    invitedUserId = inviteData.user?.id;
  }

  if (authError) {
    console.error("Supabase Auth Error:", authError);
    return returnError(authError.message, 400);
  }
  
  // 4. Atualizar a empresa_id e perfil_customizado_id diretamente na tabela usuarios
  if (invitedUserId) {
    const { error: updateProfileError } = await supabaseAdmin
      .from("usuarios")
      .update({ 
        empresa_id: final_empresa_id,
        perfil_customizado_id: meta_perfil_id === '1' ? null : meta_perfil_id, // '1' é NULL no banco
      })
      .eq("id", invitedUserId);

    if (updateProfileError) {
      console.error("Supabase Update Profile Error:", updateProfileError);
    }
  }


  return new Response(JSON.stringify({ message: "User created/invited successfully", user: authResult.user }), {
    status: 200,
    headers: corsHeaders,
  });
});