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
import { Loader2, CalendarIcon } from "lucide-react";
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

const formSchema = z.object({
  cliente_nome: z.string().min(2, {
    message: "O nome do cliente deve ter pelo menos 2 caracteres.",
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
});

type AppointmentFormValues = z.infer<typeof formSchema>;

interface AppointmentFormProps {
  onSubmit: (values: { cliente_nome: string; responsavel_id: string; data_hora: Date }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<AppointmentFormValues>;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, isSubmitting, defaultValues }) => {
  const { data: users, isLoading: isLoadingUsers } = useUsers();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_nome: defaultValues?.cliente_nome || "",
      responsavel_id: defaultValues?.responsavel_id || "",
      date: defaultValues?.date,
      time: defaultValues?.time || "09:00",
    },
  });

  const handleSubmit = (values: AppointmentFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    
    // Cria um objeto Date combinando a data selecionada e a hora
    const data_hora = new Date(values.date);
    data_hora.setHours(hours, minutes, 0, 0);

    onSubmit({
      cliente_nome: values.cliente_nome,
      responsavel_id: values.responsavel_id,
      data_hora: data_hora,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="cliente_nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do cliente" {...field} disabled={isSubmitting} />
              </FormControl>
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
                      disabled={(date) => date < new Date()}
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Agendar"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default AppointmentForm;