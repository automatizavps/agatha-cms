import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";
import { showError, showSuccess } from "@/utils/toast";

export interface StorageFile {
  name: string;
  fullPath: string;
  publicUrl: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl: string;
  };
}

const BUCKETS = ['avatars', 'product_images'];

// --- Fetch All Files in a Bucket (via Edge Function) ---

const fetchStorageFiles = async (bucketName: string, accessToken: string, pathPrefix?: string): Promise<StorageFile[]> => {
  const { data, error } = await supabase.functions.invoke("list-storage-files", {
    body: { bucketName, pathPrefix },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error(`Error fetching files from ${bucketName}:`, error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.files as StorageFile[];
};

export const useStorageImages = (bucketName: string, pathPrefix?: string) => {
  const { session } = useSession();
  const accessToken = session?.access_token;

  return useQuery<StorageFile[], Error>({
    queryKey: ["storageImages", bucketName, pathPrefix],
    queryFn: () => fetchStorageFiles(bucketName, accessToken!, pathPrefix),
    enabled: !!accessToken && BUCKETS.includes(bucketName),
  });
};

// --- Delete File (via Client API - RLS should allow SA to delete) ---

interface DeleteFileParams {
  bucketName: string;
  fullPath: string;
}

const deleteStorageFile = async ({ bucketName, fullPath }: DeleteFileParams) => {
  // Usamos o cliente normal, pois o Super Admin deve ter permissão de DELETE via RLS
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fullPath]);

  if (error) {
    console.error("Error deleting file:", error);
    throw new Error(error.message);
  }
};

export const useDeleteStorageFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteStorageFile,
    onSuccess: (_, variables) => {
      showSuccess("Arquivo excluído com sucesso!");
      // Invalida a query do bucket específico
      queryClient.invalidateQueries({ queryKey: ["storageImages", variables.bucketName] });
    },
    onError: (error) => {
      showError("Falha ao excluir arquivo: " + error.message);
    },
  });
};