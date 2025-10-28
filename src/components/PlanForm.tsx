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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, DollarSign, Users, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccessType, useModules } from "@/integrations/supabase/customProfiles";
import { Plan } from "@/integrations/supabase/plans";
import PlanModuleSelector from "./PlanModuleSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

// Definimos o esquema
const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  limite_usuarios: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 1, {
    message: "O limite deve ser um número inteiro positivo.",
  }),
  preco: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O preço deve ser um número positivo.",
  }),
  // Permissões são tratadas fora do esquema principal do RHF, mas precisamos de um campo para o estado
  permissions: z.record(z.string().uuid(), z.enum(['leitura', 'escrita', 'sem_acesso'])).optional(),
});

type PlanFormValues = z.infer<typeof formSchema>;

interface PermissionState {
  [moduleId: string]: AccessType;
}

interface PlanFormProps {
  onSubmit: (values: { 
    nome: string; 
    limite_usuarios: number; 
    preco: number;
    rules: { modulo_id: string; acesso: AccessType }[];
  }) => void;
  isSubmitting: boolean;
  defaultPlan?: Plan & { regras: { modulo_id: string; acesso: AccessType }[] };
  isEditing?: boolean;
}

const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, isSubmitting, defaultPlan, isEditing = false }) => {
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
  
  // Se estiver editando, preenche com as regras existentes
  if (isEditing && defaultPlan?.regras) {
    defaultPlan.regras.forEach(r => {
      initialPermissions[r.modulo_id] = r.acesso;
    });
  }

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultPlan?.nome || "",
      limite_usuarios: defaultPlan?.limite_usuarios ? String(defaultPlan.limite_usuarios) : "5",
      preco: defaultPlan?.preco ? String(defaultPlan.preco) : "0.00",
      permissions: initialPermissions,
    },
  });
  
  const permissionsState = form.watch('permissions') || initialPermissions;

  const handlePermissionChange = (moduleId: string, access: AccessType) => {
    form.setValue(`permissions.${moduleId}`, access, { shouldDirty: true });
  };

  const handleSubmit = (values: PlanFormValues) => {
    if (!values.permissions) return;
    
    const limite_usuarios = parseInt(values.limite_usuarios);
    const preco = parseFloat(values.preco);
    
    // Mapeia o objeto de permissões de volta para o formato de array
    const rules = Object.entries(values.permissions).map(([moduleId, acesso]) => ({
      modulo_id: moduleId,
      acesso: acesso,
    }));

    onSubmit({
      nome: values.nome,
      limite_usuarios: limite_usuarios,
      preco: preco,
      rules: rules,
    });
  };
  
  if (isLoadingModules) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Detalhes do Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> {t('plan_details', { defaultValue: 'Detalhes do Plano' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('plan_name', { defaultValue: 'Nome do Plano' })}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('plan_name_placeholder', { defaultValue: 'Ex: Premium, Básico' })} {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limite_usuarios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('user_limit', { defaultValue: 'Limite de Usuários' })}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="5" 
                        {...field} 
                        disabled={isSubmitting}
                        type="number"
                        step="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('plan_price', { defaultValue: 'Preço (R$)' })}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="99.90" 
                        {...field} 
                        disabled={isSubmitting}
                        type="number"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Permissões por Módulo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> {t('module_permissions')}
            </CardTitle>
            <FormDescription>
              {t('plan_module_permissions_description', { defaultValue: 'Defina o nível de acesso que as empresas neste plano terão para cada módulo.' })}
            </FormDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Separator />

            {modules?.map((module) => (
              <div key={module.id} className="grid grid-cols-3 items-center gap-4">
                <div className="col-span-2">
                  <FormLabel className="font-normal">{t(module.nome)}</FormLabel>
                  <p className="text-xs text-muted-foreground">{module.descricao}</p>
                </div>
                <PlanModuleSelector
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
            t('create_plan', { defaultValue: 'Criar Plano' })
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PlanForm;