import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Building, Tag } from "lucide-react";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { AccessType, CustomProfile, useModules } from "@/integrations/supabase/customProfiles";
import PermissionSelector from "./PermissionSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).min(1, { message: "A empresa é obrigatória." }),
  // Permissões são tratadas fora do esquema principal do RHF, mas precisamos de um campo para o estado
  permissions: z.record(z.string().uuid(), z.enum(['leitura', 'escrita', 'sem_acesso'])).optional(),
});

type CustomProfileFormValues = z.infer<typeof baseFormSchema>;

interface PermissionState {
  [moduleId: string]: AccessType;
}

interface CustomProfileFormProps {
  onSubmit: (values: { 
    empresa_id: string; 
    nome: string; 
    permissions: { modulo_id: string; acesso: AccessType }[];
  }) => void;
  isSubmitting: boolean;
  defaultProfile?: CustomProfile & { permissions: { modulo_id: string; acesso: AccessType }[] };
  isEditing?: boolean;
}

const CustomProfileForm: React.FC<CustomProfileFormProps> = ({ onSubmit, isSubmitting, defaultProfile, isEditing = false }) => {
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: modules, isLoading: isLoadingModules } = useModules();
  const { t } = useTranslation();
  
  // Inicializa o estado de permissões
  const initialPermissions: PermissionState = {};
  if (modules) {
    modules.forEach(mod => {
      const defaultAccess: AccessType = 'sem_acesso';
      initialPermissions[mod.id] = defaultAccess;
    });
  }
  
  // Se estiver editando, preenche com as permissões existentes
  if (isEditing && defaultProfile?.permissions) {
    defaultProfile.permissions.forEach(p => {
      initialPermissions[p.modulo_id] = p.acesso;
    });
  }

  const form = useForm<CustomProfileFormValues>({
    resolver: zodResolver(baseFormSchema),
    defaultValues: {
      nome: defaultProfile?.nome || "",
      empresa_id: defaultProfile?.empresa_id || "",
      permissions: initialPermissions,
    },
  });
  
  // Observa o estado das permissões
  const permissionsState = form.watch('permissions') || initialPermissions;
  
  // Efeito para inicializar as permissões quando os módulos carregam
  useEffect(() => {
    if (modules && !isEditing) {
      const newPermissions: PermissionState = {};
      modules.forEach(mod => {
        newPermissions[mod.id] = 'sem_acesso';
      });
      form.setValue('permissions', newPermissions);
    } else if (modules && isEditing && defaultProfile?.permissions) {
       const newPermissions: PermissionState = {};
       modules.forEach(mod => {
         const existing = defaultProfile.permissions.find(p => p.modulo_id === mod.id);
         newPermissions[mod.id] = existing ? existing.acesso : 'sem_acesso';
       });
       form.setValue('permissions', newPermissions);
    }
  }, [modules, isEditing, defaultProfile?.permissions, form]);


  const handlePermissionChange = (moduleId: string, access: AccessType) => {
    form.setValue(`permissions.${moduleId}`, access, { shouldDirty: true });
  };

  const handleSubmit = (values: CustomProfileFormValues) => {
    if (!values.permissions) return;
    
    // Mapeia o objeto de permissões de volta para o formato de array
    const permissionsArray = Object.entries(values.permissions).map(([moduleId, acesso]) => ({
      modulo_id: moduleId,
      acesso: acesso,
    }));

    onSubmit({
      nome: values.nome,
      empresa_id: values.empresa_id,
      permissions: permissionsArray,
    });
  };
  
  const isChecking = isLoadingCompanies || isLoadingModules;

  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Detalhes do Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" /> {t('profile_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="empresa_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('user_table_header_company')}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={isLoadingCompanies || isSubmitting || isEditing} // Empresa é fixa na edição
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_company")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile_name_placeholder')} {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Permissões por Módulo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" /> {t('module_permissions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules?.map((module) => (
              <div key={module.id} className="grid grid-cols-3 items-center gap-4">
                <div className="col-span-2">
                  <FormLabel className="font-normal">{t(module.nome)}</FormLabel>
                  <p className="text-xs text-muted-foreground">{module.descricao}</p>
                </div>
                <PermissionSelector
                  module={module}
                  currentAccess={permissionsState[module.id] || 'sem_acesso'}
                  onChange={(access) => handlePermissionChange(module.id, access)}
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('create_profile')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CustomProfileForm;