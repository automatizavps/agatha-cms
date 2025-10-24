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

  // Check if the user is Super Admin OR belongs to a company
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id, perfis_customizados (nome)")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData) {
    return returnError("Forbidden: User profile not found", 403);
  }
  
  // New SA check: perfil_customizado_id is NULL AND empresa_id is NULL (OLD SA)
  const isOldSuperAdmin = profileData.perfil_customizado_id === null && profileData.empresa_id === null;
  
  // New SA check: perfil_customizado_id is 'Super Admin' AND empresa_id is NOT NULL (NEW SA)
  const isNewSuperAdmin = 
    profileData.empresa_id !== null && 
    profileData.perfil_customizado_id !== null && 
    profileData.perfis_customizados?.nome === 'Super Admin';
    
  const isSuperAdmin = isOldSuperAdmin || isNewSuperAdmin;
  const isCompanyAdmin = profileData.empresa_id !== null; 

  if (!isSuperAdmin && !isCompanyAdmin) {
    return returnError("Forbidden: User does not have administrative privileges", 403);
  }

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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});