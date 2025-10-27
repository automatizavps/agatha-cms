import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, Building, CalendarIcon, Percent, PlusCircle, Trash2, Check, ChevronsUpDown, Tag, Package, Users, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Promotion, RuleType } from "@/integrations/supabase/promotions";
import { useProductsOnly, useServicesOnly, Product } from "@/integrations/supabase/products";
import { useCategories } from "@/integrations/supabase/categories";
import { useClients } from "@/integrations/supabase/clients";
import React, { useMemo, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

// Esquema para uma única regra
const ruleSchema = z.object({
  tipo_regra: z.enum(['produto', 'servico', 'categoria', 'cliente']),
  entidade_id: z.string().uuid({ message: "ID de entidade inválido." }),
});

// Definimos o esquema base (sem o campo empresa_id, que será adicionado condicionalmente)
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  desconto_percentual: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
    message: "O desconto deve ser entre 0.01% e 100%.",
  }),
  data_inicio: z.date({
    required_error: "A data de início é obrigatória.",
  }),
  data_fim: z.date({
    required_error: "A data de fim é obrigatória.",
  }),
  rules: z.array(ruleSchema).optional(),
}).refine(data => data.data_fim > data.data_inicio, {
  message: "A data de fim deve ser posterior à data de início.",
  path: ['data_fim'],
});

type PromotionFormValues = z.infer<typeof baseFormSchema & { empresa_id?: string }>; // Inclui empresa_id opcionalmente

interface RuleToCreate {
  tipo_regra: RuleType;
  entidade_id: string;
}

interface PromotionFormProps {
  onSubmit: (values: { 
    nome: string; 
    data_inicio: Date; 
    data_fim: Date; 
    desconto_percentual: number; 
    rules: RuleToCreate[];
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultPromotion?: Promotion & { rules: RuleToCreate[] };
  isEditing?: boolean;
}

const PromotionForm: React.FC<PromotionFormProps> = ({ onSubmit, isSubmitting, defaultPromotion, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { data: clients } = useClients(); // isLoadingClients não é usado diretamente aqui
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Define o esquema Zod dinamicamente dentro do componente
  const formSchema = useMemo(() => {
    if (isSuperAdmin && !isEditing) {
      return baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
    }
    // Se não for Super Admin ou estiver editando, empresa_id é opcional
    return baseFormSchema.extend({
      empresa_id: z.string().uuid({
        message: t("select_valid_company"),
      }).or(z.literal("")).optional(),
    });
  }, [isSuperAdmin, isEditing, t]);


  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultPromotion?.nome || "",
      desconto_percentual: defaultPromotion?.desconto_percentual ? String(defaultPromotion.desconto_percentual) : "0.00",
      data_inicio: defaultPromotion?.data_inicio ? new Date(defaultPromotion.data_inicio) : new Date(),
      data_fim: defaultPromotion?.data_fim ? new Date(defaultPromotion.data_fim) : new Date(),
      rules: defaultPromotion?.rules || [],
      empresa_id: defaultPromotion?.empresa_id || "",
    },
  });
  
  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({
    control: form.control,
    name: "rules",
  });
  
  // Observa o ID da empresa selecionada
  const selectedCompanyId = isEditing 
    ? defaultPromotion?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;
  
  // Filtra dados baseados na empresa selecionada
  const filteredProducts = useMemo(() => {
    if (!products || !isCompanySelected) return [];
    return products.filter(p => p.empresa_id === selectedCompanyId);
  }, [products, selectedCompanyId, isCompanySelected]);
  
  const filteredServices = useMemo(() => {
    if (!services || !isCompanySelected) return [];
    return services.filter(s => s.empresa_id === selectedCompanyId);
  }, [services, selectedCompanyId, isCompanySelected]);
  
  const filteredCategories = useMemo(() => {
    if (!categories || !isCompanySelected) return [];
    return categories.filter(c => c.empresa_id === selectedCompanyId);
  }, [categories, selectedCompanyId, isCompanySelected]);
  
  const filteredClients = useMemo(() => {
    if (!clients || !isCompanySelected) return [];
    return clients.filter(c => c.empresa_id === selectedCompanyId);
  }, [clients, selectedCompanyId, isCompanySelected]);
  
  const isLoadingData = isLoadingProducts || isLoadingServices || isLoadingCategories || isLoadingClients;

