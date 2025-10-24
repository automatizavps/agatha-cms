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

  // Check if the user is an Admin (Perfil ID 2 - Administrador, ou 1 - Super Admin)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id, empresa_id")
    .eq("id", inviterUserId)
    .single();

  if (profileError || !profileData || (profileData.perfil_id !== 1 && profileData.perfil_id !== 2)) {
    return new Response("Forbidden: User does not have administrative privileges", {
      status: 403,
      headers: corsHeaders,
    });
  }
  
  const isSuperAdmin = profileData.perfil_id === 1;
  const inviterCompanyId = profileData.empresa_id;


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
  
  // Determinar a empresa alvo
  let final_empresa_id = null;
  if (isSuperAdmin) {
    // Para Super Admin, target_empresa_id deve ser fornecido e não pode ser falsy (incluindo null ou string vazia)
    if (!target_empresa_id) { 
      return new Response("Missing required field: empresa_id (for Super Admin)", {
        status: 400,
        headers: corsHeaders,
      });
    }
    final_empresa_id = target_empresa_id;
  } else {
    // Admin/Funcionário só pode convidar para sua própria empresa
    final_empresa_id = inviterCompanyId;
  }

  if (!final_empresa_id) {
    return new Response("Cannot determine target company ID.", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Garantir que o redirectTo seja o URL de login fornecido pelo usuário
  // O Supabase adiciona o hash #access_token=...
  const redirectUrl = `https://site-landing3.b9c03f.easypanel.host/login`;


  // 3. Convidar o usuário usando o Service Role Key
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: full_name,
        perfil_id: perfil_id,
        telefone: telefone, // Passando para raw_user_meta_data
        endereco_completo: endereco_completo, // Passando para raw_user_meta_data
      },
      redirectTo: redirectUrl,
    }
  );

  if (inviteError) {
    console.error("Supabase Invite Error:", inviteError);
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 4. Atualizar a empresa_id diretamente na tabela usuarios (o trigger handle_new_user já inseriu o registro)
  // Isso é necessário porque o trigger só insere o que está no raw_user_meta_data, mas não a empresa_id.
  // O trigger handle_new_empresa só funciona quando uma empresa é criada.
  // Para convites, precisamos garantir que a empresa_id seja definida.
  
  // O usuário convidado ainda não tem um ID no auth.users até que ele clique no link.
  // No entanto, o inviteUserByEmail retorna o ID do usuário pendente.
  const invitedUserId = inviteData.user?.id;

  if (invitedUserId) {
    const { error: updateCompanyError } = await supabaseAdmin
      .from("usuarios")
      .update({ empresa_id: final_empresa_id })
      .eq("id", invitedUserId);

    if (updateCompanyError) {
      console.error("Supabase Update Company ID Error:", updateCompanyError);
      // Isso é um erro sério, mas o convite foi enviado.
    }
  }


  return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});