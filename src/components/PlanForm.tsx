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
import { Loader2, DollarSign, Users, ShieldCheck, CalendarIcon, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccessType, useModules } from "@/integrations/supabase/customProfiles";
import { Plan } from "@/integrations/supabase/plans";
import PlanModuleSelector from "./PlanModuleSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Opções de período de vigência
const DURATION_OPTIONS = [
  { value: 'custom', label: 'Personalizado (Datas)' },
  { value: '1m', label: '1 Mês' },
  { value: '3m', label: '3 Meses' },
  { value: '6m', label: '6 Meses' },
  { value: '1y', label: '1 Ano' },
  { value: '2y', label: '2 Anos' },
];

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
  
  // Vigência
  duration_type: z.enum(['custom', '1m', '3m', '6m', '1y', '2y']),
  data_inicio: z.date({
    required_error: "A data de início é obrigatória.",
  }).nullable(),
  data_fim: z.date().nullable(), // Pode ser nulo se for calculado
  
  // Permissões
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
    data_inicio: Date | null;
    data_fim: Date | null;
    rules: { modulo_id: string; acesso: AccessType }[];
  }) => void;
  isSubmitting: boolean;
  defaultPlan?: Plan & { regras: { modulo_id: string; acesso: AccessType }[] };
  isEditing?: boolean;
}

const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, isSubmitting, defaultPlan, isEditing = false }) => {
  const { data: modules, isLoading: isLoadingModules } = useModules();
  const { t } = useTranslation();
  
  // Determina o tipo de duração inicial
  const initialDurationType = useMemo(() => {
    if (isEditing && defaultPlan?.data_inicio && defaultPlan?.data_fim) {
      // Se houver datas, assume personalizado na edição
      return 'custom';
    }
    return 'custom'; // Padrão para personalizado
  }, [isEditing, defaultPlan]);
  
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
      
      // Vigência
      duration_type: initialDurationType,
      data_inicio: defaultPlan?.data_inicio ? new Date(defaultPlan.data_inicio) : new Date(),
      data_fim: defaultPlan?.data_fim ? new Date(defaultPlan.data_fim) : null,
      
      permissions: initialPermissions,
    },
  });
  
  const permissionsState = form.watch('permissions') || initialPermissions;
  const durationType = form.watch('duration_type');
  const dataInicio = form.watch('data_inicio');

  // Efeito para calcular data_fim automaticamente
  useEffect(() => {
    if (durationType !== 'custom' && dataInicio) {
      let newDateFim: Date;
      
      // Garante que a data de início seja o início do dia para cálculos precisos
      const startOfDay = new Date(dataInicio.setHours(0, 0, 0, 0));
      
      switch (durationType) {
        case '1m':
          newDateFim = addMonths(startOfDay, 1);
          break;
        case '3m':
          newDateFim = addMonths(startOfDay, 3);
          break;
        case '6m':
          newDateFim = addMonths(startOfDay, 6);
          break;
        case '1y':
          newDateFim = addYears(startOfDay, 1);
          break;
        case '2y':
          newDateFim = addYears(startOfDay, 2);
          break;
        default:
          return;
      }
      
      // Subtrai 1 milissegundo para garantir que a data final seja o último momento do dia anterior
      // Ex: 1 mês a partir de 01/01/2024 00:00:00 é 01/02/2024 00:00:00. 
      // Queremos que a vigência termine em 31/01/2024 23:59:59.
      newDateFim = new Date(newDateFim.getTime() - 1);
      
      form.setValue('data_fim', newDateFim, { shouldValidate: true });
    } else if (durationType === 'custom' && !isEditing) {
      // Se voltar para custom, limpa a data final (se não estiver editando)
      form.setValue('data_fim', null, { shouldValidate: true });
    }
  }, [durationType, dataInicio, form, isEditing]);


  const handlePermissionChange = (moduleId: string, access: AccessType) => {
    form.setValue(`permissions.${moduleId}`, access, { shouldDirty: true });
  };

  const handleSubmit = (values: PlanFormValues) => {
    if (!values.permissions) return;
    
    const limite_usuarios = parseInt(values.limite_usuarios);
    const preco = parseFloat(values.preco);
    
    // Se for personalizado, data_fim deve ser validado pelo Zod (não pode ser nulo)
    let finalDataFim = values.data_fim;
    
    if (values.duration_type === 'custom' && !finalDataFim) {
        form.setError('data_fim', { message: "A data final é obrigatória para vigência personalizada." });
        return;
    }
    
    // Mapeia o objeto de permissões de volta para o formato de array
    const rules = Object.entries(values.permissions).map(([moduleId, acesso]) => ({
      modulo_id: moduleId,
      acesso: acesso,
    }));

    onSubmit({
      nome: values.nome,
      limite_usuarios: limite_usuarios,
      preco: preco,
      data_inicio: values.data_inicio,
      data_fim: finalDataFim,
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
        
        {/* Vigência do Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> {t('plan_duration', { defaultValue: 'Vigência do Plano' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Tipo de Duração */}
            <FormField
              control={form.control}
              name="duration_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('duration_type', { defaultValue: 'Tipo de Duração' })}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_duration_type", { defaultValue: "Selecione o tipo de vigência" })} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              {/* Data de Início */}
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('start_date', { defaultValue: 'Data de Início' })}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>{t('select_date')}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data Final (Condicional) */}
              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('end_date', { defaultValue: 'Data Final' })}</FormLabel>
                    {durationType === 'custom' ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isSubmitting}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>{t('select_date')}</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <FormControl>
                        <Input 
                          value={field.value ? format(field.value, "PPP", { locale: ptBR }) : t('calculated_automatically', { defaultValue: 'Calculado automaticamente' })}
                          disabled
                          className="bg-muted/50 h-10"
                        />
                      </FormControl>
                    )}
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