import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { PublicRoute } from '@/integrations/supabase/auth';

const Login = () => {
  return (
    <PublicRoute>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
          <h1 className="text-2xl font-bold text-center text-foreground">Bem-vindo</h1>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            view="sign_in"
            redirectTo={window.location.origin + '/'}
            // Adiciona a localização para Português do Brasil
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Seu email',
                  password_label: 'Sua senha',
                  email_input_placeholder: 'Digite seu email',
                  password_input_placeholder: 'Digite sua senha',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  link_text: 'Já tem uma conta? Faça login',
                },
                sign_up: {
                  email_label: 'Seu email',
                  password_label: 'Crie uma senha',
                  email_input_placeholder: 'Digite seu email',
                  password_input_placeholder: 'Crie uma senha',
                  button_label: 'Cadastrar',
                  loading_button_label: 'Cadastrando...',
                  link_text: 'Não tem uma conta? Cadastre-se',
                },
                forgotten_password: {
                  email_label: 'Seu email',
                  email_input_placeholder: 'Digite seu email para recuperação',
                  button_label: 'Enviar instruções de recuperação',
                  loading_button_label: 'Enviando...',
                  link_text: 'Esqueceu sua senha?',
                },
                update_password: {
                  password_label: 'Nova senha',
                  password_input_placeholder: 'Digite sua nova senha',
                  button_label: 'Atualizar senha',
                  loading_button_label: 'Atualizando...',
                },
                magic_link: {
                  email_input_placeholder: 'Digite seu email',
                  button_label: 'Enviar link mágico',
                  loading_button_label: 'Enviando link mágico...',
                  link_text: 'Enviar um link mágico por email',
                },
              },
            }}
          />
        </div>
      </div>
    </PublicRoute>
  );
};

export default Login;