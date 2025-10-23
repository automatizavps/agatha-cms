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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfiles } from "@/integrations/supabase/profiles";

const formSchema = z.object({
  full_name: z.string().min(2, {
    message: "O nome completo deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Insira um email válido.",
  }),
  perfil_id: z.string().min(1, {
    message: "Selecione um perfil.",
  }),
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  onSubmit: (values: UserFormValues) => void;
  isSubmitting: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, isSubmitting }) => {
  const { data: profiles, isLoading: isLoadingProfiles } = useProfiles();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      perfil_id: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do usuário" {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="perfil_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProfiles || isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingProfiles ? (
                    <SelectItem value="" disabled>Carregando perfis...</SelectItem>
                  ) : (
                    profiles?.map((profile) => (
                      <SelectItem key={profile.id} value={String(profile.id)}>
                        {profile.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Adicionar Usuário"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UserForm;