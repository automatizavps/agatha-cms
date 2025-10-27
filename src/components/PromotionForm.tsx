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
import { Loader2, CalendarIcon, PlusCircle, Trash2, Building, Tag, Package, Clock, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useMemo, useEffect } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";
import { useProductsOnly, useServicesOnly, Product } from "@/integrations/supabase/products";
import { useCategories } from "@/integrations/supabase/categories";
import { Promotion, PromotionRule } from "@/integrations/supabase/promotions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RuleType = 'product' | 'service' | 'category';

const ruleSchema = z.object({
  tipo_regra: z.enum(['product', 'service', 'category'], {
    required_error: "Selecione o tipo de regra.",
  }),
  entidade_id: z.string().uuid({ message: "Selecione uma entidade válida." }),
});

// Definimos o esquema base
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
  rules: z.array(ruleSchema).min(1, { message: "A promoção deve ter pelo menos uma regra." }),
  
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
}).refine((data) => isBefore(data.data_inicio, data.data_fim), {
  message: "A data de início deve ser anterior à data de fim.",
  path: ['data_fim'],
});

type PromotionFormValues = z.infer<typeof baseFormSchema>;

interface PromotionFormProps {
  onSubmit: (values: { 
    nome: string; 
    data_inicio: Date; 
    data_fim: Date; 
    desconto_percentual: number; 
    rules: Omit<PromotionRule, 'id' | 'promocao_id' | 'created_at'>[];
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultPromotion?: Promotion & { rules: PromotionRule[] };
  isEditing?: boolean;
}

const PromotionForm: React.FC<PromotionFormProps> = ({ onSubmit, isSubmitting, defaultPromotion, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultPromotion?.nome || "",
      desconto_percentual: defaultPromotion?.desconto_percentual ? String(defaultPromotion.desconto_percentual) : "0",
      data_inicio: defaultPromotion?.data_inicio ? new Date(defaultPromotion.data_inicio) : new Date(),
      data_fim: defaultPromotion?.data_fim ? new Date(defaultPromotion.data_fim) : new Date(),
      rules: defaultPromotion?.regras || [],
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

  // Carrega dados para as regras
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { data: categories, isLoading: isLoadingCategories } = useCategories(selectedCompanyId || undefined);
  
  const isLoadingRulesData = isLoadingProducts || isLoadingServices || isLoadingCategories;

  // Filtra itens com base na empresa selecionada
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
  
  // Mapeia todos os itens para facilitar a busca
  const allEntities = useMemo(() => {
    const entities: Record<string, { name: string, type: RuleType }> = {};
    filteredProducts.forEach(p => entities[p.id] = { name: p.nome, type: 'product' });
    filteredServices.forEach(s => entities[s.id] = { name: s.nome, type: 'service' });
    filteredCategories.forEach(c => entities[c.id] = { name: c.nome, type: 'category' });
    return entities;
  }, [filteredProducts, filteredServices, filteredCategories]);


  const handleAddRule = () => {
    appendRule({ tipo_regra: 'product', entidade_id: "" });
  };

  const handleSubmit = (values: PromotionFormValues) => {
    const desconto_percentual = parseFloat(values.desconto_percentual);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      data_inicio: values.data_inicio,
      data_fim: values.data_fim,
      desconto_percentual: desconto_percentual,
      rules: values.rules,
      empresa_id: empresa_id,
    });
  };
  
  // Determina se o campo empresa deve ser editável (apenas Super Admin na CRIAÇÃO)
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyIdToDisplay = isEditing ? defaultPromotion?.empresa_id : form.watch('empresa_id');
  const companyName = companies?.find(c => c.id === companyIdToDisplay)?.nome;
  
  // Determina se o aviso deve ser exibido (Apenas Super Admin E empresa não selecionada)
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;
  
  if (isCheckingPermissions || isLoadingRulesData) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Campo Empresa (Apenas Super Admin ou Edição) */}
        {(isSuperAdmin || isEditing) && (
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
              <Percent className="h-5 w-5" /> {t('promotion_details', { defaultValue: 'Detalhes da Promoção' })}
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
                    <Input placeholder="Ex: Black Friday 20%" {...field} disabled={isSubmitting} />
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
                  <FormControl>
                    <Input 
                      placeholder="Ex: 20" 
                      {...field} 
                      disabled={isSubmitting}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
        
        {/* Regras da Promoção */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('promotion_rules', { defaultValue: 'Regras de Aplicação' })}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddRule} disabled={isSubmitting || !isCompanySelected}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('add_rule', { defaultValue: 'Adicionar Regra' })}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormDescription>
              {t('promotion_rules_description', { defaultValue: 'A promoção será aplicada a todos os itens que corresponderem a PELO MENOS uma das regras abaixo.' })}
            </FormDescription>
            
