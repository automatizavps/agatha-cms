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
  
  const userId = userResponse.user.id;

  // Check if the user is an Admin (Perfil ID 2 - Administrador, ou 1 - Super Admin)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("usuarios")
    .select("perfil_id")
    .eq("id", userId)
    .single();

  if (profileError || !profileData || (profileData.perfil_id !== 1 && profileData.perfil_id !== 2)) {
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

  const { email, full_name, perfil_id } = data;

  if (!email || !full_name || !perfil_id) {
    return new Response("Missing required fields: email, full_name, or perfil_id", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // 3. Convidar o usuário usando o Service Role Key
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: full_name,
        perfil_id: perfil_id, // Passamos o perfil_id para o raw_user_meta_data
      },
      redirectTo: Deno.env.get("SUPABASE_URL"), // Opcional: Redirecionar após o aceite
    }
  );

  if (inviteError) {
    console.error("Supabase Invite Error:", inviteError);
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Atualizar o perfil do usuário recém-criado (se o trigger não for suficiente)
  // O trigger handle_new_user só insere o perfil, mas não usa o perfil_id passado no invite.
  // Precisamos garantir que o perfil_id seja definido corretamente.
  
  // O trigger handle_new_user precisa ser ajustado para ler o perfil_id do raw_user_meta_data.
  // Vamos assumir que o trigger será ajustado para ler 'perfil_id' do raw_user_meta_data.
  
  // Se o trigger handle_new_user for:
  /*
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  ...
  BEGIN
    INSERT INTO public.usuarios (id, nome_completo, perfil_id)
    VALUES (
      new.id, 
      new.raw_user_meta_data ->> 'full_name', 
      (new.raw_user_meta_data ->> 'perfil_id')::int -- Lendo o perfil_id
    );
    RETURN new;
  END;
  */
  
  // Como o trigger existente só usa o perfil padrão (3), precisamos ajustá-lo.
  // Vou ajustar o trigger no passo 4c.

  return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});