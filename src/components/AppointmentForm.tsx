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
import { Loader2, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
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
import React from "react";

const statusOptions: Appointment['status'][] = ['pendente', 'confirmado', 'cancelado', 'concluido'];

const formSchema = z.object({
  // Alterado de cliente_nome para cliente_id
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
  }).optional(), // Opcional na criação, mas presente na edição
});

type AppointmentFormValues = z.infer<typeof formSchema>;

interface AppointmentFormProps {
  onSubmit: (values: { cliente_id: string; responsavel_id: string; data_hora: Date; status?: Appointment['status'] }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<AppointmentFormValues>;
  isEditing?: boolean;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: clients, isLoading: isLoadingClients } = useClients();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      responsavel_id: defaultValues?.responsavel_id || "",
      date: defaultValues?.date,
      time: defaultValues?.time || "09:00",
      status: defaultValues?.status || 'pendente',
    },
  });

  const handleSubmit = (values: AppointmentFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    
    // Cria um objeto Date combinando a data selecionada e a hora
    const data_hora = new Date(values.date);
    data_hora.setHours(hours, minutes, 0, 0);

    onSubmit({
      cliente_id: values.cliente_id,
      responsavel_id: values.responsavel_id,
      data_hora: data_hora,
      status: values.status,
    });
  };
  
  const allClients = clients || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Campo Cliente (Combobox) */}
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
                      disabled={isLoadingClients || isSubmitting}
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Permite selecionar a data de hoje
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
      </form>
    </Form>
  );
};

export default AppointmentForm;