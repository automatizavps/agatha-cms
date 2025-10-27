import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface ClientAvatarUploadProps {
  currentAvatarUrl: string | null | undefined;
  clientName: string;
  companyId: string;
  onUploadComplete: (newUrl: string | null) => void;
  disabled?: boolean;
}

const BUCKET_NAME = 'client_avatars';

const ClientAvatarUpload: React.FC<ClientAvatarUploadProps> = ({ currentAvatarUrl, clientName, companyId, onUploadComplete, disabled = false }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const initials = clientName?.slice(0, 2).toUpperCase() || 'C';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!companyId || !file) {
      showError(t("error_loading_data") + ": ID da empresa ou arquivo ausente.");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    // O path deve ser 'companyId/timestamp-random.ext' para que a RLS funcione corretamente
    const fileName = `${companyId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`; 
    const filePath = fileName; 

    try {
      // 1. Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }
      
      // 2. Obter a URL pública
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const newUrl = publicUrlData.publicUrl;

      // 3. Se houver um avatar antigo, tentar deletá-lo
      if (currentAvatarUrl) {
        // Extrai o path do arquivo antigo (ex: client_avatars/companyId/filename)
        const oldPathMatch = currentAvatarUrl.match(new RegExp(`${BUCKET_NAME}/(.*)`));
        if (oldPathMatch && oldPathMatch[1]) {
          const oldPath = oldPathMatch[1];
          // Verifica se o path antigo é diferente do novo antes de deletar
          if (oldPath !== filePath) {
             await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
          }
        }
      }

      showSuccess(t("image_uploaded_success", { defaultValue: "Avatar atualizado com sucesso!" }));
      onUploadComplete(newUrl);
      setFile(null);

    } catch (error: any) {
      showError(t("upload_failed", { defaultValue: "Falha no upload" }) + ": " + error.message);
      onUploadComplete(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  }, [companyId, file, currentAvatarUrl, onUploadComplete, t]);
  
  const handleRemove = useCallback(async () => {
    if (!companyId || !currentAvatarUrl) return;
    
    setUploading(true);
    
    try {
      const pathMatch = currentAvatarUrl.match(new RegExp(`${BUCKET_NAME}/(.*)`));
      if (pathMatch && pathMatch[1]) {
        const pathToDelete = pathMatch[1];
        
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([pathToDelete]);

        if (deleteError) {
          throw deleteError;
        }
        
        showSuccess(t("image_removed_success", { defaultValue: "Avatar removido com sucesso!" }));
        onUploadComplete(null);
      }
    } catch (error: any) {
      showError(t("remove_failed", { defaultValue: "Falha ao remover avatar" }) + ": " + error.message);
    } finally {
      setUploading(false);
    }
  }, [companyId, currentAvatarUrl, onUploadComplete, t]);

  const displayUrl = file ? URL.createObjectURL(file) : currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24 border-2 border-primary/50">
        <AvatarImage src={displayUrl || undefined} alt={clientName} />
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex w-full max-w-xs items-center space-x-2">
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          disabled={disabled || uploading}
          className="flex-1"
        />
        
        {file ? (
          <Button 
            onClick={handleUpload} 
            disabled={uploading || disabled}
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        ) : currentAvatarUrl && (
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={handleRemove} 
            disabled={uploading || disabled}
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {file && !uploading && (
        <p className="text-xs text-muted-foreground">{t('click_upload_to_save', { defaultValue: "Clique em Upload para salvar a nova imagem." })}</p>
      )}
    </div>
  );
};

export default ClientAvatarUpload;