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
  
  const adminUserId = userResponse.user.id;

  // Check if the user is an Admin (Perfil ID 2 - Administrador, ou 1 - Super Admin)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData || (profileData.perfil_id !== 1 && profileData.perfil_id !== 2)) {
    return new Response("Forbidden: User does not have administrative privileges", {
      status: 403,
      headers: corsHeaders,
    });
  }
  
  const isSuperAdmin = profileData.perfil_id === 1;

  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id } = data;

  if (!userIdToUpdate || !full_name || !perfil_id) {
    return new Response("Missing required fields: userIdToUpdate, full_name, or perfil_id", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // Determinar se o perfil_id é um UUID (customizado) ou INTEGER (global)
  const isCustomProfile = typeof perfil_id === 'string' && perfil_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  
  let global_perfil_id: number;
  let custom_perfil_id: string | null = null;
  
  if (isCustomProfile) {
    custom_perfil_id = perfil_id;
    // Se for customizado, definimos o perfil global como 3 (Funcionário) para RLS
    global_perfil_id = 3; 
  } else {
    // Se for global (deve ser 1), usamos o valor fornecido
    global_perfil_id = Number(perfil_id);
    custom_perfil_id = null;
  }
  
  // Construir o objeto de atualização
  const updatePayload: Record<string, any> = {
    nome_completo: full_name, 
    perfil_id: global_perfil_id, // Atualiza o perfil global (1, 2 ou 3)
    perfil_customizado_id: custom_perfil_id, // Atualiza o perfil customizado (UUID ou NULL)
    telefone: telefone,
    endereco_completo: endereco_completo,
  };
  
  // Apenas Super Admin pode alterar a empresa_id
  if (isSuperAdmin && empresa_id !== undefined) {
    updatePayload.empresa_id = empresa_id;
  }

  // 3. Atualizar o perfil do usuário na tabela 'usuarios'
  const { error: updateError } = await supabaseAdmin
    .from("usuarios")
    .update(updatePayload)
    .eq("id", userIdToUpdate);

  if (updateError) {
    console.error("Supabase Update User Error:", updateError);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Opcional: Atualizar o metadado do usuário no auth.users (para consistência)
  const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToUpdate,
    {
      user_metadata: {
        full_name: full_name,
        perfil_id: perfil_id, // Passamos o ID original (UUID ou INTEGER)
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