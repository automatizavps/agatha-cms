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

  // 1. Inicializar cliente Admin (Service Role Key)
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

  // 2. Autenticação (Verificar se o usuário está logado - usando o token do cliente)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return returnError("Unauthorized: Missing Authorization header", 401);
  }

  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return returnError("Unauthorized: Invalid token", 401);
  }
  
  // 3. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return returnError("Invalid JSON body", 400);
  }

  const { userIds } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return returnError("Missing or invalid field: userIds (must be a non-empty array)", 400);
  }
  
  // 4. Buscar os dados de autenticação em lote
  const emailMap: Record<string, string> = {};
  
  // Usamos Promise.all para buscar os usuários em paralelo
  const fetchPromises = userIds.map(async (userId: string) => {
    try {
      const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (fetchError) {
        console.warn(`Warning: Failed to fetch auth user ${userId}: ${fetchError.message}`);
        return { userId, email: "Erro ao buscar" };
      }
      
      return { userId, email: userData.user?.email || "N/A" };
    } catch (e) {
      console.error(`Error processing user ${userId}:`, e);
      return { userId, email: "Erro interno" };
    }
  });
  
  const results = await Promise.all(fetchPromises);
  
  results.forEach(result => {
    emailMap[result.userId] = result.email;
  });

  return new Response(JSON.stringify({ emails: emailMap }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});