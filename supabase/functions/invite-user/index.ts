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

    const { email, full_name, telefone, endereco_completo, perfil_id, empresa_id } = data;

    if (!email || !perfil_id || !empresa_id) {
      return returnError("Missing required fields: email, perfil_id, or empresa_id", 400);
    }
    
    // 4. Verificar permissão do chamador (Admin/Super Admin)
    // Para simplificar, confiamos que o frontend só permite que Admins/SA chamem isso,
    // mas validamos que o Admin só pode convidar para sua própria empresa.
    
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("empresa_id, perfil_customizado_id, perfis_customizados (nome)")
      .eq("id", adminUserId)
      .single();
      
    if (profileError || !adminProfile) {
        return returnError("Forbidden: Admin profile not found", 403);
    }
    
    const isSuperAdmin = adminProfile.perfil_customizado_id === null && adminProfile.empresa_id === null;
    const isAdminOfCompany = adminProfile.empresa_id === empresa_id;
    
    if (!isSuperAdmin && !isAdminOfCompany) {
        return returnError("Forbidden: You can only invite users to your own company.", 403);
    }

    // 5. Convidar o usuário
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          telefone,
          endereco_completo,
          perfil_id, // UUID do perfil customizado ou '1' para Super Admin
          empresa_id, // UUID da empresa
        },
        redirectTo: Deno.env.get("SUPABASE_URL") + "/login", // Redireciona para o login
      }
    );

    if (inviteError) {
      console.error("Supabase Invite Error:", inviteError);
      return returnError(inviteError.message, 400);
    }

    return new Response(JSON.stringify({ message: "User invited successfully", user: inviteData.user }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("Catastrophic error in invite-user:", e);
    return returnError(`Internal Server Error: ${e.message}`, 500);
  }
});