            {ruleFields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('rule', { defaultValue: 'Regra' })} #{index + 1}</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Tipo de Regra */}
                  <FormField
                    control={form.control}
                    name={`rules.${index}.tipo_regra`}
                    render={({ field: ruleTypeField }) => (
                      <FormItem>
                        <FormLabel>{t('rule_type', { defaultValue: 'Tipo' })}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            ruleTypeField.onChange(value);
                            // Limpa o ID da entidade ao mudar o tipo
                            form.setValue(`rules.${index}.entidade_id`, "");
                          }} 
                          value={ruleTypeField.value} 
                          disabled={isSubmitting || !isCompanySelected}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_type", { defaultValue: 'Selecione o tipo' })} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">{t('nav_products')}</SelectItem>
                            <SelectItem value="service">{t('nav_services')}</SelectItem>
                            <SelectItem value="category">{t('page_title_categories')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Entidade (Produto/Serviço/Categoria) */}
                  <FormField
                    control={form.control}
                    name={`rules.${index}.entidade_id`}
                    render={({ field: entityIdField }) => {
                      const currentType = form.watch(`rules.${index}.tipo_regra`);
                      let options: { id: string; nome: string }[] = [];
                      let placeholder = t('select_entity', { defaultValue: 'Selecione a entidade' });
                      let icon = <Tag className="h-4 w-4 text-muted-foreground" />;
                      
                      switch (currentType) {
                        case 'product':
                          options = filteredProducts.map(p => ({ id: p.id, nome: p.nome }));
                          placeholder = t('select_product', { defaultValue: 'Selecione o produto' });
                          icon = <Package className="h-4 w-4 text-muted-foreground" />;
                          break;
                        case 'service':
                          options = filteredServices.map(s => ({ id: s.id, nome: s.nome }));
                          placeholder = t('select_service', { defaultValue: 'Selecione o serviço' });
                          icon = <Clock className="h-4 w-4 text-muted-foreground" />;
                          break;
                        case 'category':
                          options = filteredCategories.map(c => ({ id: c.id, nome: c.nome }));
                          placeholder = t('select_category', { defaultValue: 'Selecione a categoria' });
                          icon = <Tag className="h-4 w-4 text-muted-foreground" />;
                          break;
                      }
                      
                      const selectedOption = options.find(o => o.id === entityIdField.value);

                      return (
                        <FormItem className="col-span-2">
                          <FormLabel>{t('entity', { defaultValue: 'Entidade' })}</FormLabel>
                          <Select 
                            onValueChange={entityIdField.onChange} 
                            value={entityIdField.value} 
                            disabled={isSubmitting || !isCompanySelected || options.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <div className="flex items-center gap-2">
                                  {icon}
                                  <SelectValue placeholder={options.length === 0 ? t('no_entities_found', { defaultValue: 'Nenhuma entidade encontrada' }) : placeholder}>
                                    {selectedOption ? selectedOption.nome : placeholder}
                                  </SelectValue>
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {options.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
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
                {t('add_rule_to_start', { defaultValue: 'Adicione uma regra para definir onde a promoção se aplica.' })}
              </p>
            )}
            
            <FormMessage>{form.formState.errors.rules?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || !isCompanySelected}>
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