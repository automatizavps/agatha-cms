import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
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
    
    // Decodificar o token para obter o ID do usuário logado (Admin/Editor)
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

    if (userError || !adminUser) {
      return returnError("Unauthorized: Invalid token or session expired", 401);
    }
    
    const adminUserId = adminUser.id;

    // 3. Processar o corpo da requisição
    let data;
    try {
      data = await req.json();
    } catch (e) {
      return returnError("Invalid JSON body", 400);
    }

    const { userIdToDelete } = data;

    if (!userIdToDelete) {
      return returnError("Missing required field: userIdToDelete", 400);
    }
    
    if (userIdToDelete === adminUserId) {
        return returnError("Forbidden: You cannot delete your own account.", 403);
    }

    // 4. Verificar permissão e RLS (Admin/Super Admin)
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("empresa_id, perfil_customizado_id, perfis_customizados (nome)")
      .eq("id", adminUserId)
      .single();
      
    if (profileError || !adminProfile) {
        return returnError("Forbidden: Admin profile not found", 403);
    }
    
    const isSuperAdmin = adminProfile.perfil_customizado_id === null && adminProfile.empresa_id === null;
    
    // Se não for Super Admin, verifica se o usuário alvo pertence à mesma empresa
    if (!isSuperAdmin) {
        const { data: targetUser, error: targetError } = await supabaseAdmin
            .from("usuarios")
            .select("empresa_id")
            .eq("id", userIdToDelete)
            .single();
            
        if (targetError || !targetUser) {
            return returnError("Target user not found.", 400);
        }
        
        if (targetUser.empresa_id !== adminProfile.empresa_id) {
            return returnError("Forbidden: You can only delete users within your own company.", 403);
        }
    }

    // 5. Excluir o usuário do Supabase Auth
    // A exclusão do Auth dispara a exclusão em cascata na tabela 'usuarios' (via FK ON DELETE CASCADE)
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthUserError) {
      console.error("Supabase Delete User Error:", deleteAuthUserError);
      return returnError(deleteAuthUserError.message, 400);
    }

    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("Catastrophic error in delete-user:", e);
    return returnError(`Internal Server Error: ${e.message}`, 500);
  }
});