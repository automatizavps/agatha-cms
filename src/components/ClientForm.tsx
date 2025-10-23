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
import { Loader2 } from "lucide-react";
import { Client } from "@/integrations/supabase/clients";

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Insira um email válido.",
  }).or(z.literal("")).nullable(), // Permite string vazia ou null
  telefone: z.string().optional().nullable(),
});

type ClientFormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  onSubmit: (values: { nome: string; email: string | null; telefone: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ClientFormValues>;
  isEditing?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      email: defaultValues?.email || "",
      telefone: defaultValues?.telefone || "",
    },
  });

  const handleSubmit = (values: ClientFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const email = values.email ? values.email : null;
    const telefone = values.telefone ? values.telefone : null;
    
    onSubmit({
      nome: values.nome,
      email: email,
      telefone: telefone,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="email@exemplo.com" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""} // Garante que o input não seja undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="(XX) XXXXX-XXXX" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""} // Garante que o input não seja undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Cadastrar Cliente"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ClientForm;