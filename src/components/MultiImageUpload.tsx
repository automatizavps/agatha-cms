import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent } from '@/components/ui/card';

interface MultiImageUploadProps {
  currentUrls: string[] | null;
  onUrlsChange: (newUrls: string[] | null) => void;
  disabled?: boolean;
  companyId?: string; // Adicionado para consistência, embora não usado diretamente aqui
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ currentUrls = [], onUrlsChange, disabled = false, companyId }) => {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  
  const userId = user?.id;
  const bucketName = 'product_images';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFilesToUpload(selectedFiles);
  };

  const handleUpload = useCallback(async () => {
    if (!userId || filesToUpload.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [...(currentUrls || [])];
    let successCount = 0;

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        
        // NOVO CAMINHO: companyId/userId/timestamp-random.ext
        const pathPrefix = companyId || userId; // Usa companyId se disponível, senão userId
        const fileName = `${pathPrefix}/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          showError(`Falha ao fazer upload de ${file.name}: ${uploadError.message}`);
          continue;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
            
        newUrls.push(publicUrlData.publicUrl);
        successCount++;
      }

      if (successCount > 0) {
        showSuccess(`${successCount} imagem(ns) enviada(s) com sucesso!`);
        onUrlsChange(newUrls);
      }
      setFilesToUpload([]);

    } catch (error: any) {
      showError("Erro geral no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }, [userId, filesToUpload, currentUrls, onUrlsChange, companyId]);
  
  const handleRemove = useCallback(async (urlToRemove: string) => {
    if (!userId) return;
    
    // 1. Remover da lista local IMEDIATAMENTE
    const updatedUrls = currentUrls?.filter(url => url !== urlToRemove) || null;
    onUrlsChange(updatedUrls);
    showSuccess("Imagem removida.");
    
    // 2. Remover do Supabase Storage (operação assíncrona em segundo plano)
    // O caminho completo é extraído da URL pública
    const urlParts = urlToRemove.split('product_images/');
    if (urlParts.length > 1) {
      const pathToDelete = urlParts[1];
      
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([pathToDelete]);
        
      if (deleteError) {
        console.error("Storage delete error (non-critical for UI):", deleteError);
      }
    }
    
  }, [userId, currentUrls, onUrlsChange]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Fotos do Produto/Serviço</h3>
      
      {/* Visualização das Imagens Atuais */}
      {currentUrls && currentUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {currentUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
              <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 p-1"
                onClick={() => handleRemove(url)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Seção de Upload */}
      <Card className="p-4">
        <CardContent className="p-0 space-y-3">
          <Input 
            type="file" 
            accept="image/*" 
            multiple
            onChange={handleFileChange} 
            disabled={disabled || uploading}
          />
          
          {filesToUpload.length > 0 && (
            <Button 
              onClick={handleUpload} 
              disabled={uploading || disabled}
              className="w-full"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {filesToUpload.length} Imagem(ns)
                </>
              )}
            </Button>
          )}
          
          {filesToUpload.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">Selecione arquivos para fazer upload.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiImageUpload;