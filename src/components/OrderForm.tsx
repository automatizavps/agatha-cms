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
import { Loader2, PlusCircle, Trash2, DollarSign, Building, Tag, Check, ChevronsUpDown, User, Package } from "lucide-react";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUsers } from "@/integrations/supabase/users"; // Importando useUsers

const statusOptions: OrderStatus[] = ['pendente_entrega', 'entregue', 'cancelado'];

// Definindo um mapa para armazenar o estoque de cada produto
const productStockMap = new Map<string, number | null>();

// Esquema de validação para itens
const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }),
  // Garantimos que a coerção para número lide com strings vazias ou NaN, resultando em 0
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." })
    .refine((val, ctx) => {
      // CORREÇÃO: Acessa o objeto pai de forma segura. Se não houver parent ou data, retorna true.
      const item = (ctx.parent as any)?.data;
      
      // Se não houver dados do item (ocorre durante a montagem inicial), pulamos a validação de estoque.
      if (!item) {
        return true;
      }
      
      const productId = item.produto_id;
      
      // Se não houver produto_id ou se a validação estiver em um estado inicial incompleto, pulamos
      if (typeof productId !== 'string' || productId.length === 0) {
        return true;
      }
      
      const stock = productStockMap.get(productId);
      
      // Se for serviço (stock === null) ou se o estoque for suficiente, é válido
      if (stock === null || stock === undefined) {
        return true;
      }
      
      if (val > stock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Estoque insuficiente. Máximo disponível: ${stock}.`,
        });
        return false;
      }
      return true;
    }, { path: ['quantidade'] }),
  preco_unitario: z.coerce.number().min(0.01, { message: "Preço deve ser positivo." }),
});

const baseFormSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }).min(1, { message: "O cliente é obrigatório." }),
  responsavel_id: z.string().uuid({ // NOVO CAMPO
    message: "Selecione um responsável válido.",
  }).min(1, { message: "O responsável é obrigatório." }),
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
  onSubmit: (values: { cliente_id: string; responsavel_id: string; valor_total: number; items: ItemToCreate[]; status?: OrderStatus; empresa_id?: string; promocao_id?: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<OrderFormValues>; 
  isEditing?: boolean;
}

const NONE_VALUE = "__NONE__";

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: users, isLoading: isLoadingUsers } = useUsers(); // NOVO: Carrega usuários
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: 
  let finalFormSchema = baseFormSchema;
  
  if (isEditing) {
    // Na edição, items não é obrigatório (não pode ser alterado) e status é obrigatório
    finalFormSchema = finalFormSchema.extend({
      items: z.array(itemSchema).optional(),
      status: z.enum(statusOptions, { required_error: "O status é obrigatório." }),
      // Na edição, o responsável não é obrigatório no schema, mas é mantido
      responsavel_id: z.string().uuid().optional().nullable(),
    });
  } else if (isSuperAdmin) {
    // Na criação, Super Admin deve selecionar a empresa
    finalFormSchema = finalFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
  } 
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      // CORREÇÃO: Inicializa responsavel_id como string vazia se não estiver editando
      responsavel_id: defaultValues?.responsavel_id || "", 
      items: defaultValues?.items || [],
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
  
  // NOVO: Filtra usuários que pertencem à empresa selecionada
  const filteredUsers = useMemo(() => {
    if (!users || !isCompanySelected) return [];
    return users.filter(user => user.empresa_id === selectedCompanyId);
  }, [users, selectedCompanyId, isCompanySelected]);

  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  const isLoadingItems = isLoadingServices || isLoadingProducts;

  // Efeito para popular o mapa de estoque
  useEffect(() => {
    productStockMap.clear();
    if (allItems) {
      allItems.forEach(item => {
        // Apenas produtos têm estoque_total
        if (item.tipo === 'produto' && item.estoque_total !== null) {
          productStockMap.set(item.id, item.estoque_total);
        } else {
          // Serviços e produtos sem estoque definido têm estoque nulo
          productStockMap.set(item.id, null);
        }
      });
    }
  }, [allItems]);
  
  // NOVO: Efeito para revalidar o formulário quando a empresa muda ou os itens carregam
  useEffect(() => {
    // Dispara a revalidação de todos os campos para aplicar as novas regras de estoque
    if (isCompanySelected && !isLoadingItems) {
      form.trigger();
    }
  }, [selectedCompanyId, isLoadingItems, form]);


  useEffect(() => {
    if (isEditing && defaultValues?.items && defaultValues.items.length > 0 && fields.length === 0) {
      form.reset({
        ...form.getValues(),
        items: defaultValues.items,
      });
    }
  }, [defaultValues?.items, fields.length, form, isEditing]);

  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const { data: promotionRules, isLoading: isLoadingPromotionRules } = usePromotionRules(activePromotion?.id || '');

  // Sincroniza a promoção inicial na edição
  useEffect(() => {
    if (isEditing && defaultValues?.promocao_id && !activePromotion) {
      // Busca a promoção pelo ID para preencher o activePromotion
      const fetchInitialPromotion = async () => {
        const { data: promoData } = await supabase
          .from('promocoes')
          .select('id, nome, desconto_percentual, data_inicio, data_fim, is_active')
          .eq('id', defaultValues.promocao_id)
          .single();
        if (promoData) {
          setActivePromotion(promoData as Promotion);
        }
      };
      fetchInitialPromotion();
    } else if (!isEditing) {
      setActivePromotion(null); // Limpa a promoção ao criar um novo
    }
  }, [isEditing, defaultValues?.promocao_id]);


  // Validação da promoção
  const isPromotionValid = useMemo(() => {
    if (!activePromotion || !promotionRules || promotionRules.length === 0) return true; // Sem promoção ou sem regras = válido
    if (isLoadingPromotionRules) return true; // Ainda carregando, assume válido temporariamente

    const currentItems = form.getValues("items");
    if (currentItems.length === 0) return false; // Não há itens para aplicar a promoção

    // Verifica se pelo menos um item do pedido se encaixa em alguma regra da promoção
    return currentItems.some(orderItem => {
      const productDetails = allItems.find(p => p.id === orderItem.produto_id);
      if (!productDetails) return false;

      return promotionRules.some(rule => {
        if (rule.tipo_regra === 'produto' && rule.entidade_id === productDetails.id) return true;
        if (rule.tipo_regra === 'servico' && rule.entidade_id === productDetails.id) return true;
        
        // Verifica se o ID da categoria do produto/serviço corresponde ao ID da entidade da regra
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
    // Inicializa quantidade e preco_unitario como 0 para evitar NaN
    append({ produto_id: "", quantidade: 0, preco_unitario: 0 });
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const selectedItem = allItems.find(item => item.id === productId);
    if (selectedItem) {
      form.setValue(`items.${index}.preco_unitario`, selectedItem.preco);
      form.setValue(`items.${index}.produto_id`, productId);
      
      // Se for um produto, define a quantidade máxima para o estoque
      const stock = productStockMap.get(productId);
      if (stock !== null && stock !== undefined) {
        // Se o estoque for 0, define a quantidade para 0
        form.setValue(`items.${index}.quantidade`, stock > 0 ? 1 : 0);
      } else {
        // Se for serviço ou estoque nulo, define para 1
        form.setValue(`items.${index}.quantidade`, 1);
      }
      
      // Força a revalidação do campo quantidade
      form.trigger(`items.${index}.quantidade`);
    }
  };
  
  const getItemName = (productId: string) => {
    const item = allItems.find(i => i.id === productId);
    return item ? `${item.nome} (${item.tipo === 'produto' ? t('nav_products') : t('nav_services')})` : t('unknown_item');
  };

  const handleSubmit = (values: OrderFormValues) => {
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    // CORREÇÃO CRÍTICA: Garante que promocao_id seja NULL se for string vazia
    const final_promocao_id = values.promocao_id === "" ? null : values.promocao_id;
    
    // Na edição, o valor total é recalculado, mas os itens não são enviados
    const itemsPayload = isEditing ? [] : values.items!.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    }));

    onSubmit({
      cliente_id: values.cliente_id,
      responsavel_id: values.responsavel_id!, // NOVO CAMPO
      valor_total: calculateTotal,
      items: itemsPayload,
      status: values.status,
      empresa_id: empresa_id,
      promocao_id: isPromotionValid ? final_promocao_id : null, // Só aplica se for válido
    });
  };
  
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  const companyIdToDisplay = isEditing ? defaultValues?.empresa_id : form.watch('empresa_id');
  const companyName = companies?.find(c => c.id === companyIdToDisplay)?.nome;
  
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;
  
  // NOVO: Verifica se o formulário está inválido (apenas na criação)
  const isFormInvalid = !isEditing && (!form.formState.isValid || !form.watch('cliente_id') || !form.watch('responsavel_id') || form.watch('items')?.length === 0);


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
                      form.setValue('responsavel_id', ''); // Limpa responsável
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
        
        {/* NOVO CAMPO: Responsável pelo Pedido */}
        <FormField
          control={form.control}
          name="responsavel_id"
          render={({ field }) => {
            const selectedUser = filteredUsers.find(u => u.id === field.value);
            return (
            <FormItem>
              <FormLabel>{t('responsible', { defaultValue: 'Responsável pelo Pedido' })}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsers || isSubmitting || !isCompanySelected}>
                <FormControl>
                  <SelectTrigger>
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={isLoadingUsers ? t("loading_users") : t("select_responsible")}>
                      {selectedUser ? `${selectedUser.nome_completo} (${selectedUser.perfis?.nome})` : t("select_responsible")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome_completo} ({user.perfis?.nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}}
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
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const productId = form.watch(`items.${index}.produto_id`);
              const stock = productStockMap.get(productId);
              const isProduct = allItems.find(i => i.id === productId)?.tipo === 'produto';
              const maxQuantity = stock !== null && stock !== undefined ? stock : undefined;
              
              return (
                <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('item')} #{index + 1}</h4>
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.produto_id`}
                    render={({ field: itemField }) => {
                      const selectedItem = allItems.find(item => item.id === itemField.value);
                      return (
                        <FormItem className="flex flex-col">
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
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !itemField.value && "text-muted-foreground"
                                    )}
                                    disabled={isLoadingItems || isSubmitting || !isCompanySelected}
                                  >
                                    {itemField.value
                                      ? getItemName(itemField.value)
                                      : allItems.length === 0 ? t("loading_items") : t("select_item")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  <CommandInput placeholder={t('search_item', { defaultValue: 'Buscar item...' })} />
                                  <CommandEmpty>{t('no_data_found')}</CommandEmpty>
                                  <CommandGroup>
                                    {allItems.map((item) => (
                                      <CommandItem
                                        value={`${item.nome} (${item.tipo})`}
                                        key={item.id}
                                        onSelect={() => {
                                          handleProductChange(index, item.id);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.id === itemField.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {item.nome} ({item.tipo === 'produto' ? t('nav_products') : t('nav_services')})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantidade`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex justify-between items-center">
                            {t('quantity')}
                            {isProduct && stock !== null && (
                              <span className={cn("text-xs font-normal", stock === 0 ? "text-destructive" : "text-muted-foreground")}>
                                <Package className="h-3 w-3 inline mr-1" />
                                {t('product_table_header_stock')}: {stock}
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              // Define o max apenas para produtos com estoque conhecido
                              max={isProduct && maxQuantity !== undefined ? maxQuantity : undefined}
                              placeholder="1" 
                              {...field} 
                              onChange={(e) => {
                                let value = parseInt(e.target.value);
                                
                                // Restrição de estoque (apenas na criação)
                                if (!isEditing && isProduct && maxQuantity !== undefined && value > maxQuantity) {
                                  value = maxQuantity;
                                }
                                
                                // Garante que o valor seja um número (ou string vazia se o input permitir)
                                field.onChange(e.target.value);
                              }}
                              disabled={isSubmitting || isEditing || (isProduct && maxQuantity === 0)}
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
              );
            })}
            
            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {t('add_services_or_products')}
              </p>
            )}
            
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
          
          {/* NOVO: Botão Adicionar Item fora do CardHeader */}
          {!isEditing && (
            <div className="p-4 pt-0">
              <Button type="button" variant="outline" className="w-full" onClick={handleAddItem} disabled={isSubmitting || !isCompanySelected}>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('add_item')}
              </Button>
            </div>
          )}
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
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || (isSuperAdmin && !isCompanySelected && !isEditing) || isFormInvalid}
        >
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