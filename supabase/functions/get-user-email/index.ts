import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Função auxiliar para retornar erro JSON com CORS
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

    // 3. Verificar se o usuário logado tem permissão (Super Admin ou Admin de Empresa)
    // Usamos o cliente Admin para buscar o perfil e determinar o papel.
    const { data: profileData, error: profileError } = await supabaseAdmin
        .from("usuarios")
        .select(`
            empresa_id, 
            perfil_customizado_id,
            perfis_customizados (nome)
        `)
        .eq("id", adminUserId)
        .maybeSingle();
        
    if (profileError) {
        console.error("Profile fetch failed for permission check:", profileError);
        return returnError("Forbidden: Failed to verify user profile.", 403);
    }
    
    // Lógica de Permissão:
    // a) Super Admin (Novo SA: perfil_customizado.nome = 'Super Admin' E empresa_id IS NOT NULL)
    // b) Super Admin (Antigo SA: perfil_customizado_id IS NULL E empresa_id IS NULL)
    // c) Admin de Empresa (perfil_customizado_id IS NULL E empresa_id IS NOT NULL)
    const isSuperAdmin = 
        (profileData?.perfil_customizado_id === null && profileData?.empresa_id === null) ||
        (profileData?.perfil_customizado_id !== null && profileData?.perfis_customizados?.nome === 'Super Admin');
        
    const isCompanyAdmin = profileData?.empresa_id !== null;

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

    const { userId } = data;

    if (!userId) {
      return returnError("Missing required field: userId", 400);
    }
    
    // 5. Buscar o email do usuário alvo usando o Service Role Key
    const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchError) {
      console.error("Supabase Fetch User Error:", fetchError);
      return returnError(fetchError.message, 400);
    }
    
    const email = userData.user?.email;

    if (!email) {
      return returnError("Email not found for user.", 404);
    }

    return new Response(JSON.stringify({ email: email }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("Catastrophic error in get-user-email:", e);
    return returnError(`Internal Server Error: ${e.message}`, 500);
  }
});