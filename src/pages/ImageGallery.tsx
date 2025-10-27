import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Image as ImageIcon, Trash2, AlertTriangle, Building } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useStorageImages, StorageFile, useDeleteStorageFile } from "@/integrations/supabase/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCompanies } from "@/integrations/supabase/companies"; // Importando useCompanies

const BUCKETS = [
  { name: 'avatars', label: 'Avatares (Perfis de Usuário)' },
  { name: 'product_images', label: 'Imagens de Produtos/Serviços' },
];

const ImageGallery: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isSuperAdmin, 
    isLoadingFilter, 
    selectedCompanyId, 
    setSelectedCompanyId, 
    filteredCompanyId 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const [selectedBucket, setSelectedBucket] = useState(BUCKETS[1].name); // Padrão para product_images
  
  // O pathPrefix é o ID da empresa se estiver filtrado, ou undefined se for 'all'
  const pathPrefix = filteredCompanyId; 
  
  // Hook de dados - Passando o pathPrefix
  const { data: files, isLoading, isError, error, refetch, isRefetching } = useStorageImages(selectedBucket, pathPrefix);
  
  // Mutação de exclusão
  const deleteMutation = useDeleteStorageFile();

  const isChecking = isLoading || isLoadingFilter || isLoadingCompanies;

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full text-center border-destructive/50 bg-destructive/5">
            <CardHeader>
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <CardTitle className="text-2xl text-destructive">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">
                {t('error_loading_data')}: Esta página é restrita ao Super Admin.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const handleDelete = (file: StorageFile) => {
    if (window.confirm(`Tem certeza que deseja excluir o arquivo '${file.name}'? Esta ação é permanente.`)) {
      deleteMutation.mutate({ bucketName: selectedBucket, fullPath: file.fullPath });
    }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_image_gallery', { defaultValue: 'Galeria de Imagens' })}</h1>
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5" /> {t('image_gallery_title', { defaultValue: 'Gestão de Arquivos de Storage' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Filtros e Ações */}
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            
            {/* Filtro de Bucket */}
            <div className="w-full md:w-64">
              <Select 
                onValueChange={setSelectedBucket} 
                value={selectedBucket} 
                disabled={isChecking}
              >
                <SelectTrigger className="w-full">
                  <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('select_bucket', { defaultValue: 'Selecione o Bucket' })} />
                </SelectTrigger>
                <SelectContent>
                  {BUCKETS.map((bucket) => (
                    <SelectItem key={bucket.name} value={bucket.name}>
                      {bucket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            <div className="w-full md:w-64">
              <Select 
                onValueChange={setSelectedCompanyId} 
                value={selectedCompanyId} 
                disabled={isLoadingCompanies || isChecking}
              >
                <SelectTrigger className="w-full">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('filter_all_companies')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter_all_companies')}</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Botão de Recarregar */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="shrink-0"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isChecking && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                {t('error_loading_data')}
              </p>
            </div>
          ) : files && files.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <Card key={file.fullPath} className="overflow-hidden">
                  <div className="relative h-40 w-full bg-muted/50">
                    <img 
                      src={file.publicUrl} 
                      alt={file.name} 
                      className="h-full w-full object-cover" 
                      loading="lazy"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 p-1"
                      onClick={() => handleDelete(file)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-3 text-sm space-y-1">
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <p className="font-medium truncate">{file.name}</p>
                      </TooltipTrigger>
                      <TooltipContent>{file.name}</TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-muted-foreground truncate">
                      Caminho: {file.fullPath}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tamanho: {formatBytes(file.metadata.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado: {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_files_found', { defaultValue: 'Nenhum arquivo encontrado neste bucket.' })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ImageGallery;