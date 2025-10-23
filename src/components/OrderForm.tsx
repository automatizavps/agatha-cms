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
import { Loader2, PlusCircle, Trash2, Package, DollarSign } from "lucide-react";
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
import React, { useMemo, useEffect } from "react";

const statusOptions: OrderStatus[] = ['pendente_entrega', 'entregue', 'cancelado'];

const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }),
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." }),
  preco_unitario: z.coerce.number().min(0.01, { message: "Preço deve ser positivo." }),
});

const formSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }),
  items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." }),
  status: z.enum(statusOptions, {
    required_error: "O status é obrigatório.",
  }).optional(),
});

type OrderFormValues = z.infer<typeof formSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface OrderFormProps {
  onSubmit: (values: { cliente_id: string; valor_total: number; items: ItemToCreate[]; status?: OrderStatus }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<OrderFormValues>; 
  isEditing?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  
  const allItems = useMemo(() => {
    if (isLoadingProducts || isLoadingServices) return [];
    // Combinamos produtos e serviços
    return [...(products || []), ...(services || [])];
  }, [products, services, isLoadingProducts, isLoadingServices]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Sincroniza os itens padrão se eles mudarem (útil para o EditSheet carregar os dados)
  useEffect(() => {
    if (defaultValues?.items && defaultValues.items.length > 0 && fields.length === 0) {
      form.reset({
        ...form.getValues(),
        items: defaultValues.items,
      });
    }
  }, [defaultValues?.items, fields.length, form]);


  const calculateTotal = form.watch("items").reduce((sum, item) => {
    return sum + (item.quantidade * item.preco_unitario);
  }, 0);
  
  const handleAddItem = () => {
    append({ produto_id: "", quantidade: 1, preco_unitario: 0 });
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const selectedItem = allItems.find(item => item.id === productId);
    if (selectedItem) {
      // Atualiza o preço unitário automaticamente ao selecionar o produto/serviço
      form.setValue(`items.${index}.preco_unitario`, selectedItem.preco);
      form.setValue(`items.${index}.produto_id`, productId);
    }
  };
  
  // Função auxiliar para obter o nome do item
  const getItemName = (productId: string) => {
    const item = allItems.find(i => i.id === productId);
    return item ? `${item.nome} (${item.tipo === 'produto' ? 'Produto' : 'Serviço'})` : 'Item Desconhecido';
  };


  const handleSubmit = (values: OrderFormValues) => {
    onSubmit({
      cliente_id: values.cliente_id,
      valor_total: calculateTotal,
      items: values.items.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      })),
      status: values.status,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Cliente */}
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClients || isSubmitting || isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingClients ? "Carregando clientes..." : "Selecione o cliente"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients?.map((client) => (
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
        
        {/* Status (Apenas na Edição) */}
        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status do Pedido</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
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

        {/* Itens do Pedido */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Itens do Pedido</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSubmitting || isEditing}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">Item #{index + 1}</h4>
                
                {/* Produto/Serviço */}
                <FormField
                  control={form.control}
                  name={`items.${index}.produto_id`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Produto/Serviço</FormLabel>
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
                          disabled={isLoadingProducts || isLoadingServices || isSubmitting || isEditing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={allItems.length === 0 ? "Carregando itens..." : "Selecione o item"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nome} ({item.tipo === 'produto' ? 'Produto' : 'Serviço'})
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
                  {/* Quantidade */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantidade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
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
                  
                  {/* Preço Unitário */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.preco_unitario`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Unitário (R$)</FormLabel>
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
            ))}
            
            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Adicione produtos ou serviços ao pedido.
              </p>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold">Valor Total:</span>
              <span className="text-2xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal)}
              </span>
            </div>
            
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Atualizar Status do Pedido"
          ) : (
            "Criar Pedido"
          )}
        </Button>
        
        {isEditing && (
          <p className="text-sm text-muted-foreground text-center">
            A edição de itens não é permitida após a criação do pedido.
          </p>
        )}
      </form>
    </Form>
  );
};

export default OrderForm;