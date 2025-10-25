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
    console.error(`Returning error ${status}: ${message}`);
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
    
    // 3. Verificar se o usuário logado é Super Admin (usando RPC)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    
    const { data: isSaData, error: isSaError } = await supabaseClient.rpc('is_super_admin');

    if (isSaError || isSaData !== true) {
      return returnError("Forbidden: Only Super Admin can invite new users", 403);
    }
    
    // 4. Processar o corpo da requisição
    let data;
    try {
      data = await req.json();
    } catch (e) {
      return returnError("Invalid JSON body", 400);
    }

    const { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id } = data;

    // Validação de campos obrigatórios
    if (!email || !full_name || !perfil_id) {
      return returnError("Missing required fields: email, full_name, or perfil_id", 400);
    }
    
    // O perfil_id deve ser '1' (Super Admin) ou um UUID (Customizado)
    const isCustomProfile = typeof perfil_id === 'string' && perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    let final_empresa_id: string | null = target_empresa_id || null;
    let custom_perfil_id: string | null = null;
    
    if (perfil_id === '1') {
        // Se for Super Admin, a empresa_id deve ser NULL
        final_empresa_id = null;
        custom_perfil_id = null;
    } else if (isCustomProfile) {
        // Se for perfil customizado, a empresa_id é obrigatória
        if (!final_empresa_id) {
            return returnError("Company ID is required for custom profiles.", 400);
        }
        custom_perfil_id = perfil_id;
    } else {
        return returnError("Invalid profile ID provided. Must be a custom profile UUID or '1' for Super Admin.", 400);
    }
    
    // Garantir que o redirectTo seja o URL de login fornecido pelo usuário
    const redirectUrl = `https://qdscirbsypclxzlojgug.supabase.co/auth/v1/verify?redirect_to=https://site-landing3.b9c03f.easypanel.host/login`;

    // 5. Convidar o usuário usando o Service Role Key
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: full_name,
          perfil_id: perfil_id, // Passa o ID original (UUID ou '1') para o metadado
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
    
    // 6. Atualizar a empresa_id e perfil_customizado_id diretamente na tabela usuarios
    const invitedUserId = inviteData.user?.id;

    if (invitedUserId) {
      const { error: updateProfileError } = await supabaseAdmin
        .from("usuarios")
        .update({ 
          empresa_id: final_empresa_id,
          perfil_customizado_id: custom_perfil_id, // Define o UUID do perfil customizado (ou NULL)
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