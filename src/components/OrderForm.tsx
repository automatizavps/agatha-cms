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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, Trash2, DollarSign, Building, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/integrations/supabase/clients";
import { useProductsOnly, useServicesOnly, Product } from "@/integrations/supabase/products";
import { OrderStatus } from "@/integrations/supabase/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React, { useMemo, useEffect, useState } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";
import PromotionSelector from "./PromotionSelector";
import { Promotion, usePromotionRules } from "@/integrations/supabase/promotions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const statusOptions: OrderStatus[] = ['pendente_entrega', 'entregue', 'cancelado'];

const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }),
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." }),
  preco_unitario: z.coerce.number().min(0.01, { message: "Preço deve ser positivo." }),
  item_type: z.enum(['produto', 'servico']),
});

const baseFormSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }),
  items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." }),
  status: z.enum(statusOptions, {
    required_error: "O status é obrigatório.",
  }).optional(),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
  promocao_id: z.string().uuid().nullable().optional(),
});

type OrderFormValues = z.infer<typeof baseFormSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface OrderFormProps {
  onSubmit: (values: { cliente_id: string; valor_total: number; items: ItemToCreate[]; status?: OrderStatus; empresa_id?: string; promocao_id?: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<OrderFormValues>; 
  isEditing?: boolean;
}

const NONE_VALUE = "__NONE__";

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items?.map(item => ({
        ...item,
        item_type: 'produto', 
      })) || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || "",
      promocao_id: defaultValues?.promocao_id || null,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const selectedCompanyId = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;
  
  const filteredClients = useMemo(() => {
    if (!clients || !isCompanySelected) return [];
    return clients.filter(client => client.empresa_id === selectedCompanyId);
  }, [clients, selectedCompanyId, isCompanySelected]);

  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  const isLoadingItems = isLoadingServices || isLoadingProducts;

  useEffect(() => {
    if (isEditing && defaultValues?.items && defaultValues.items.length > 0 && fields.length === 0) {
      const itemsWithTypes = defaultValues.items.map(item => {
        const productDetail = allItems.find(p => p.id === item.produto_id);
        return {
          ...item,
          item_type: productDetail?.tipo || 'produto',
        };
      });
      
      form.reset({
        ...form.getValues(),
        items: itemsWithTypes,
      });
    }
  }, [defaultValues?.items, fields.length, form, isEditing, allItems]);

  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const { data: promotionRules, isLoading: isLoadingPromotionRules } = usePromotionRules(activePromotion?.id || '');

  useEffect(() => {
    if (isEditing && defaultValues?.promocao_id && !activePromotion) {
      const fetchInitialPromotion = async () => {
        const { data: promoData } = await supabase
          .from('promocoes')
          .select('*')
          .eq('id', defaultValues.promocao_id)
          .single();
        if (promoData) {
          setActivePromotion(promoData as Promotion);
        }
      };
      fetchInitialPromotion();
    } else if (!isEditing) {
      setActivePromotion(null);
    }
  }, [isEditing, defaultValues?.promocao_id]);


  const isPromotionValid = useMemo(() => {
    if (!activePromotion || !promotionRules || promotionRules.length === 0) return true;
    if (isLoadingPromotionRules) return true;

    const currentItems = form.getValues("items");
    if (currentItems.length === 0) return false;

    return currentItems.some(orderItem => {
      const productDetails = allItems.find(p => p.id === orderItem.produto_id);
      if (!productDetails) return false;

      return promotionRules.some(rule => {
        if (rule.tipo_regra === 'produto' && rule.entidade_id === productDetails.id) return true;
        if (rule.tipo_regra === 'servico' && rule.entidade_id === productDetails.id) return true;
        
        if (rule.tipo_regra === 'categoria' && productDetails.categoria && rule.entidade_id === productDetails.categoria) return true;
        
        return false;
      });
    });
  }, [activePromotion, promotionRules, form.watch("items"), allItems, isLoadingPromotionRules]);

  const calculateTotal = useMemo(() => {
    let total = form.getValues("items").reduce((sum, item) => {
      return sum + (item.quantidade * item.preco_unitario);
    }, 0);

    if (isPromotionValid && activePromotion && activePromotion.desconto_percentual > 0) {
      total = total * (1 - activePromotion.desconto_percentual / 100);
    }
    return total;
  }, [form.watch("items"), activePromotion, isPromotionValid]);
  
  const handleAddItem = () => {
    append({ produto_id: "", quantidade: 1, preco_unitario: 0, item_type: 'produto' });
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const selectedItem = allItems.find(item => item.id === productId);
    if (selectedItem) {
      form.setValue(`items.${index}.preco_unitario`, selectedItem.preco);
      form.setValue(`items.${index}.produto_id`, productId);
    }
  };
  
  const handleItemTypeChange = (index: number, type: 'produto' | 'servico') => {
    form.setValue(`items.${index}.item_type`, type);
    form.setValue(`items.${index}.produto_id`, "");
    form.setValue(`items.${index}.preco_unitario`, 0);
  };
  
  const getItemName = (productId: string) => {
    const item = allItems.find(i => i.id === productId);
    return item ? `${item.nome} (${item.tipo === 'produto' ? t('nav_products') : t('nav_services')})` : t('unknown_item');
  };

  const handleSubmit = (values: OrderFormValues) => {
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    onSubmit({
      cliente_id: values.cliente_id,
      valor_total: calculateTotal,
      items: values.items.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      })),
      status: values.status,
      empresa_id: empresa_id,
      promocao_id: isPromotionValid ? activePromotion?.id || null : null,
    });
  };
  
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  const companyIdToDisplay = isEditing ? defaultValues?.empresa_id : form.watch('empresa_id');
  const companyName = companies?.find(c => c.id === companyIdToDisplay)?.nome;
  
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
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
                      form.setValue('cliente_id', '');
                      form.setValue('items', []);
                      form.setValue('promocao_id', null);
                      setActivePromotion(null);
                    }} 
                    value={field.value} 
                    disabled={isLoadingCompanies || isSubmitting || isEditing}
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
        
        {shouldShowWarning && (
          <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-400/50 rounded-md text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('select_company_to_load_data')}
          </div>
        )}

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order_table_header_client')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClients || isSubmitting || isEditing || !isCompanySelected}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingClients ? t("loading_clients") : t("select_client")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome} ({client.email || client.telefone || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order_table_header_status')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_status")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('order_list_title')}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSubmitting || isEditing || !isCompanySelected}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('add_item')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              // Observa o tipo de item para filtrar a lista de produtos/serviços
              const currentItemType = form.watch(`items.${index}.item_type`);
              
              const filteredItemsByType = allItems.filter(item => item.tipo === currentItemType);
              
              return (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('item')} #{index + 1}</h4>
                
                {/* NOVO: Seletor de Tipo de Item */}
                <FormField
                  control={form.control}
                  name={`items.${index}.item_type`}
                  render={({ field: typeField }) => (
                    <FormItem>
                      <FormLabel>{t('item_type', { defaultValue: 'Tipo de Item' })}</FormLabel>
                      <Select 
                        onValueChange={(val) => handleItemTypeChange(index, val as 'produto' | 'servico')} 
                        value={typeField.value} 
                        disabled={isSubmitting || isEditing || !isCompanySelected}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_item_type", { defaultValue: 'Selecione o tipo' })} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="produto">{t('nav_products')}</SelectItem>
                          <SelectItem value="servico">{t('nav_services')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Seletor de Item Específico */}
                <FormField
                  control={form.control}
                  name={`items.${index}.produto_id`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>{t('service_product')}</FormLabel>
                      {isEditing ? (
                        <FormControl>
                          <Input 
                            value={getItemName(itemField.value)} 
                            disabled 
                            className="bg-muted/50"
                          />
                        </FormControl>
                      ) : (
                        <Select 
                          onValueChange={(val) => handleProductChange(index, val)} 
                          value={itemField.value} 
                          disabled={isLoadingItems || isSubmitting || isEditing || !isCompanySelected || !currentItemType}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={filteredItemsByType.length === 0 ? t("no_items_of_type", { type: t(currentItemType) }) : t("select_item")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredItemsByType.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantidade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('quantity')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting || isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.preco_unitario`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('unit_price')} (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting || isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {!isEditing && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-3 right-3 h-6 w-6"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}}
            
            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {t('add_services_or_products')}
              </p>
            )}
            
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="promocao_id"
          render={({ field }) => (
            <FormItem>
              <PromotionSelector
                companyId={selectedCompanyId}
                selectedPromotionId={field.value || null}
                onPromotionChange={(promo) => {
                  field.onChange(promo?.id || null);
                  setActivePromotion(promo);
                }}
                disabled={isSubmitting || !isCompanySelected}
                label={t('promotion', { defaultValue: 'Promoção' })}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!isPromotionValid && activePromotion && (
          <Alert variant="destructive">
            <Tag className="h-4 w-4" />
            <AlertTitle>{t('promotion_not_applicable_title', { defaultValue: 'Promoção Não Aplicável' })}</AlertTitle>
            <AlertDescription>
              {t('promotion_not_applicable_description', { promoName: activePromotion.nome })}
            </AlertDescription>
          </Alert>
        )}
        
        <Separator />
        
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">{t('order_table_header_total')}:</span>
          <span className="text-2xl font-bold text-primary flex items-center gap-1">
            {/* REMOVIDO O ÍCONE DollarSign */}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal)}
            {isPromotionValid && activePromotion && activePromotion.desconto_percentual > 0 && (
              <span className="text-base text-green-500 ml-2">
                (-{activePromotion.desconto_percentual}%)
              </span>
            )}
          </span>
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting || (isSuperAdmin && !isCompanySelected && !isEditing)}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('update_order_button')
          ) : (
            t('create_order')
          )}
        </Button>
        
        {isEditing && (
          <p className="text-sm text-muted-foreground text-center">
            {t('item_editing_not_allowed')}
          </p>
        )}
      </form>
    </Form>
  );
};

export default OrderForm;