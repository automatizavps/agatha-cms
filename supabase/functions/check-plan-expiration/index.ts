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

  // 1. Inicializar cliente Admin (Service Role Key)
  // Usamos o Service Role Key para ignorar RLS e garantir que a função seja executada
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

  // 2. Executar a função RPC
  try {
    const { data, error } = await supabaseAdmin.rpc('inactivate_expired_companies');

    if (error) {
      console.error("Error executing inactivate_expired_companies RPC:", error);
      return returnError(`Database error: ${error.message}`, 500);
    }
    
    const inactivatedCount = data ? data.length : 0;

    return new Response(JSON.stringify({ 
      message: `Plan expiration check completed. ${inactivatedCount} companies inactivated.`,
      inactivated_companies: data,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Internal server error:", e);
    return returnError(`Internal server error: ${e.message}`, 500);
  }
});