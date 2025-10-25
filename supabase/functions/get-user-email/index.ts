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
    let isSuperAdmin = false;
    let isCompanyAdmin = false;
    
    try {
        // Cliente com token do usuário para chamar RPCs
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
        
        // Verifica se é Super Admin (RPC)
        const { data: isSaData } = await supabaseClient.rpc('is_super_admin');
        
        isSuperAdmin = isSaData === true;
        
        // Se não for Super Admin, verifica se tem empresa_id (Admin de Empresa)
        if (!isSuperAdmin) {
            const { data: profileData } = await supabaseAdmin
                .from("usuarios")
                .select("empresa_id")
                .eq("id", adminUserId)
                .maybeSingle();
                
            // Se o perfil existir e tiver empresa_id, é um usuário de empresa
            if (profileData && profileData.empresa_id !== null) {
                isCompanyAdmin = true;
            }
        }
    } catch (e) {
        console.error("Error during permission check:", e);
        // Se houver qualquer erro na verificação de permissão, negamos o acesso
        return returnError("Forbidden: Permission check failed internally", 403);
    }


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
      // CORREÇÃO: Usar a função returnError
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