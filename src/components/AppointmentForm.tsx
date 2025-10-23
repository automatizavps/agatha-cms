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
import { Loader2, CalendarIcon, Check, ChevronsUpDown, PlusCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/integrations/supabase/users";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment } from "@/integrations/supabase/appointments";
import { useClients } from "@/integrations/supabase/clients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import React, { useMemo, useEffect } from "react";
import { useServicesOnly, useProductsOnly } from "@/integrations/supabase/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusOptions: Appointment['status'][] = ['pendente', 'confirmado', 'cancelado', 'concluido'];

const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }),
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." }),
  preco_unitario: z.coerce.number().min(0, { message: "Preço deve ser positivo." }),
});

const formSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }),
  responsavel_id: z.string().uuid({
    message: "Selecione um responsável válido.",
  }),
  date: z.date({
    required_error: "A data do agendamento é obrigatória.",
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido (HH:mm).",
  }),
  status: z.enum(statusOptions, {
    required_error: "O status é obrigatório.",
  }).optional(),
  items: z.array(itemSchema).min(1, { message: "O agendamento deve ter pelo menos um serviço/produto." }),
});

type AppointmentFormValues = z.infer<typeof formSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface AppointmentFormProps {
  onSubmit: (values: { cliente_id: string; responsavel_id: string; data_hora: Date; items: ItemToCreate[]; status?: Appointment['status'] }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<AppointmentFormValues & { items: ItemToCreate[] }>;
  isEditing?: boolean;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();

  const allItems = useMemo(() => {
    return [...(services || []), ...(products || [])].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products]);
  
  const isLoadingItems = isLoadingServices || isLoadingProducts;

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      responsavel_id: defaultValues?.responsavel_id || "",
      date: defaultValues?.date,
      time: defaultValues?.time || "09:00",
      status: defaultValues?.status || 'pendente',
      items: defaultValues?.items || [],
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


  const handleSubmit = (values: AppointmentFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    
    const data_hora = new Date(values.date);
    data_hora.setHours(hours, minutes, 0, 0);

    onSubmit({
      cliente_id: values.cliente_id,
      responsavel_id: values.responsavel_id,
      data_hora: data_hora,
      items: values.items.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      })),
      status: values.status,
    });
  };
  
  const allClients = clients || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Cliente */}
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Cliente</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoadingClients || isSubmitting || isEditing}
                    >
                      {field.value
                        ? allClients.find(
                            (client) => client.id === field.value
                          )?.nome
                        : isLoadingClients ? "Carregando clientes..." : "Selecione o cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {allClients.map((client) => (
                        <CommandItem
                          value={client.nome}
                          key={client.id}
                          onSelect={() => {
                            form.setValue("cliente_id", client.id);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              client.id === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {client.nome}
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
        
        {/* Responsável */}
        <FormField
          control={form.control}
          name="responsavel_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsers || isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingUsers ? "Carregando usuários..." : "Selecione o responsável"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome_completo} ({user.perfis?.nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
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
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora (HH:mm)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 14:30" 
                    {...field} 
                    disabled={isSubmitting} 
                    type="time"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Itens do Agendamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Serviços/Produtos</CardTitle>
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
                      <FormLabel>Serviço/Produto</FormLabel>
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
                          disabled={isLoadingItems || isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={allItems.length === 0 ? "Carregando itens..." : "Selecione o item"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nome} ({item.tipo === 'servico' ? 'Serviço' : 'Produto'})
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
                Adicione serviços ou produtos ao agendamento.
              </p>
            )}
            
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
        </Card>

        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Agendar"
          )}
        </Button>
        
        {isEditing && (
          <p className="text-sm text-muted-foreground text-center">
            A edição de itens não é permitida após a criação do agendamento.
          </p>
        )}
      </form>
    </Form>
  );
};

export default AppointmentForm;