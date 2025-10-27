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

  const returnError = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  // 1. Inicializar cliente Admin
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

  // 2. Autenticação (Verificar se o usuário está logado)
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

  const { bucketName, pathPrefix } = data;

  if (!bucketName) {
    return returnError("Missing required field: bucketName", 400);
  }
  
  // O pathPrefix deve ser o caminho da pasta (ID da empresa)
  const path = pathPrefix || ''; 

  try {
    // 4. Listar arquivos no caminho especificado (pathPrefix)
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(path, {
        limit: 100, 
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error(`Error listing files in ${bucketName}/${path}:`, error);
      throw new Error(error.message);
    }
    
    // 5. Filtrar apenas arquivos (id !== null) e adicionar publicUrl
    const validFiles = files
      .filter(file => file.id !== null)
      .map(file => {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        
        return {
          ...file,
          fullPath: fullPath,
          publicUrl: supabaseAdmin.storage.from(bucketName).getPublicUrl(fullPath).data.publicUrl,
        };
      });

    return new Response(JSON.stringify({ files: validFiles }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return returnError(`Failed to list files: ${e.message}`, 500);
  }
});