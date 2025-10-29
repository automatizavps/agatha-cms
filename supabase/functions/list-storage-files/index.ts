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
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return returnError("Unauthorized: Missing or invalid Authorization header", 401);
  }
  
  const token = authHeader.replace("Bearer ", "");

  // Usar o token para obter o usuário
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userResponse.user) {
    console.error("Authentication failed:", userError?.message);
    return returnError("Unauthorized: Invalid token or session expired", 401);
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
  
  // 4. Listar arquivos recursivamente (usando a opção search do list)
  try {
    let allFiles: any[] = [];
    let currentPage = 0;
    const pageSize = 100; // Limite máximo por chamada

    while (true) {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucketName)
        .list(pathPrefix || '', {
          limit: pageSize,
          offset: currentPage * pageSize,
          sortBy: { column: 'name', order: 'asc' },
          search: '', // Não usamos search, mas listamos o diretório
        });

      if (error) {
        console.error(`Error listing files in ${bucketName}/${pathPrefix || ''}:`, error);
        throw new Error(error.message);
      }
      
      if (!files || files.length === 0) {
        break; // Sai do loop se não houver mais arquivos
      }

      for (const file of files) {
        // Ignora diretórios (itens sem 'id' são diretórios)
        if (file.id === null) continue; 
        
        // Constrói o fullPath corretamente
        const fullPath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
        
        allFiles.push({
          ...file,
          fullPath: fullPath,
          publicUrl: supabaseAdmin.storage.from(bucketName).getPublicUrl(fullPath).data.publicUrl,
        });
      }
      
      // Se o número de arquivos retornados for menor que o limite, terminamos.
      if (files.length < pageSize) {
        break;
      }
      
      currentPage++;
    }
    
    return new Response(JSON.stringify({ files: allFiles }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return returnError(`Failed to list files: ${e.message}`, 500);
  }
});