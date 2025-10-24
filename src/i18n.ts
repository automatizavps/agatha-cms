import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Recursos de tradução
const resources = {
  'pt-BR': {
    translation: {
      // Geral
      "app_name": "AGATHA IA",
      "loading": "Carregando...",
      "actions": "Ações",
      "save_changes": "Salvar Alterações",
      "try_again": "Tentar Novamente",
      "not_found": "Página não encontrada",
      "error_loading_data": "Não foi possível carregar os dados.",
      "no_data_found": "Nenhum dado encontrado.",
      "search_placeholder": "Buscar...",
      "add_new": "Adicionar Novo",
      "edit": "Editar",
      "delete": "Excluir",
      "confirm_delete": "Tem certeza que deseja excluir?",
      "achieved": "atingido",
      "units": "unidades",
      "none": "Nenhum",
      "minutes": "minutos",
      "rows_per_page": "Linhas por página",
      "page_info": "Exibindo {{start}}-{{end}} de {{count}}",
      "pagination_disabled_filter": "Paginação desabilitada ao filtrar por empresa.",
      "selected_items_count": "{{count}} item(ns) selecionado(s)",
      "cancel": "Cancelar",
      "delete_confirm": "Sim, Excluir",
      "optional": "Opcional", // NOVO
      "stock_exceeded": "A quantidade de {{name}} excede o estoque disponível ({{stock}}).", // NOVO

      // Navegação
      "nav_home": "Home",
      "nav_analytics": "Analytics",
      "nav_users": "Usuários",
      "nav_appointments": "Agendamentos",
      "nav_clients": "Clientes",
      "nav_products": "Produtos",
      "nav_services": "Serviços",
      "nav_orders": "Pedidos",
      "nav_teams": "Equipes",
      "nav_companies": "Empresas",
      "nav_settings": "Configurações",
      "nav_profile": "Meu Perfil",
      "nav_general": "Geral",
      "nav_operational": "Operacional",
      "nav_config": "Configurações",
      "nav_products_services": "Produtos & Serviços",
      // "nav_categories": "Categorias", // REMOVIDO
      "nav_notifications": "Notificações",

      // Dashboard
      "dashboard_title": "Visão Geral do Dashboard",
      "total_appointments": "Total de Agendamentos",
      "confirmed_appointments": "Confirmados",
      "pending_appointments": "Pendentes",
      "appointments_overview": "Visão geral de todos os agendamentos",
      "confirmed_status": "Agendamentos com status 'confirmado'",
      "pending_status": "Aguardando confirmação",
      "team_goals_section_title": "Metas das Equipes",
      "team_goals_progress_placeholder": "Progresso em relação à meta será exibido aqui.",
      
      // Novas Métricas do Dashboard
      "daily_revenue": "Faturamento Diário",
      "daily_revenue_overview": "Pedidos e Serviços concluídos hoje",
      "weekly_revenue": "Faturamento Semanal",
      "weekly_revenue_overview": "Pedidos e Serviços concluídos esta semana",
      "monthly_revenue": "Faturamento Mensal",
      "monthly_revenue_overview": "Pedidos e Serviços concluídos este mês",
      "total_products": "Total de Produtos",
      "total_products_overview": "Produtos cadastrados na empresa",
      "total_clients": "Total de Clientes",
      "total_clients_overview": "Clientes cadastrados na empresa",
      "latest_products_title": "Últimos Produtos Cadastrados",
      "top_selling_items_title": "Top 10 Produtos Mais Vendidos (Unidades)",
      "top_selling_services_title": "Top 10 Serviços Mais Realizados",
      "total_sold": "Total Vendido",
      "total_realized": "Total Realizado",
      
      // Páginas
      "page_title_analytics": "Analytics",
      "page_subtitle_analytics": "Relatórios detalhados e visualizações de dados.",
      "chart_title_appointment_status": "Status dos Agendamentos (Hoje)",
      "chart_no_data": "Nenhum dado de agendamento para exibir.",
      "chart_error": "Erro ao carregar dados do gráfico.",
      "analytics_placeholder": "Outros relatórios e métricas virão aqui.",
      
      "page_title_users": "Gestão de Usuários",
      "user_list_title": "Lista de Usuários",
      "user_search_placeholder": "Buscar por nome ou perfil...",
      "add_new_user": "Adicionar Novo Usuário",
      "no_users_found": "Nenhum usuário encontrado para esta empresa.",
      "no_users_search": "Nenhum usuário encontrado com o termo de busca.",
      "user_table_header_name": "Nome",
      "user_table_header_company": "Empresa",
      "user_table_header_phone": "Telefone",
      "user_table_header_address": "Endereço",
      "user_table_header_profile": "Perfil",
      "edit_user": "Editar Usuário",
      "edit_user_description": "Atualize os dados e o perfil de acesso do usuário.",
      "loading_user_data": "Carregando Dados do Usuário...",
      "loading_user_data_description": "Aguarde enquanto carregamos as informações do usuário.",
      "only_super_admin_can_invite": "Apenas Super Admin pode convidar novos usuários.", // NOVO
      "loading_profiles": "Carregando perfis...", // NOVO
      "select_profile": "Selecione um perfil", // NOVO
      "select_company_to_load_profiles": "Selecione uma empresa para carregar os perfis customizados.", // NOVO
      "unknown_profile": "Perfil Desconhecido", // NOVO
      
      "page_title_companies": "Gestão de Empresas",
      "company_list_title": "Lista de Empresas",
      "add_new_company": "Nova Empresa",
      "no_companies_found": "Nenhuma empresa cadastrada.",
      "company_form_description": "Preencha os detalhes para cadastrar uma nova empresa.", // NOVO
      
      "page_title_clients": "Gestão de Clientes",
      "client_list_title": "Lista de Clientes",
      "add_new_client": "Novo Cliente",
      "client_search_placeholder": "Buscar por nome, email, telefone ou endereço...",
      "filter_all_companies": "Todas as Empresas",
      "no_clients_found": "Nenhum cliente encontrado com os filtros aplicados.",
      "client_table_header_address": "Endereço",
      "clients_deleted_success": "{{count}} cliente(s) excluído(s) com sucesso.",
      "client_name": "Nome do Cliente", // NOVO
      "client_name_placeholder": "Nome completo do cliente", // NOVO
      
      "page_title_products": "Gestão de Produtos",
      "product_list_title": "Lista de Produtos",
      "add_new_product": "Novo Produto",
      "product_search_placeholder": "Buscar por nome, categoria ou marca...",
      "filter_all_categories": "Todas as Categorias", // ADICIONADO
      "filter_all_brands": "Todas as Marcas",
      "low_stock_alert_title": "Atenção: Estoque Baixo!",
      "low_stock_alert_description": "Os seguintes produtos estão com estoque abaixo de {{threshold}} unidades:",
      "product_table_header_stock": "Estoque",
      "product_table_header_price": "Preço",
      "product_table_header_brand": "Marca",
      "product_table_header_category": "Categoria",
      "no_products_found": "Nenhum produto encontrado com os filtros aplicados.",
      "product_name": "Nome do Produto",
      "product_name_placeholder": "Nome do produto",
      "create_product": "Cadastrar Produto",
      "stock_quantity_placeholder": "Quantidade em estoque",
      
      "page_title_services": "Gestão de Serviços",
      "service_list_title": "Lista de Serviços",
      "add_new_service": "Novo Serviço",
      "service_search_placeholder": "Buscar por nome ou categoria...",
      "service_table_header_duration": "Duração",
      "no_services_found": "Nenhum serviço cadastrado.",
      "service_name": "Nome do Serviço",
      "service_name_placeholder": "Nome do serviço",
      "create_service": "Cadastrar Serviço",
      
      // CATEGORIAS ADICIONADAS
      "page_title_categories": "Gestão de Categorias",
      "category_list_title": "Lista de Categorias",
      "add_new_category": "Nova Categoria",
      "no_categories_found": "Nenhuma categoria encontrada.",
      "category_search_placeholder": "Buscar por nome da categoria...",
      "category_name": "Nome da Categoria",
      "category_name_placeholder": "Ex: Shampoos, Cortes de Cabelo",
      "create_category": "Criar Categoria",
      "edit_category": "Editar Categoria",
      "category_created_success": "Categoria {{name}} criada com sucesso!",
      "category_updated_success": "Categoria {{name}} atualizada com sucesso!",
      "category_deleted_success": "Categoria {{name}} excluída com sucesso!",
      "category_name_exists": "Já existe uma categoria com este nome nesta empresa.",
      "select_category_placeholder": "Selecione ou deixe vazio", // NOVO
      
      "page_title_orders": "Gestão de Pedidos",
      "order_list_title": "Lista de Pedidos",
      "add_new_order": "Novo Pedido",
      "order_search_placeholder": "Buscar por cliente, status ou ID...",
      "order_table_header_id": "Pedido #",
      "order_table_header_client": "Cliente",
      "order_table_header_date": "Data",
      "order_table_header_total": "Valor Total",
      "order_table_header_status": "Status",
      "no_orders_found": "Nenhum pedido cadastrado.",
      "create_order": "Criar Pedido",
      "update_order_button": "Atualizar Pedido",
      "orders_deleted_success": "{{count}} pedido(s) excluído(s) com sucesso.",
      
      "page_title_appointments": "Gestão de Agendamentos",
      "appointments_deleted_success": "{{count}} agendamento(s) excluído(s) com sucesso.",
      
      "page_title_settings": "Configurações",
      "page_subtitle_settings": "Gerencie as configurações da sua conta e da sua empresa.",
      "settings_user_title": "Configurações da Conta",
      "settings_company_title": "Detalhes da Empresa",
      
      "page_title_profile": "Meu Perfil",
      "page_subtitle_profile": "Visualize e gerencie suas informações de conta.",
      "profile_personal_info": "Informações Pessoais",
      "profile_full_name": "Nome Completo",
      "profile_email": "Email",
      "profile_role": "Perfil de Acesso",
      "profile_company_id": "ID da Empresa",
      
      "not_found_title": "404",
      "not_found_message": "Oops! Página não encontrada",
      "not_found_return": "Voltar para Home",
      
      // Equipes (Teams)
      "page_title_teams": "Gestão de Equipes",
      "team_list_title": "Lista de Equipes",
      "add_new_team": "Nova Equipe",
      "no_teams_found": "Nenhuma equipe cadastrada.",
      "team_search_placeholder": "Buscar por nome da equipe ou empresa...",
      "team_name": "Nome da Equipe",
      "team_name_placeholder": "Ex: Equipe de Vendas, Manutenção",
      "team_meta_value": "Meta Mensal (Valor)",
      "team_meta_quantity": "Meta Mensal (Quantidade)",
      "team_members": "Membros da Equipe",
      "select_members": "Selecione os membros",
      "members_selected": "{{count}} membro(s) selecionado(s)",
      "no_members": "Nenhum membro",
      "create_team": "Criar Equipe",
      "edit_team": "Editar Equipe",
      "loading_team_data": "Carregando dados da equipe...",
      "team_created_success": "Equipe {{name}} criada com sucesso!",
      "team_updated_success": "Equipe {{name}} atualizada com sucesso!",
      "team_deleted_success": "Equipe {{name}} excluída com sucesso!",
      "team_members_update_error": "Erro ao atualizar membros da equipe: ",
      "select_valid_company": "Selecione uma empresa válida.",
      "company_required_super_admin": "A empresa é obrigatória para o Super Admin.",
      "loading_companies": "Carregando empresas...",
      "select_company": "Selecione a empresa",
      "search_user": "Buscar usuário...",
      "company_not_found": "Empresa não encontrada",
      
      // Notificações (Notifications)
      "page_title_notifications": "Notificações",
      "notification_list_title": "Histórico de Notificações",
      "notifications_marked_read": "Todas as notificações marcadas como lidas.",
      "mark_all_read": "Marcar todas como lidas",
      "no_notifications_found": "Nenhuma notificação recente.",
      "notification_table_header_status": "Status",
      "notification_table_header_title": "Título",
      "notification_table_header_message": "Mensagem",
      "notification_table_header_time": "Tempo",
      "read": "Lida",
      "unread": "Não Lida",
      "mark_as_read": "Marcar como Lida",
      "view_details": "Ver Detalhes",
      "notification_deleted_success": "Notificação excluída.",
      "view_all_notifications": "Ver todas as notificações",
      "select_all": "Selecionar todos",
      "notifications_deleted_success": "{{count}} notificação(ões) excluída(s) com sucesso.",
      "confirm_delete_single": "Tem certeza que deseja excluir esta notificação?",
      "confirm_delete_bulk": "Tem certeza que deseja excluir {{count}} notificações?",
      "delete_read_notifications": "Excluir Lidas",
      "confirm_delete_read_title": "Confirmar Exclusão de Notificações Lidas",
      "confirm_delete_read_message": "Esta ação excluirá permanentemente todas as notificações que você já marcou como lidas. Esta ação não pode ser desfeita.",
      "delete_read_success": "Todas as notificações lidas foram excluídas com sucesso.",
      
      // Senha (Password)
      "change_password": "Mudar Senha",
      "new_password": "Nova Senha",
      "confirm_new_password": "Confirmar Nova Senha",
      "update_password_button": "Atualizar Senha",
      "reset_password": "Redefinir Senha",
      "reset_password_title": "Redefinir Senha do Usuário",
      "reset_password_description": "Defina uma nova senha para {{name}}. O usuário poderá alterá-la posteriormente.",
      "your_account": "sua conta",
      "must_change_password_warning": "Você deve alterar sua senha para acessar a plataforma.",
      
      // Gráfico de Serviços por Hora
      "chart_title_daily_services": "Serviços Concluídos por Hora (Hoje)",
      "chart_no_data_today": "Nenhum serviço concluído hoje para exibir.",
      "services_completed": "Serviços Concluídos",
      
      // Gráfico de Pedidos por Hora
      "chart_title_daily_orders": "Pedidos Entregues por Hora (Hoje)",
      "chart_no_data_today_orders": "Nenhum pedido entregue hoje para exibir.",
      "orders_delivered": "Pedidos Entregues",
      "chart_title_order_status": "Status dos Pedidos (Hoje)",
      "select_company_for_metrics": "Selecione uma empresa para visualizar métricas detalhadas.",
      
      "count": "Contagem",
      
      // Agendamento (Appointment)
      "responsible": "Responsável",
      "select_responsible": "Selecione o responsável",
      "select_date": "Selecione uma data",
      "time": "Hora",
      "service_product": "Serviço/Produto",
      "add_item": "Adicionar Item",
      "select_item": "Selecione o item",
      "loading_items": "Carregando itens...",
      "quantity": "Quantidade",
      "unit_price": "Preço Unitário",
      "schedule": "Agendar",
      "unknown_item": "Item Desconhecido",
      "add_services_or_products": "Adicione serviços ou produtos ao agendamento.",
      "item_editing_not_allowed": "A edição de itens não é permitida após a criação do agendamento.",
      "select_client": "Selecione o cliente",
      "loading_clients": "Carregando clientes...",
      "search_client": "Buscar cliente...",
      "item": "Item",
      "select_company_to_load_data": "Selecione uma empresa para carregar clientes, usuários e itens.",
      "add_new_appointment": "Novo Agendamento",
      
      // Relatórios (Reports)
      "select_date_range": "Selecione o intervalo de datas",
      "filter_all_status": "Todos os Status",
      "export_data": "Exportar Dados",
      "export_select_format": "Selecione o Formato",
      "export_success": "Dados exportados com sucesso para {{format}}!",
      "export_error": "Erro ao exportar dados: ",
      "export_no_data": "Não há dados para exportar.",
      "export_sheet_name": "Relatório",
      "report_total_revenue": "Faturamento Total (Entregues)",
      "report_total_completed_services": "Total de Serviços Concluídos",
      "appointment_search_placeholder": "Buscar por cliente ou responsável...",
      
      // Status (para tradução nos relatórios)
      "pendente_entrega": "Pendente Entrega",
      "entregue": "Entregue",
      "cancelado": "Cancelado",
      "pendente": "Pendente",
      "confirmado": "Confirmado",
      "concluido": "Concluído",
      
      // Chaves de Login (Auth UI)
      "login_hero_title": "Gerencie seu negócio com eficiência e estilo.",
      "login_hero_subtitle": "Simplifique agendamentos, pedidos e estoque em uma única plataforma intuitiva.",
      "login_welcome": "Bem-vindo de volta!",
      "email_label": "Email",
      "password_label": "Senha",
      "email_placeholder": "Seu email",
      "password_placeholder": "••••••••",
      "sign_in_button": "Entrar",
      "signing_in": "Entrando...",
      "sign_in_link": "Já tem uma conta? Faça login",
      "sign_up_button": "Cadastrar",
      "signing_up": "Cadastrando...",
      "sign_up_link": "Não tem uma conta? Cadastre-se",
      "forgot_password_link": "Esqueceu sua senha?",
      "send_reset_link": "Enviar link de redefinição",
      "sending_reset_link": "Enviando...",
      "new_password_label": "Nova Senha",
      "new_password_placeholder": "Sua nova senha",
      "update_password_button": "Atualizar Senha",
      "updating_password": "Atualizando...",
      "magic_link_link": "Entrar com link mágico",
      "send_magic_link": "Enviar link mágico",
      "sending_magic_link": "Enviando link...",
      
      // Mensagens de Alerta do Auth UI
      "auth_success_email_sent": "Verifique seu email para o link de redefinição de senha.",
      "auth_success_confirmation_text": "Verifique seu email para o link de confirmação.",
      "auth_success_no_session": "Sessão iniciada com sucesso.",
      "auth_success_password_reset": "Sua senha foi redefinida com sucesso.",
      "auth_success_update_user": "Usuário atualizado com sucesso.",
      "auth_error_email_not_found": "Email não encontrado.",
      "auth_error_invalid_email": "Email inválido.",
      "auth_error_invalid_password": "Senha inválida.",
      "auth_error_user_already_exists": "Usuário já existe.",
      "auth_error_default": "Ocorreu um erro. Tente novamente.",
      
      // Histórico de Vendas do Produto
      "sales_history_title": "Histórico de Vendas: {{name}}",
      "sales_history_subtitle": "Detalhes e histórico de vendas/serviços realizados para este {{type}}.",
      "sales_history_table_title": "Transações Concluídas",
      "no_sales_history_found": "Nenhuma transação concluída encontrada para este item.",
      "weekly_sales_history": "Vendas Semanais (Últimos 7 dias)",
      "type": "Tipo",
      
      // Status da Empresa
      "company_status_active": "Ativa",
      "company_status_inactive": "Inativa",
      
      // Perfis Customizados
      "page_title_custom_profiles": "Perfis Customizados",
      "custom_profile_list_title": "Perfis por Empresa",
      "add_new_profile": "Novo Perfil Customizado",
      "no_custom_profiles_found": "Nenhum perfil customizado encontrado.",
      "custom_profile_search_placeholder": "Buscar por nome do perfil ou empresa...",
      "profile_name": "Nome do Perfil",
      "profile_name_placeholder": "Ex: Gerente de Loja, Vendedor Júnior",
      "profile_details": "Detalhes do Perfil",
      "module_permissions": "Permissões por Módulo",
      "create_profile": "Criar Perfil",
      "edit_profile": "Editar Perfil",
      "profile_created_success": "Perfil {{name}} criado com sucesso!",
      "profile_updated_success": "Perfil {{name}} atualizado com sucesso!",
      "profile_deleted_success": "Perfil {{name}} excluído com sucesso!",
      "loading_profile_data": "Carregando dados do perfil...",
      "grant_full_admin_access": "Conceder Acesso Total (Admin)",
      "grant_full_admin_access_description": "Marque para conceder permissão de Leitura e Gravação em todos os módulos. Isso ignora as configurações individuais abaixo.",
      
      // Permissões
      "access_read": "Leitura",
      "access_write": "Leitura e Gravação",
      "access_none": "Sem Acesso",
      
      // Módulos (para tradução)
      "users": "Usuários",
      "clients": "Clientes",
      "products": "Produtos",
      "services": "Serviços",
      "orders": "Pedidos",
      "appointments": "Agendamentos",
      "teams": "Equipes",
      "analytics": "Analytics",
      "companies": "Empresas",
      "notifications": "Notificações",
      "custom_profiles": "Perfis Customizados", // ADICIONADO
      "categories": "Categorias", // ADICIONADO
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Idioma padrão
    fallbackLng: 'pt-BR', // Fallback para pt-BR
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
  });

export default i18n;