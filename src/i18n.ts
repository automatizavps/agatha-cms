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
      "none": "Nenhum", // NOVO
      "minutes": "minutos", // NOVO
      
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
      "nav_products_services": "Produtos & Serviços", // NOVO
      "nav_categories": "Categorias", // NOVO
      "nav_notifications": "Notificações", // NOVO

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
      "daily_revenue_overview": "Pedidos entregues hoje",
      "weekly_revenue": "Faturamento Semanal",
      "weekly_revenue_overview": "Pedidos entregues esta semana",
      "monthly_revenue": "Faturamento Mensal", // NOVO
      "monthly_revenue_overview": "Pedidos entregues este mês", // NOVO
      "total_products": "Total de Produtos",
      "total_products_overview": "Produtos cadastrados na empresa",
      "total_clients": "Total de Clientes", // NOVO
      "total_clients_overview": "Clientes cadastrados na empresa", // NOVO
      "latest_products_title": "Últimos Produtos Cadastrados", // NOVO
      "top_selling_items_title": "Top 10 Produtos Mais Vendidos (Unidades)", // NOVO
      "top_selling_services_title": "Top 10 Serviços Mais Realizados", // NOVO
      "total_sold": "Total Vendido", // NOVO
      "total_realized": "Total Realizado", // NOVO
      
      // Páginas
      "page_title_analytics": "Analytics",
      "page_subtitle_analytics": "Relatórios detalhados e visualizações de dados.",
      "chart_title_appointment_status": "Status dos Agendamentos (Hoje)", // ALTERADO
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
      
      "page_title_companies": "Gestão de Empresas",
      "company_list_title": "Lista de Empresas",
      "add_new_company": "Nova Empresa",
      "no_companies_found": "Nenhuma empresa cadastrada.",
      
      "page_title_clients": "Gestão de Clientes",
      "client_list_title": "Lista de Clientes",
      "add_new_client": "Novo Cliente",
      "client_search_placeholder": "Buscar por nome, email, telefone ou endereço...",
      "filter_all_companies": "Todas as Empresas",
      "no_clients_found": "Nenhum cliente encontrado com os filtros aplicados.",
      "client_table_header_address": "Endereço",
      
      "page_title_products": "Gestão de Produtos",
      "product_list_title": "Lista de Produtos",
      "add_new_product": "Novo Produto",
      "product_search_placeholder": "Buscar por nome, categoria ou marca...",
      "filter_all_categories": "Todas as Categorias",
      "filter_all_brands": "Todas as Marcas",
      "low_stock_alert_title": "Atenção: Estoque Baixo!",
      "low_stock_alert_description": "Os seguintes produtos estão com estoque abaixo de {{threshold}} unidades:",
      "product_table_header_stock": "Estoque",
      "product_table_header_price": "Preço",
      "product_table_header_brand": "Marca",
      "product_table_header_category": "Categoria",
      "no_products_found": "Nenhum produto encontrado com os filtros aplicados.",
      "product_name": "Nome do Produto", // NOVO
      "product_name_placeholder": "Nome do produto", // NOVO
      "create_product": "Cadastrar Produto", // NOVO
      "stock_quantity_placeholder": "Quantidade em estoque", // NOVO
      
      "page_title_services": "Gestão de Serviços",
      "service_list_title": "Lista de Serviços",
      "add_new_service": "Novo Serviço",
      "service_search_placeholder": "Buscar por nome ou categoria...",
      "service_table_header_duration": "Duração",
      "no_services_found": "Nenhum serviço cadastrado.",
      "service_name": "Nome do Serviço", // NOVO
      "service_name_placeholder": "Nome do serviço", // NOVO
      "create_service": "Cadastrar Serviço", // NOVO
      
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
      "create_order": "Criar Pedido", // NOVO
      "update_order_button": "Atualizar Pedido", // NOVO
      
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
      "company_not_found": "Empresa não encontrada", // NOVO
      
      // Categorias (Categories) - NOVO
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
      "select_category": "Selecione a categoria",
      "search_category": "Buscar categoria...",
      
      // Notificações (Notifications) - NOVO
      "notifications_marked_read": "Todas as notificações marcadas como lidas.",
      "mark_all_read": "Marcar todas como lidas",
      "no_notifications_found": "Nenhuma notificação recente.",
      
      // Senha (Password) - NOVO
      "change_password": "Mudar Senha",
      "new_password": "Nova Senha",
      "confirm_new_password": "Confirmar Nova Senha",
      "update_password_button": "Atualizar Senha",
      
      // Gráfico de Serviços por Hora (NOVO)
      "chart_title_daily_services": "Serviços Concluídos por Hora (Hoje)",
      "chart_no_data_today": "Nenhum serviço concluído hoje para exibir.",
      "services_completed": "Serviços Concluídos",
      
      // Gráfico de Pedidos por Hora (NOVO)
      "chart_title_daily_orders": "Pedidos Entregues por Hora (Hoje)",
      "chart_no_data_today_orders": "Nenhum pedido entregue hoje para exibir.",
      "orders_delivered": "Pedidos Entregues",
      "chart_title_order_status": "Status dos Pedidos (Hoje)",
      "select_company_for_metrics": "Selecione uma empresa para visualizar métricas detalhadas.",
      
      "count": "Contagem",
      
      // Agendamento (Appointment) - NOVO
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
      "add_new_appointment": "Novo Agendamento", // NOVO
      
      // Chave que faltava
      "page_title_appointments": "Gestão de Agendamentos",
    },
  },
  'ja': {
    translation: {
      // Geral
      "app_name": "AGATHA IA",
      "loading": "ロード中...",
      "actions": "アクション",
      "save_changes": "変更を保存",
      "try_again": "再試行",
      "not_found": "ページが見つかりません",
      "error_loading_data": "データをロードできませんでした。",
      "no_data_found": "データが見つかりません。",
      "search_placeholder": "検索...",
      "add_new": "新規追加",
      "edit": "編集",
      "delete": "削除",
      "confirm_delete": "本当に削除しますか？",
      "achieved": "達成",
      "units": "単位",
      "none": "なし",
      "minutes": "分",
      
      // Navegação
      "nav_home": "ホーム",
      "nav_analytics": "分析",
      "nav_users": "ユーザー",
      "nav_appointments": "予約",
      "nav_clients": "顧客",
      "nav_products": "製品",
      "nav_services": "サービス",
      "nav_orders": "注文",
      "nav_teams": "チーム",
      "nav_companies": "企業",
      "nav_settings": "設定",
      "nav_profile": "マイプロフィール",
      "nav_general": "一般",
      "nav_operational": "運用",
      "nav_config": "設定",
      "nav_products_services": "製品とサービス",
      "nav_categories": "カテゴリ",
      "nav_notifications": "通知",

      // Dashboard
      "dashboard_title": "ダッシュボード概要",
      "total_appointments": "合計予約数",
      "confirmed_appointments": "確認済み",
      "pending_appointments": "保留中",
      "appointments_overview": "すべての予約の概要",
      "confirmed_status": "「確認済み」ステータスの予約",
      "pending_status": "確認待ち",
      "team_goals_section_title": "チーム目標",
      "team_goals_progress_placeholder": "目標に対する進捗がここに表示されます。",
      
      // Novas Métricas do Dashboard
      "daily_revenue": "日次収益",
      "daily_revenue_overview": "本日配達された注文",
      "weekly_revenue": "週次収益",
      "weekly_revenue_overview": "今週配達された注文",
      "monthly_revenue": "月次収益",
      "monthly_revenue_overview": "今月配達された注文",
      "total_products": "合計製品数",
      "total_products_overview": "企業に登録されている製品",
      "total_clients": "合計顧客数",
      "total_clients_overview": "企業に登録されている顧客",
      "latest_products_title": "最新の登録製品",
      "top_selling_items_title": "売上トップ10製品（単位）",
      "top_selling_services_title": "実施回数トップ10サービス",
      "total_sold": "合計販売数",
      "total_realized": "合計実施数",
      
      // Páginas
      "page_title_analytics": "分析",
      "page_subtitle_analytics": "詳細なレポートとデータ視覚化。",
      "chart_title_appointment_status": "予約ステータス（本日）",
      "chart_no_data": "表示する予約データがありません。",
      "chart_error": "グラフデータのロード中にエラーが発生しました。",
      "analytics_placeholder": "その他のレポートとメトリックがここに表示されます。",
      
      "page_title_users": "ユーザー管理",
      "user_list_title": "ユーザーリスト",
      "user_search_placeholder": "名前またはプロフィールで検索...",
      "add_new_user": "新規ユーザー追加",
      "no_users_found": "この企業にはユーザーが見つかりません。",
      "no_users_search": "検索語句に一致するユーザーが見つかりません。",
      "user_table_header_name": "名前",
      "user_table_header_company": "企業",
      "user_table_header_phone": "電話",
      "user_table_header_address": "住所",
      "user_table_header_profile": "プロフィール",
      
      "page_title_companies": "企業管理",
      "company_list_title": "企業リスト",
      "add_new_company": "新規企業",
      "no_companies_found": "登録されている企業がありません。",
      
      "page_title_clients": "顧客管理",
      "client_list_title": "顧客リスト",
      "add_new_client": "新規顧客",
      "client_search_placeholder": "名前、メール、電話、住所で検索...",
      "filter_all_companies": "すべての企業",
      "no_clients_found": "適用されたフィルターに一致する顧客が見つかりません。",
      "client_table_header_address": "住所",
      
      "page_title_products": "製品管理",
      "product_list_title": "製品リスト",
      "add_new_product": "新規製品",
      "product_search_placeholder": "名前、カテゴリ、ブランドで検索...",
      "filter_all_categories": "すべてのカテゴリ",
      "filter_all_brands": "すべてのブランド",
      "low_stock_alert_title": "注意：在庫不足！",
      "low_stock_alert_description": "以下の製品は在庫が{{threshold}}単位未満です:",
      "product_table_header_stock": "在庫",
      "product_table_header_price": "価格",
      "product_table_header_brand": "ブランド",
      "product_table_header_category": "カテゴリ",
      "no_products_found": "適用されたフィルターに一致する製品が見つかりません。",
      "product_name": "製品名",
      "product_name_placeholder": "製品名",
      "create_product": "製品を登録",
      "stock_quantity_placeholder": "在庫数",
      
      "page_title_services": "サービス管理",
      "service_list_title": "サービスリスト",
      "add_new_service": "新規サービス",
      "service_search_placeholder": "名前またはカテゴリで検索...",
      "service_table_header_duration": "期間",
      "no_services_found": "登録されているサービスがありません。",
      "service_name": "サービス名",
      "service_name_placeholder": "サービス名",
      "create_service": "サービスを登録",
      
      "page_title_orders": "注文管理",
      "order_list_title": "注文リスト",
      "add_new_order": "新規注文",
      "order_search_placeholder": "顧客、ステータス、またはIDで検索...",
      "order_table_header_id": "注文 #",
      "order_table_header_client": "顧客",
      "order_table_header_date": "日付",
      "order_table_header_total": "合計金額",
      "order_table_header_status": "ステータス",
      "no_orders_found": "登録されている注文がありません。",
      "create_order": "注文を作成",
      "update_order_button": "注文を更新",
      
      "page_title_settings": "設定",
      "page_subtitle_settings": "アカウントと企業の設定を管理します。",
      "settings_user_title": "アカウント設定",
      "settings_company_title": "企業詳細",
      
      "page_title_profile": "マイプロフィール",
      "page_subtitle_profile": "アカウント情報を表示および管理します。",
      "profile_personal_info": "個人情報",
      "profile_full_name": "フルネーム",
      "profile_email": "メール",
      "profile_role": "アクセス権限",
      "profile_company_id": "企業ID",
      
      "not_found_title": "404",
      "not_found_message": "おっと！ページが見つかりません",
      "not_found_return": "ホームに戻る",
      
      // Equipes (Teams)
      "page_title_teams": "チーム管理",
      "team_list_title": "チームリスト",
      "add_new_team": "新規チーム",
      "no_teams_found": "登録されているチームがありません。",
      "team_search_placeholder": "チーム名または企業名で検索...",
      "team_name": "チーム名",
      "team_name_placeholder": "例: 営業チーム、メンテナンス",
      "team_meta_value": "月次目標（金額）",
      "team_meta_quantity": "月次目標（数量）",
      "team_members": "チームメンバー",
      "select_members": "メンバーを選択",
      "members_selected": "{{count}}人のメンバーが選択されました",
      "no_members": "メンバーなし",
      "create_team": "チームを作成",
      "edit_team": "チームを編集",
      "loading_team_data": "チームデータをロード中...",
      "team_created_success": "チーム {{name}} が正常に作成されました！",
      "team_updated_success": "チーム {{name}} が正常に更新されました！",
      "team_deleted_success": "チーム {{name}} が正常に削除されました！",
      "team_members_update_error": "チームメンバーの更新中にエラーが発生しました: ",
      "select_valid_company": "有効な企業を選択してください。",
      "company_required_super_admin": "スーパー管理者にとって企業は必須です。",
      "loading_companies": "企業をロード中...",
      "select_company": "企業を選択",
      "search_user": "ユーザーを検索...",
      "company_not_found": "企業が見つかりません",
      
      // Categorias (Categories)
      "page_title_categories": "カテゴリ管理",
      "category_list_title": "カテゴリリスト",
      "add_new_category": "新規カテゴリ",
      "no_categories_found": "カテゴリが見つかりません。",
      "category_search_placeholder": "カテゴリ名で検索...",
      "category_name": "カテゴリ名",
      "category_name_placeholder": "例: シャンプー、ヘアカット",
      "create_category": "カテゴリを作成",
      "edit_category": "カテゴリを編集",
      "category_created_success": "カテゴリ {{name}} が正常に作成されました！",
      "category_updated_success": "カテゴリ {{name}} が正常に更新されました！",
      "category_deleted_success": "カテゴリ {{name}} が正常に削除されました！",
      "select_category": "カテゴリを選択",
      "search_category": "カテゴリを検索...",
      
      // Notificações (Notifications)
      "notifications_marked_read": "すべての通知が既読になりました。",
      "mark_all_read": "すべて既読にする",
      "no_notifications_found": "最近の通知はありません。",
      
      // Senha (Password)
      "change_password": "パスワードを変更",
      "new_password": "新しいパスワード",
      "confirm_new_password": "新しいパスワードを確認",
      "update_password_button": "パスワードを更新",
      
      // Gráfico de Serviços por Hora
      "chart_title_daily_services": "完了したサービスの時間別（本日）",
      "chart_no_data_today": "本日完了したサービスデータはありません。",
      "services_completed": "完了したサービス",
      
      // Gráfico de Pedidos por Hora
      "chart_title_daily_orders": "配達された注文の時間別（本日）",
      "chart_no_data_today_orders": "本日配達された注文データはありません。",
      "orders_delivered": "配達された注文",
      "chart_title_order_status": "注文ステータス（本日）",
      "select_company_for_metrics": "詳細なメトリックを表示するために企業を選択してください。",
      
      "count": "カウント",
      
      // Agendamento (Appointment)
      "responsible": "担当者",
      "select_responsible": "担当者を選択",
      "select_date": "日付を選択",
      "time": "時間",
      "service_product": "サービス/製品",
      "add_item": "アイテムを追加",
      "select_item": "アイテムを選択",
      "loading_items": "アイテムをロード中...",
      "quantity": "数量",
      "unit_price": "単価",
      "schedule": "予約する",
      "unknown_item": "不明なアイテム",
      "add_services_or_products": "予約にサービスまたは製品を追加してください。",
      "item_editing_not_allowed": "予約作成後のアイテム編集は許可されていません。",
      "select_client": "顧客を選択",
      "loading_clients": "顧客をロード中...",
      "search_client": "顧客を検索...",
      "item": "アイテム",
      "select_company_to_load_data": "顧客、ユーザー、アイテムをロードするために企業を選択してください。",
      "add_new_appointment": "新規予約",
      
      // Chave que faltava
      "page_title_appointments": "予約管理",
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