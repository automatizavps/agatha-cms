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

  const { bucketName, pathPrefix } = data; // pathPrefix é o novo campo

  if (!bucketName) {
    return returnError("Missing required field: bucketName", 400);
  }
  
  // 4. Listar arquivos recursivamente
  const listAllFiles = async (path: string = ''): Promise<any[]> => {
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(path, {
        limit: 100, 
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error(`Error listing files in ${bucketName}/${path}:`, error);
      throw new Error(error.message);
    }

    let allFiles: any[] = [];
    
    for (const file of files) {
      const fullPath = path ? `${path}/${file.name}` : file.name;
      
      if (file.id === null) { // É uma pasta
        // Se estamos filtrando por prefixo e o prefixo não corresponde, pulamos
        if (pathPrefix && !fullPath.startsWith(pathPrefix) && path === '') {
             continue;
        }
        // Recursivamente lista o conteúdo da pasta
        const subFiles = await listAllFiles(fullPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        // É um arquivo, verifica se corresponde ao prefixo (se houver)
        if (!pathPrefix || fullPath.startsWith(pathPrefix)) {
            allFiles.push({
              ...file,
              fullPath: fullPath,
              publicUrl: supabaseAdmin.storage.from(bucketName).getPublicUrl(fullPath).data.publicUrl,
            });
        }
      }
    }
    
    return allFiles;
  };
  
  try {
    // Se pathPrefix for fornecido, começamos a busca a partir dele
    const initialPath = pathPrefix || '';
    const files = await listAllFiles(initialPath);
    
    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return returnError(`Failed to list files: ${e.message}`, 500);
  }
});