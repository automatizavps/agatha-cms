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

  // 1. Inicializar cliente Admin
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

  // 2. Autenticação (Verificar se o usuário está logado)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  // **REMOVIDA A VERIFICAÇÃO DE PERFIL/ADMIN**
  // Assumimos que o usuário autenticado pode atualizar outros usuários.

  // 3. Processar o corpo da requisição
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
  
  // Determinar se o perfil_id é um UUID (customizado) ou INTEGER '1' (Super Admin)
  const isCustomProfile = typeof perfil_id === 'string' && perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  
  let custom_perfil_id: string | null = null;
  
  if (isCustomProfile) {
    custom_perfil_id = perfil_id;
  } else if (perfil_id === '1') {
    custom_perfil_id = null;
  } else {
    return returnError("Invalid profile ID provided. Must be a custom profile UUID or '1' for Super Admin.", 400);
  }
  
  // Construir o objeto de atualização
  const updatePayload: Record<string, any> = {
    nome_completo: full_name, 
    perfil_customizado_id: custom_perfil_id,
    telefone: telefone,
    endereco_completo: endereco_completo,
  };
  
  // Permite a atualização do empresa_id se for fornecido
  if (empresa_id !== undefined) {
    updatePayload.empresa_id = empresa_id || null;
  }
  
  // 3. Atualizar o perfil do usuário na tabela 'usuarios'
  const { error: updateError } = await supabaseAdmin
    .from("usuarios")
    .update(updatePayload)
    .eq("id", userIdToUpdate);

  if (updateError) {
    console.error("Supabase Update User Error:", updateError);
    return returnError(updateError.message, 400);
  }

  // 4. Opcional: Atualizar o metadado do usuário no auth.users (para consistência)
  const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToUpdate,
    {
      user_metadata: {
        full_name: full_name,
        perfil_id: perfil_id,
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});