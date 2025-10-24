import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Função auxiliar para retornar erro JSON
  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: corsHeaders,
    });
  };
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    const inviterUserId = adminUser.id;

    // Check if the user is Super Admin
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select(`
        empresa_id, 
        perfil_customizado_id,
        perfis_customizados (nome)
      `)
      .eq("id", inviterUserId)
      .single();

    if (profileError || !profileData) {
      return returnError("Forbidden: User profile not found", 403);
    }
    
    // Check 1: Antigo Super Admin (sem empresa e sem perfil customizado)
    const isOldSuperAdmin = profileData.perfil_customizado_id === null && profileData.empresa_id === null;
    
    // Check 2: Novo Super Admin (com empresa E perfil customizado 'Super Admin')
    const isNewSuperAdmin = 
      profileData.empresa_id !== null && 
      profileData.perfil_customizado_id !== null && 
      profileData.perfis_customizados?.nome === 'Super Admin';
      
    const isSuperAdmin = isOldSuperAdmin || isNewSuperAdmin;

    if (!isSuperAdmin) {
      return returnError("Forbidden: Only Super Admin can invite new users", 403);
    }
    
    // 3. Processar o corpo da requisição
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
    if (perfil_id === '1' || !perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return returnError("Invalid profile ID provided. Only custom profile UUIDs are allowed for invitations.", 400);
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

    // 4. Convidar o usuário usando o Service Role Key
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: full_name,
          perfil_id: meta_perfil_id, // Passa o UUID do perfil customizado
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
    
    // 5. Atualizar a empresa_id e perfil_customizado_id diretamente na tabela usuarios
    const invitedUserId = inviteData.user?.id;

    if (invitedUserId) {
      const { error: updateProfileError } = await supabaseAdmin
        .from("usuarios")
        .update({ 
          empresa_id: final_empresa_id,
          perfil_customizado_id: meta_perfil_id, // Define o perfil customizado
        })
        .eq("id", invitedUserId);

      if (updateProfileError) {
        console.error("Supabase Update Profile Error:", updateProfileError);
      }
    }


    return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("Catastrophic error in invite-user:", e);
    return returnError(`Internal Server Error: ${e.message}`, 500);
  }
});