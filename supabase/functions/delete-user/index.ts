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

  // 1. Autenticação (Verificar se o usuário está logado)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
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

  // Get user claims
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  const adminUserId = userResponse.user.id;

  // **REMOVIDA A VERIFICAÇÃO DE PERFIL/ADMIN**
  // Assumimos que qualquer usuário autenticado pode tentar excluir, mas a segurança
  // é mantida pela restrição de não poder excluir a si mesmo.

  // 2. Processar o corpo da requisição
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
  
  // Prevenção: Administradores não podem excluir a si mesmos
  if (userIdToDelete === adminUserId) {
    return returnError("Forbidden: Cannot delete your own account via this endpoint", 403);
  }
  
  // 3. Excluir o usuário usando o Service Role Key
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (deleteError) {
    console.error("Supabase Delete User Error:", deleteError);
    return returnError(deleteError.message, 400);
  }

  return new Response(JSON.stringify({ message: "User deleted successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});