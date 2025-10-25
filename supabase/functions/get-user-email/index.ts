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

  // Get user claims
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

  if (userError || !userResponse.user) {
    return new Response("Unauthorized: Invalid token", {
      status: 401,
      headers: corsHeaders,
    });
  }
  
  const adminUserId = userResponse.user.id;

  // Check if the user is Super Admin OR belongs to a company
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("empresa_id, perfil_customizado_id")
    .eq("id", adminUserId)
    .single();

  if (profileError || !profileData) {
    return new Response("Forbidden: User profile not found", {
      status: 403,
      headers: corsHeaders,
    });
  }
  
  // New SA check: perfil_customizado_id is NULL AND empresa_id is NULL
  const isSuperAdmin = profileData.perfil_customizado_id === null && profileData.empresa_id === null;
  const isCompanyUser = profileData.empresa_id !== null;

  if (!isSuperAdmin && !isCompanyUser) {
    return new Response("Forbidden: User does not have administrative privileges", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 2. Processar o corpo da requisição
  let data;
  try {
    data = await req.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { userId } = data;

  if (!userId) {
    return new Response("Missing required field: userId", {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // 3. Buscar o email do usuário alvo usando o Service Role Key
  const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (fetchError) {
    console.error("Supabase Fetch User Error:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const email = userData.user?.email;

  if (!email) {
    return new Response(JSON.stringify({ error: "Email not found for user." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ email: email }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});