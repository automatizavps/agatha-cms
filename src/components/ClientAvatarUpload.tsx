import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/auth';
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
  const { user } = useSession();
  const userId = user?.id;
  
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
    if (!userId || !companyId || filesToUpload.length === 0) {
      showError("Empresa não selecionada ou arquivos ausentes.");
      return;
    }

    setUploading(true);
    const newUrls: string[] = [...(currentUrls || [])];
    let successCount = 0;

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        
        // Caminho: companyId/userId/timestamp-random.ext
        const fileName = `${companyId}/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
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
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);
            
        newUrls.push(publicUrlData.publicUrl);
        successCount++;
      }

      if (successCount > 0) {
        showSuccess(`${successCount} imagem(ns) enviada(s) com sucesso!`);
        onUploadComplete(newUrls);
        refetch(); // Recarrega a lista de arquivos existentes
      }
      setFilesToUpload([]);

    } catch (error: any) {
      showError("Erro geral no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }, [userId, companyId, filesToUpload, currentUrls, onUrlsChange, refetch]);
  
  const handleRemoveFromList = useCallback((urlToRemove: string) => {
    const updatedUrls = currentUrls?.filter(url => url !== urlToRemove) || null;
    onUrlsChange(updatedUrls);
    showSuccess(t("image_removed_from_list", { defaultValue: "Imagem removida da lista." }));
  }, [currentUrls, onUrlsChange, t]);
  
  const handleToggleSelection = useCallback((url: string) => {
    const newUrls = new Set(selectedUrlsSet);
    if (newUrls.has(url)) {
      newUrls.delete(url);
    } else {
      newUrls.add(url);
    }
    onUrlsChange(Array.from(newUrls));
  }, [selectedUrlsSet, onUrlsChange]);
  
  const isCompanySelected = !!companyId;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">{t('product_image_gallery_title', { defaultValue: 'Galeria de Imagens do Produto/Serviço' })}</h3>
      
      {/* Visualização das Imagens Selecionadas */}
      {currentUrls && currentUrls.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-semibold">{t('selected_images', { defaultValue: 'Imagens Selecionadas' })} ({currentUrls.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {currentUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                  <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-contain" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 p-1"
                    onClick={() => handleRemoveFromList(url)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seletor de Imagens Existentes */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm font-semibold">{t('existing_images', { defaultValue: 'Imagens Existentes da Empresa' })}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {!isCompanySelected ? (
            <p className="text-sm text-muted-foreground">{t('select_company_to_load_data')}</p>
          ) : isLoadingExisting ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : existingFiles && existingFiles.length > 0 ? (
            <ScrollArea className="h-[150px] w-full">
              <div className="grid grid-cols-4 gap-2 pr-4">
                {existingFiles.map((file) => {
                  const isSelected = selectedUrlsSet.has(file.publicUrl);
                  return (
                    <div 
                      key={file.fullPath} 
                      className={cn(
                        "relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all",
                        isSelected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleToggleSelection(file.publicUrl)}
                    >
                      <img 
                        src={file.publicUrl} 
                        alt={file.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">{t('no_existing_images', { defaultValue: 'Nenhuma imagem existente encontrada.' })}</p>
          )}
        </CardContent>
      </Card>

      {/* Seção de Upload de Novas Imagens */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm font-semibold">{t('upload_new_images', { defaultValue: 'Fazer Upload de Novas Imagens' })}</CardHeader>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <Input 
            type="file" 
            accept="image/*" 
            multiple
            onChange={handleFileChange} 
            disabled={disabled || uploading || !isCompanySelected}
          />
          
          {filesToUpload.length > 0 && (
            <Button 
              onClick={handleUpload} 
              disabled={uploading || disabled || !isCompanySelected}
              className="w-full"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload_count_images', { count: filesToUpload.length, defaultValue: 'Upload {{count}} Imagem(ns)' })}
                </>
              )}
            </Button>
          )}
          
          {filesToUpload.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {isCompanySelected ? t('select_files_to_upload', { defaultValue: 'Selecione arquivos para fazer upload.' }) : t('select_company_to_load_data')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAvatarUpload;