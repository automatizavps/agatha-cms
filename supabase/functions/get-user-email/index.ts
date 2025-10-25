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
  
  // **REMOVIDA A VERIFICAÇÃO DE PERFIL/ADMIN**
  // Assumimos que o usuário autenticado pode buscar o email de outro usuário.

  // 2. Processar o corpo da requisição
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
  
  // 3. Buscar o email do usuário alvo usando o Service Role Key
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});