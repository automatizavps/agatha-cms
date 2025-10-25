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
    
    // Decodificar o token para obter o ID do usuário logado (Admin/Editor)
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

    if (userError || !adminUser) {
      return returnError("Unauthorized: Invalid token or session expired", 401);
    }
    
    const adminUserId = adminUser.id;

    // 3. Verificar permissões usando RPC (para Super Admin) e perfil (para Admin de Empresa)
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
    
    const { data: isSaData } = await supabaseClient.rpc('is_super_admin');
    const isSuperAdmin = isSaData === true;
    
    // Buscar perfil para verificar se é Admin de Empresa
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("empresa_id")
      .eq("id", adminUserId)
      .single();

    if (profileError || !profileData) {
      return returnError("Forbidden: User profile not found for permission check", 403);
    }
    
    const isCompanyAdmin = profileData.empresa_id !== null; 

    if (!isSuperAdmin && !isCompanyAdmin) {
      return returnError("Forbidden: User does not have administrative privileges", 403);
    }

    // 4. Processar o corpo da requisição
    let data;
    try {
      data = await req.json();
    } catch (e) {
      return returnError("Invalid JSON body", 400);
    }

    const { userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id } = data;

    if (!userIdToUpdate || !full_name || !perfil_id) {
      return returnError("Missing required fields: userIdToUpdate, full_name, or perfil_id", 400);
    }
    
    // Determinar se o perfil_id é um UUID (customizado) ou INTEGER '1' (Antigo Super Admin)
    const isCustomProfile = typeof perfil_id === 'string' && perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    let custom_perfil_id: string | null = null;
    
    if (isCustomProfile) {
      custom_perfil_id = perfil_id;
    } else if (perfil_id === '1') {
      // Se for o antigo Super Admin, o custom_perfil_id deve ser NULL
      custom_perfil_id = null;
    } else {
      return returnError("Invalid profile ID provided. Must be a custom profile UUID or '1' for Super Admin.", 400);
    }
    
    // Construir o objeto de atualização
    const updatePayload: Record<string, any> = {
      nome_completo: full_name, 
      perfil_customizado_id: custom_perfil_id, // Atualiza o perfil customizado (UUID ou NULL)
      telefone: telefone,
      endereco_completo: endereco_completo,
    };
    
    // Apenas Super Admin pode alterar a empresa_id
    if (isSuperAdmin && empresa_id !== undefined) {
      // Se empresa_id for null ou string vazia, definimos como null no banco
      updatePayload.empresa_id = empresa_id || null;
    }
    
    // 4. Atualizar o perfil do usuário na tabela 'usuarios'
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update(updatePayload)
      .eq("id", userIdToUpdate);

    if (updateError) {
      console.error("Supabase Update User Error:", updateError);
      return returnError(updateError.message, 400);
    }

    // 5. Opcional: Atualizar o metadado do usuário no auth.users (para consistência)
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userIdToUpdate,
      {
        user_metadata: {
          full_name: full_name,
          perfil_id: perfil_id, // Passamos o ID original (UUID ou INTEGER '1')
          telefone: telefone,
          endereco_completo: endereco_completo,
        }
      }
    );

    if (authUpdateError) {
      console.warn("Supabase Auth Metadata Update Warning (non-critical):", authUpdateError);
    }


    return new Response(JSON.stringify({ message: "User updated successfully" }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("Catastrophic error in update-user:", e);
    return returnError(`Internal Server Error: ${e.message}`, 500);
  }
});