  const handleSubmit = (values: PromotionFormValues) => {
    const desconto_percentual = parseFloat(values.desconto_percentual);
    
    // Ajusta a data de fim para o final do dia
    const data_fim = new Date(values.data_fim);
    data_fim.setHours(23, 59, 59, 999);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      data_inicio: values.data_inicio,
      data_fim: data_fim,
      desconto_percentual: desconto_percentual,
      rules: values.rules || [],
      empresa_id: empresa_id,
    });
  };
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyName = companies?.find(c => c.id === defaultPromotion?.empresa_id)?.nome;
  
  // Determina se o campo empresa deve ser exibido (Super Admin ou se estiver editando)
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  // Determina se o campo empresa deve ser editável (apenas Super Admin na CRIAÇÃO)
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Determina se o aviso deve ser exibido (Apenas Super Admin E empresa não selecionada)
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;
  
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Componente auxiliar para renderizar o seletor de entidade
  const EntitySelector: React.FC<{ index: number, ruleType: RuleType }> = ({ index, ruleType }) => {
    const field = form.control._fields.rules?.['name'] as any;
    const currentValue = form.watch(`rules.${index}.entidade_id`);
    
    let data: Product[] | { id: string; nome: string }[] | undefined;
    let placeholderKey: string;
    let icon: React.ReactNode;
    
    switch (ruleType) {
      case 'produto':
        data = filteredProducts;
        placeholderKey = 'select_product';
        icon = <Package className="mr-2 h-4 w-4" />;
        break;
      case 'servico':
        data = filteredServices;
        placeholderKey = 'select_service';
        icon = <Clock className="mr-2 h-4 w-4" />;
        break;
      case 'categoria':
        data = filteredCategories;
        placeholderKey = 'select_category';
        icon = <Tag className="mr-2 h-4 w-4" />;
        break;
      case 'cliente':
        data = filteredClients;
        placeholderKey = 'select_client';
        icon = <Users className="mr-2 h-4 w-4" />;
        break;
      default:
        return <Input value={t('unknown_rule_type')} disabled />;
    }
    
    const selectedItem = data?.find(item => item.id === currentValue);
    
    return (
      <FormField
        control={form.control}
        name={`rules.${index}.entidade_id`}
        render={({ field: entityField }) => (
          <FormItem className="flex flex-col">
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !entityField.value && "text-muted-foreground"
                    )}
                    disabled={isSubmitting || isLoadingData || !isCompanySelected}
                  >
                    {selectedItem?.nome || t(placeholderKey)}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('search_placeholder')} />
                  <CommandEmpty>{t('no_data_found')}</CommandEmpty>
                  <CommandGroup>
                    {data?.map((item) => (
                      <CommandItem
                        value={item.nome}
                        key={item.id}
                        onSelect={() => {
                          form.setValue(`rules.${index}.entidade_id`, item.id, { shouldValidate: true });
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            item.id === entityField.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {item.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Campo Empresa */}
        {shouldShowCompanyField && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                {isCompanyFieldEditable ? (
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Limpa as regras ao mudar a empresa
                      form.setValue('rules', []);
                    }} 
                    value={field.value} 
                    disabled={isLoadingCompanies || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCompanies ? t("loading_companies") : t("select_company")} />
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
                ) : (
                  <FormControl>
                    <Input 
                      value={companyName || t("company_not_found")} 
                      disabled 
                      className="bg-muted/50"
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Aviso se a empresa não estiver selecionada (Apenas Super Admin na CRIAÇÃO) */}
        {shouldShowWarning && (
          <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-400/50 rounded-md text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('select_company_to_load_data')}
          </div>
        )}

        {/* Detalhes da Promoção */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" /> {t('promotion_details', { defaultValue: 'Detalhes da Promoção' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('promotion_name', { defaultValue: 'Nome da Promoção' })}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Black Friday 2024" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="desconto_percentual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('discount_percentage', { defaultValue: 'Desconto (%)' })}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        placeholder="Ex: 15.00" 
                        {...field} 
                        disabled={isSubmitting}
                        type="number"
                        step="0.01"
                        className="pr-10"
                      />
                    </FormControl>
                    <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Datas de Vigência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              "w-full justify-start text-left font-normal",
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
                          selected={field.value}
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
              
              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('end_date', { defaultValue: 'Data de Fim' })}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
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
                          selected={field.value}
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
            </div>
          </CardContent>
        </Card>
        
        {/* Regras de Segmentação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('promotion_rules', { defaultValue: 'Regras de Segmentação' })}</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => appendRule({ tipo_regra: 'produto', entidade_id: '' })} 
              disabled={isSubmitting || !isCompanySelected}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> {t('add_rule', { defaultValue: 'Adicionar Regra' })}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormDescription>
              {t('promotion_rules_description', { defaultValue: 'Defina os produtos, serviços, categorias ou clientes que esta promoção irá afetar.' })}
            </FormDescription>
            
            {ruleFields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('rule', { defaultValue: 'Regra' })} #{index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tipo de Regra */}
                  <FormField
                    control={form.control}
                    name={`rules.${index}.tipo_regra`}
                    render={({ field: typeField }) => (
                      <FormItem>
                        <FormLabel>{t('rule_type', { defaultValue: 'Tipo' })}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            typeField.onChange(value as RuleType);
                            // Limpa o ID da entidade ao mudar o tipo
                            form.setValue(`rules.${index}.entidade_id`, '');
                          }} 
                          value={typeField.value} 
                          disabled={isSubmitting || !isCompanySelected}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_rule_type", { defaultValue: 'Selecione o tipo' })} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="produto">{t('nav_products')}</SelectItem>
                            <SelectItem value="servico">{t('nav_services')}</SelectItem>
                            <SelectItem value="categoria">{t('product_table_header_category')}</SelectItem>
                            <SelectItem value="cliente">{t('nav_clients')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Entidade (Produto/Serviço/Categoria/Cliente) */}
                  <div className="md:col-span-2">
                    <FormLabel>{t('entity', { defaultValue: 'Entidade' })}</FormLabel>
                    <EntitySelector index={index} ruleType={form.watch(`rules.${index}.tipo_regra`)} />
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-3 right-3 h-6 w-6"
                  onClick={() => removeRule(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {ruleFields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {t('add_rules_to_segment', { defaultValue: 'Adicione regras para segmentar a promoção.' })}
              </p>
            )}
            
            <FormMessage>{form.formState.errors.rules?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !isCompanySelected}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('create_promotion', { defaultValue: 'Criar Promoção' })
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PromotionForm;