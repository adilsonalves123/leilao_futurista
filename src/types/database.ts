/** JSON compatível com colunas jsonb do PostgREST */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'bidder' | 'vendor' | 'admin';

export type AuctionStatus =
  | 'draft'
  | 'live'
  | 'paused'
  | 'ended'
  | 'frozen'
  | 'cancelled';

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'disputed';

export type OrderStatus =
  | 'pendente_pagamento'
  | 'pago'
  | 'em_envio'
  | 'aguardando_confirmacao'
  | 'finalizado'
  | 'em_disputa'
  | 'estornado';

export type InvoicePaymentMethod = 'pix' | 'boleto' | 'cartao' | 'cripto';

export type StatusVerificacao = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: UserRole;
          wallet_address: string | null;
          escrow_balance_cents: number;
          vendor_collateral_held_cents: number;
          created_at: string;
          nome_completo: string | null;
          cpf: string | null;
          documento_url: string | null;
          selfie_url: string | null;
          status_verificacao: StatusVerificacao;
          termos_aceitos: string | null;
          telefone: string | null;
          data_nascimento: string | null;
          cep: string | null;
          endereco_logradouro: string | null;
          endereco_numero: string | null;
          endereco_complemento: string | null;
          endereco_bairro: string | null;
          endereco_cidade: string | null;
          endereco_uf: string | null;
          status_conta: 'ativo' | 'suspenso' | 'bloqueado' | 'banido';
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          wallet_address?: string | null;
          escrow_balance_cents?: number;
          vendor_collateral_held_cents?: number;
          nome_completo?: string | null;
          cpf?: string | null;
          documento_url?: string | null;
          selfie_url?: string | null;
          status_verificacao?: StatusVerificacao;
          termos_aceitos?: string | null;
          telefone?: string | null;
          data_nascimento?: string | null;
          cep?: string | null;
          endereco_logradouro?: string | null;
          endereco_numero?: string | null;
          endereco_complemento?: string | null;
          endereco_bairro?: string | null;
          endereco_cidade?: string | null;
          endereco_uf?: string | null;
          status_conta?: 'ativo' | 'suspenso' | 'bloqueado' | 'banido';
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          user_id: string;
          reputacao_estrelas: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          reputacao_estrelas?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
        Relationships: [];
      };
      auctions: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          image_urls: string[];
          starting_price_cents: number;
          current_price_cents: number;
          status: AuctionStatus;
          starts_at: string;
          ends_at: string;
          anti_snipe_extended_count: number;
          created_at: string;
          listing_category: string | null;
          is_featured: boolean;
          is_featured_plus: boolean;
          featured_until: string | null;
          featured_plus_until: string | null;
          conservation_state: string | null;
          serial_imei: string | null;
          serial_imei_kind: string | null;
          origin_cep: string | null;
          estimated_market_cents: number | null;
          nf_access_key: string | null;
          ai_cover_optimized: boolean;
          listing_extras: Record<string, unknown>;
          ownership_declared_at: string | null;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          image_urls?: string[];
          starting_price_cents: number;
          current_price_cents?: number;
          status?: AuctionStatus;
          starts_at: string;
          ends_at: string;
          listing_category?: string | null;
          is_featured?: boolean;
          is_featured_plus?: boolean;
          featured_until?: string | null;
          featured_plus_until?: string | null;
          conservation_state?: string | null;
          serial_imei?: string | null;
          serial_imei_kind?: string | null;
          origin_cep?: string | null;
          estimated_market_cents?: number | null;
          nf_access_key?: string | null;
          ai_cover_optimized?: boolean;
          listing_extras?: Record<string, unknown>;
          ownership_declared_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['auctions']['Insert']>;
        Relationships: [];
      };
      promotion_plans: {
        Row: {
          slug: string;
          name: string;
          description: string;
          price_cents: number;
          duration_mode: string;
          duration_days: number | null;
          max_live_slots: number | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description: string;
          price_cents: number;
          duration_mode: string;
          duration_days?: number | null;
          max_live_slots?: number | null;
          sort_order?: number;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['promotion_plans']['Insert']>;
        Relationships: [];
      };
      auction_promotions: {
        Row: {
          id: string;
          auction_id: string;
          seller_id: string;
          plan_slug: string;
          price_paid_cents: number;
          purchased_at: string;
          expires_at: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          seller_id: string;
          plan_slug: string;
          price_paid_cents: number;
          expires_at?: string | null;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['auction_promotions']['Insert']>;
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          auction_id: string;
          bidder_id: string;
          amount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          bidder_id: string;
          amount_cents: number;
        };
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
        Relationships: [];
      };
      checkouts: {
        Row: {
          id: string;
          auction_id: string;
          buyer_id: string;
          subtotal_cents: number;
          commission_cents: number;
          shipping_cents: number;
          total_cents: number;
          escrow_status: EscrowStatus;
          shipping_label_url: string | null;
          qr_code_data: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          buyer_id: string;
          subtotal_cents: number;
          commission_cents: number;
          shipping_cents?: number;
          total_cents: number;
          escrow_status?: EscrowStatus;
        };
        Update: Partial<Database['public']['Tables']['checkouts']['Insert']>;
        Relationships: [];
      };
      live_auction_messages: {
        Row: {
          id: string;
          auction_id: string;
          user_id: string | null;
          username: string;
          message: string;
          is_system_message: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          user_id?: string | null;
          username: string;
          message: string;
          is_system_message?: boolean;
        };
        Update: Partial<Database['public']['Tables']['live_auction_messages']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          code: string;
          auction_id: string;
          buyer_id: string;
          vendor_id: string;
          checkout_id: string | null;
          item_cents: number;
          shipping_cents: number;
          commission_cents: number;
          total_cents: number;
          status: OrderStatus;
          tracking_code: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          finalized_at: string | null;
          payment_provider: 'asaas' | 'mercado_pago' | 'luckcode' | null;
          external_payment_id: string | null;
          gateway_fee_cents: number;
          fee_reserve_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          auction_id: string;
          buyer_id: string;
          vendor_id: string;
          checkout_id?: string | null;
          item_cents: number;
          shipping_cents?: number;
          commission_cents?: number;
          total_cents: number;
          status?: OrderStatus;
          tracking_code?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          finalized_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      auction_invoices: {
        Row: {
          id: string;
          order_id: string;
          payment_method: InvoicePaymentMethod;
          gateway_transaction_id: string | null;
          approved_at: string | null;
          receipt_url: string | null;
          gateway: string;
          amount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_method: InvoicePaymentMethod;
          gateway_transaction_id?: string | null;
          approved_at?: string | null;
          receipt_url?: string | null;
          gateway?: string;
          amount_cents: number;
        };
        Update: Partial<Database['public']['Tables']['auction_invoices']['Insert']>;
        Relationships: [];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          event_type: string;
          message: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          event_type: string;
          message: string;
          metadata?: Json;
        };
        Update: Partial<Database['public']['Tables']['order_events']['Insert']>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          auction_id: string;
          buyer_id: string;
          vendor_id: string;
          rating: number;
          comment: string;
          images: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          auction_id: string;
          buyer_id: string;
          vendor_id: string;
          rating: number;
          comment?: string;
          images?: string[];
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [];
      };
      banners: {
        Row: {
          id: number;
          inicio: Json;
          leiloes: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          inicio?: Json;
          leiloes?: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          inicio?: Json;
          leiloes?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_policies: {
        Row: {
          id: string;
          title: string;
          content: string;
          type: string;
          version: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          type: string;
          version: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['app_policies']['Insert']>;
        Relationships: [];
      };
      app_access_logs: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          platform: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id: string;
          platform?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['app_access_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_admin_orders: {
        Args: {
          p_query?: string;
          p_categoria?: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          code: string;
          auction_id: string;
          auction_title: string;
          auction_image: string;
          buyer_id: string;
          buyer_nome: string;
          buyer_email: string;
          buyer_cpf: string | null;
          buyer_telefone: string | null;
          vendor_id: string;
          vendor_nome: string;
          vendor_email: string;
          vendor_telefone: string | null;
          item_cents: number;
          shipping_cents: number;
          commission_cents: number;
          total_cents: number;
          status: OrderStatus;
          tracking_code: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      process_auction_payment: {
        Args: {
          p_auction_id: string;
          p_buyer_id: string;
          p_item_cents: number;
          p_shipping_cents: number;
          p_commission_cents: number;
          p_payment_method: InvoicePaymentMethod;
          p_gateway_transaction_id?: string | null;
          p_receipt_url?: string | null;
          p_gateway?: string;
        };
        Returns: {
          checkout_id: string;
          order_id: string;
          order_code: string;
        }[];
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_status: OrderStatus;
          p_tracking_code?: string | null;
          p_event_type?: string | null;
          p_event_message?: string | null;
        };
        Returns: undefined;
      };
      excluir_leilao_vendedor: {
        Args: { p_auction_id: string };
        Returns: undefined;
      };
      live_chat_listar_mensagens: {
        Args: { p_auction_id: string; p_limit?: number };
        Returns: {
          id: string;
          auction_id: string;
          user_id: string | null;
          username: string;
          message: string;
          is_system_message: boolean;
          created_at: string;
        }[];
      };
      live_chat_enviar_mensagem: {
        Args: { p_auction_id: string; p_message: string };
        Returns: {
          id: string;
          auction_id: string;
          user_id: string | null;
          username: string;
          message: string;
          is_system_message: boolean;
          created_at: string;
        }[];
      };
      live_chat_registrar_lance_sistema: {
        Args: { p_auction_id: string; p_amount_cents: number };
        Returns: {
          id: string;
          auction_id: string;
          user_id: string | null;
          username: string;
          message: string;
          is_system_message: boolean;
          created_at: string;
        }[];
      };
    };
  };
}
