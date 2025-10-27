import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon, GalleryHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent } from '@/components/ui/card';
import { useSession } from '@/integrations/supabase/auth';
import ImageSelectorDialog from './ImageSelectorDialog'; // Importando o novo componente
import { useTranslation } from 'react-i18next';

interface MultiImageUploadProps {
  currentUrls: string[] | null;
  onUrlsChange: (newUrls: string[] | null) => void;
  disabled?: boolean;
  companyId: string | undefined; // NOVO: ID da empresa para filtragem
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ currentUrls = [], onUrlsChange, disabled = false, companyId }) => {
  const { user } = useSession();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false); // Estado do modal
  
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
        // O path deve ser 'companyId/filename' para que a RLS funcione corretamente
        // Se companyId não estiver disponível, usamos userId como fallback para o prefixo
        const prefix = companyId || userId; 
        
        if (!prefix) {
          throw new Error("ID de empresa ou usuário ausente para upload.");
        }
        
        const fileName = `${prefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
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
    
    // 1. Remover do Supabase Storage
    const pathMatch = urlToRemove.match(/product_images\/(.*)/);
    if (pathMatch && pathMatch[1]) {
      const pathToDelete = pathMatch[1];
      
      // Não precisamos de setUploading aqui, pois a remoção é rápida e não bloqueia o formulário principal
      await supabase.storage
        .from(bucketName)
        .remove([pathToDelete]);
    }
    
    // 2. Remover da lista local
    const updatedUrls = currentUrls?.filter(url => url !== urlToRemove) || null;
    onUrlsChange(updatedUrls);
    showSuccess(t("image_removed"));
    
  }, [userId, currentUrls, onUrlsChange, t]);
  
  const handleGallerySelect = (newUrls: string[]) => {
    // Combina as URLs selecionadas da galeria com as URLs atuais (se houver)
    // Garantimos que não haja duplicatas
    const combinedUrls = Array.from(new Set([...(currentUrls || []), ...newUrls]));
    onUrlsChange(combinedUrls);
  };
  
  // Se o ID da empresa não estiver disponível, desabilitamos a galeria
  const isGalleryDisabled = disabled || !companyId;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">{t('product_photos')}</h3>
      
      {/* Visualização das Imagens Atuais */}
      {currentUrls && currentUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {currentUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
              <img src={url} alt={`${t('product_photo')} ${index + 1}`} className="w-full h-full object-cover" />
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

      {/* Seção de Upload e Galeria */}
      <Card className="p-4">
        <CardContent className="p-0 space-y-3">
          
          {/* Botão de Seleção da Galeria */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsGalleryOpen(true)}
            disabled={isGalleryDisabled}
          >
            <GalleryHorizontal className="mr-2 h-4 w-4" />
            {t('select_from_gallery')}
          </Button>
          
          <Separator />
          
          {/* Upload de Arquivos */}
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
                  {t('upload_images', { count: filesToUpload.length })}
                </>
              )}
            </Button>
          )}
          
          {filesToUpload.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {t('select_files_to_upload')}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Seleção de Imagens */}
      {companyId && (
        <ImageSelectorDialog
          isOpen={isGalleryOpen}
          onOpenChange={setIsGalleryOpen}
          companyId={companyId}
          currentUrls={currentUrls}
          onSelect={handleGallerySelect}
        />
      )}
    </div>
  );
};

export default MultiImageUpload;