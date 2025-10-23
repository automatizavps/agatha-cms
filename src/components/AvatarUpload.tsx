import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';

interface AvatarUploadProps {
  currentAvatarUrl: string | null | undefined;
  onUploadComplete: (newUrl: string | null) => void;
  disabled?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatarUrl, onUploadComplete, disabled = false }) => {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const userId = user?.id;
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!userId || !file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    // O path deve ser 'user_id/filename' para que a RLS funcione corretamente
    const filePath = `${userId}/${fileName}`; 

    try {
      // 1. Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }
      
      // 2. Obter a URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const newUrl = publicUrlData.publicUrl;

      // 3. Se houver um avatar antigo, tentar deletá-lo (opcional, mas limpa o storage)
      if (currentAvatarUrl) {
        const oldPathMatch = currentAvatarUrl.match(/avatars\/(.*)/);
        if (oldPathMatch && oldPathMatch[1]) {
          const oldPath = oldPathMatch[1];
          // Verifica se o path antigo é diferente do novo antes de deletar
          if (oldPath !== filePath) {
             await supabase.storage.from('avatars').remove([oldPath]);
          }
        }
      }

      showSuccess("Avatar atualizado com sucesso!");
      onUploadComplete(newUrl);
      setFile(null);

    } catch (error: any) {
      showError("Falha no upload: " + error.message);
      onUploadComplete(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  }, [userId, file, currentAvatarUrl, onUploadComplete]);
  
  const handleRemove = useCallback(async () => {
    if (!userId || !currentAvatarUrl) return;
    
    setUploading(true);
    
    try {
      const pathMatch = currentAvatarUrl.match(/avatars\/(.*)/);
      if (pathMatch && pathMatch[1]) {
        const pathToDelete = pathMatch[1];
        
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([pathToDelete]);

        if (deleteError) {
          throw deleteError;
        }
        
        showSuccess("Avatar removido com sucesso!");
        onUploadComplete(null);
      }
    } catch (error: any) {
      showError("Falha ao remover avatar: " + error.message);
    } finally {
      setUploading(false);
    }
  }, [userId, currentAvatarUrl, onUploadComplete]);

  const displayUrl = file ? URL.createObjectURL(file) : currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24 border-2 border-primary/50">
        <AvatarImage src={displayUrl || undefined} alt="Avatar" />
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
        <p className="text-xs text-muted-foreground">Clique em Upload para salvar a nova imagem.</p>
      )}
    </div>
  );
};

export default AvatarUpload;