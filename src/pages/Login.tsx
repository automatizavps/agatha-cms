import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

function Login() {
  const { t } = useTranslation();
  
  // URL de placeholder para a imagem de fundo
  const backgroundImageUrl = "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div className="min-h-screen flex">
      
      {/* Container Esquerdo (Visual) - Visível apenas em telas maiores que 'md' */}
      <div 
        className={cn(
          "hidden md:flex md:w-1/2 lg:w-3/5",
          "bg-cover bg-center relative p-12",
          "items-end justify-start"
        )}
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
      >
        {/* Overlay escuro para melhor contraste do texto */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Conteúdo (Título e Parágrafo) - Posicionado na esquerda inferior */}
        <div className="relative z-10 text-white max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
            {t('login_hero_title', { defaultValue: 'Gerencie seu negócio com eficiência e estilo.' })}
          </h1>
          <p className="text-lg font-light">
            {t('login_hero_subtitle', { defaultValue: 'Simplifique agendamentos, pedidos e estoque em uma única plataforma intuitiva.' })}
          </p>
        </div>
      </div>

      {/* Container Direito (Formulário de Login) */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center bg-background p-4">
        {/* Classes bg-card, shadow-lg e border removidas */}
        <div className="w-full max-w-md p-8 space-y-6 rounded-lg"> 
          
          {/* Logo e Nome do App */}
          <div className="flex items-center justify-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-8 w-8 text-primary mr-3"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 className="text-2xl font-bold text-center tracking-tight">
              {t('app_name', { defaultValue: 'Dyad Manager' })}
            </h2>
          </div>
          
          <h3 className="text-xl font-semibold text-center text-foreground">
            {t('login_welcome', { defaultValue: 'Bem-vindo de volta!' })}
          </h3>

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
                    inputBackground: 'hsl(var(--input))',
                    inputBorder: 'hsl(var(--border))',
                    inputBorderHover: 'hsl(var(--ring))',
                    inputFocus: 'hsl(var(--ring))',
                    defaultButtonBackground: 'hsl(var(--primary))',
                    defaultButtonBackgroundHover: 'hsl(var(--primary)/0.9)',
                    defaultButtonText: 'hsl(var(--primary-foreground))',
                    anchorTextColor: 'hsl(var(--primary))',
                    anchorTextHoverColor: 'hsl(var(--primary)/0.9)',
                  },
                  fontSizes: {
                    baseButtonSize: '16px',
                    inputLabel: '14px',
                    inputPlaceholder: '16px',
                  }
                },
              },
            }}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: t('email_label'),
                  password_label: t('password_label'),
                  email_input_placeholder: t('email_placeholder'),
                  password_input_placeholder: t('password_placeholder'),
                  button_label: t('sign_in_button'),
                  loading_button_label: t('signing_in'),
                  link_text: t('sign_in_link'),
                },
                sign_up: {
                  email_label: t('email_label'),
                  password_label: t('password_label'),
                  email_input_placeholder: t('email_placeholder'),
                  password_input_placeholder: t('password_placeholder'),
                  button_label: t('sign_up_button'),
                  loading_button_label: t('signing_up'),
                  link_text: t('sign_up_link'),
                },
                forgotten_password: {
                  link_text: t('forgot_password_link'),
                  email_label: t('email_label'),
                  email_input_placeholder: t('email_placeholder'),
                  button_label: t('send_reset_link'),
                  loading_button_label: t('sending_reset_link'),
                },
                update_password: {
                  password_label: t('new_password_label'),
                  password_input_placeholder: t('new_password_placeholder'),
                  button_label: t('update_password_button'),
                  loading_button_label: t('updating_password'),
                },
                magic_link: {
                  link_text: t('magic_link_link'),
                  email_input_placeholder: t('email_placeholder'),
                  button_label: t('send_magic_link'),
                  loading_button_label: t('sending_magic_link'),
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Login;