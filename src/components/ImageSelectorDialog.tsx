import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Check, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStorageImages, StorageFile } from '@/integrations/supabase/storage';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImageSelectorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  currentUrls: string[] | null;
  onSelect: (newUrls: string[]) => void;
}

const ImageSelectorDialog: React.FC<ImageSelectorDialogProps> = ({
  isOpen,
  onOpenChange,
  companyId,
  currentUrls = [],
  onSelect,
}) => {
  const { t } = useTranslation();
  
  // O pathPrefix é o ID da empresa, pois as imagens são armazenadas em companyId/filename
  const pathPrefix = companyId; 
  
  // Busca imagens do bucket 'product_images' filtradas pelo pathPrefix (ID da empresa)
  const { data: files, isLoading, isError, refetch, isRefetching } = useStorageImages('product_images', pathPrefix);
  
  const [selectedFiles, setSelectedFiles] = useState<string[]>(currentUrls);
  const [searchTerm, setSearchTerm] = useState('');

  // Resetar o estado de seleção ao abrir/fechar
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFiles(currentUrls);
    }
  }, [isOpen, currentUrls]);

  const handleToggleSelect = (url: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  };
  
  const handleConfirm = () => {
    onSelect(selectedFiles);
    onOpenChange(false);
  };
  
  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (!searchTerm) return files;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    return files.filter(file => file.name.toLowerCase().includes(lowerCaseSearch));
  }, [files, searchTerm]);
  
  const totalImages = files?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> {t('image_gallery_title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('select_images_description', { defaultValue: 'Selecione imagens existentes para o produto/serviço.' })}
          </p>
        </DialogHeader>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-4 text-destructive flex flex-col items-center">
              <AlertTriangle className="h-6 w-6 mb-2" />
              {t('chart_error')}
            </div>
          ) : totalImages === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_files_found')}
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <p className="text-sm text-muted-foreground mb-3">
                {t('total_images_found', { count: totalImages, defaultValue: `${totalImages} imagens encontradas.` })}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFiles.includes(file.publicUrl);
                  return (
                    <div 
                      key={file.fullPath} 
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                        isSelected ? "border-primary ring-4 ring-primary/50" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleToggleSelect(file.publicUrl)}
                    >
                      <img 
                        src={file.publicUrl} 
                        alt={file.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Check className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || deleteMutation.isPending}>
            {t('select_images_button', { count: selectedFiles.length, defaultValue: `Selecionar (${selectedFiles.length})` })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageSelectorDialog;