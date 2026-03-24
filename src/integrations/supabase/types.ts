export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_masked: boolean | null
          order_id: string
          original_content: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_masked?: boolean | null
          order_id: string
          original_content?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_masked?: boolean | null
          order_id?: string
          original_content?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_profiles: {
        Row: {
          advance_rate: number | null
          bank_account_number: string | null
          bank_name: string | null
          bio: string | null
          brand_name: string
          commission_rate: number | null
          created_at: string
          id: string
          kitchen_open: boolean | null
          kitchen_verified: boolean | null
          rating: number | null
          specialty_tags: string[] | null
          total_orders: number | null
          user_id: string
        }
        Insert: {
          advance_rate?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          brand_name: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          kitchen_open?: boolean | null
          kitchen_verified?: boolean | null
          rating?: number | null
          specialty_tags?: string[] | null
          total_orders?: number | null
          user_id: string
        }
        Update: {
          advance_rate?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          brand_name?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          kitchen_open?: boolean | null
          kitchen_verified?: boolean | null
          rating?: number | null
          specialty_tags?: string[] | null
          total_orders?: number | null
          user_id?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          category: string | null
          chef_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          prep_time_minutes: number | null
          price: number
        }
        Insert: {
          category?: string | null
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          prep_time_minutes?: number | null
          price: number
        }
        Update: {
          category?: string | null
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dishes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          released_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          released_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          released_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      haggles: {
        Row: {
          buyer_id: string
          buyer_offer_kobo: number | null
          buyer_slider_position: number | null
          chef_counter_kobo: number | null
          chef_id: string
          chef_slider_position: number | null
          created_at: string
          dish_id: string
          expires_at: string
          final_price_kobo: number | null
          id: string
          original_price_kobo: number
          rounds: number | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_offer_kobo?: number | null
          buyer_slider_position?: number | null
          chef_counter_kobo?: number | null
          chef_id: string
          chef_slider_position?: number | null
          created_at?: string
          dish_id: string
          expires_at?: string
          final_price_kobo?: number | null
          id?: string
          original_price_kobo: number
          rounds?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_offer_kobo?: number | null
          buyer_slider_position?: number | null
          chef_counter_kobo?: number | null
          chef_id?: string
          chef_slider_position?: number | null
          created_at?: string
          dish_id?: string
          expires_at?: string
          final_price_kobo?: number | null
          id?: string
          original_price_kobo?: number
          rounds?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haggles_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haggles_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          entry_type: string
          id: string
          transaction_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          entry_type: string
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ledger_splits: {
        Row: {
          chef_advance_kobo: number
          chef_net_kobo: number
          created_at: string
          delivery_fee_kobo: number
          escrow_held_kobo: number
          id: string
          meal_total_kobo: number
          order_id: string
          platform_comm_kobo: number
          platform_fee_kobo: number
          service_fee_kobo: number
          transaction_id: string
          vat_total_kobo: number
        }
        Insert: {
          chef_advance_kobo: number
          chef_net_kobo: number
          created_at?: string
          delivery_fee_kobo: number
          escrow_held_kobo: number
          id?: string
          meal_total_kobo: number
          order_id: string
          platform_comm_kobo: number
          platform_fee_kobo: number
          service_fee_kobo?: number
          transaction_id: string
          vat_total_kobo: number
        }
        Update: {
          chef_advance_kobo?: number
          chef_net_kobo?: number
          created_at?: string
          delivery_fee_kobo?: number
          escrow_held_kobo?: number
          id?: string
          meal_total_kobo?: number
          order_id?: string
          platform_comm_kobo?: number
          platform_fee_kobo?: number
          service_fee_kobo?: number
          transaction_id?: string
          vat_total_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "ledger_splits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          dish_id: string | null
          dish_name: string
          id: string
          order_id: string
          quantity: number | null
          special_instructions: string | null
          unit_price: number
        }
        Insert: {
          dish_id?: string | null
          dish_name: string
          id?: string
          order_id: string
          quantity?: number | null
          special_instructions?: string | null
          unit_price: number
        }
        Update: {
          dish_id?: string | null
          dish_name?: string
          id?: string
          order_id?: string
          quantity?: number | null
          special_instructions?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reviews: {
        Row: {
          buyer_id: string
          chef_id: string
          chef_rating: number
          created_at: string
          id: string
          order_id: string
          review_text: string | null
          rider_id: string | null
          rider_rating: number | null
        }
        Insert: {
          buyer_id: string
          chef_id: string
          chef_rating: number
          created_at?: string
          id?: string
          order_id: string
          review_text?: string | null
          rider_id?: string | null
          rider_rating?: number | null
        }
        Update: {
          buyer_id?: string
          chef_id?: string
          chef_rating?: number
          created_at?: string
          id?: string
          order_id?: string
          review_text?: string | null
          rider_id?: string | null
          rider_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string | null
          chef_id: string | null
          created_at: string
          delivery_address: string
          delivery_fee: number | null
          delivery_landmark: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_pin: string | null
          escrow_amount: number
          id: string
          pin_verified: boolean | null
          platform_fee: number | null
          rider_id: string | null
          scheduled_for: string | null
          status: string | null
          updated_at: string
          vat_amount: number | null
        }
        Insert: {
          buyer_id?: string | null
          chef_id?: string | null
          created_at?: string
          delivery_address: string
          delivery_fee?: number | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_pin?: string | null
          escrow_amount: number
          id?: string
          pin_verified?: boolean | null
          platform_fee?: number | null
          rider_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string
          vat_amount?: number | null
        }
        Update: {
          buyer_id?: string | null
          chef_id?: string | null
          created_at?: string
          delivery_address?: string
          delivery_fee?: number | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_pin?: string | null
          escrow_amount?: number
          id?: string
          pin_verified?: boolean | null
          platform_fee?: number | null
          rider_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_verification_attempts: {
        Row: {
          attempted_pin: string | null
          created_at: string | null
          id: string
          order_id: string
          rider_id: string
          success: boolean | null
        }
        Insert: {
          attempted_pin?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          rider_id: string
          success?: boolean | null
        }
        Update: {
          attempted_pin?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          rider_id?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pin_verification_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_verification_attempts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_requests: {
        Row: {
          created_at: string | null
          idempotency_key: string
          result: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          idempotency_key: string
          result?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          idempotency_key?: string
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biometric_key: string | null
          bvn_verified: boolean | null
          created_at: string
          face_trust_score: number | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          nin_verified: boolean | null
          phone: string
          updated_at: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          biometric_key?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          face_trust_score?: number | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          nin_verified?: boolean | null
          phone: string
          updated_at?: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          biometric_key?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          face_trust_score?: number | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          nin_verified?: boolean | null
          phone?: string
          updated_at?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      rider_profiles: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          earnings_balance: number | null
          id: string
          is_online: boolean | null
          plate_number: string | null
          rating: number | null
          total_deliveries: number | null
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          earnings_balance?: number | null
          id?: string
          is_online?: boolean | null
          plate_number?: string | null
          rating?: number | null
          total_deliveries?: number | null
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          earnings_balance?: number | null
          id?: string
          is_online?: boolean | null
          plate_number?: string | null
          rating?: number | null
          total_deliveries?: number | null
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      steam_shots: {
        Row: {
          chef_id: string
          created_at: string
          dish_id: string | null
          duration_seconds: number | null
          expires_at: string
          id: string
          is_active: boolean | null
          thumbnail_url: string | null
          video_url: string
          view_count: number | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          dish_id?: string | null
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          video_url: string
          view_count?: number | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          dish_id?: string | null
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "steam_shots_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steam_shots_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          last_updated: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          last_updated?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          last_updated?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_secure_delivery_pin: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_order_payment: {
        Args: {
          p_buyer_id: string
          p_chef_id: string
          p_description?: string
          p_idempotency_key: string
          p_order_id: string
          p_total_amount_kobo: number
        }
        Returns: Json
      }
      record_ledger_split: {
        Args: {
          p_delivery_fee_kobo: number
          p_meal_total_kobo: number
          p_order_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      release_escrow_to_chef: {
        Args: {
          p_chef_id: string
          p_escrow_amount_kobo: number
          p_idempotency_key: string
          p_order_id: string
        }
        Returns: Json
      }
      topup_wallet: {
        Args: {
          p_amount_kobo: number
          p_description?: string
          p_idempotency_key: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "buyer" | "chef" | "rider" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["buyer", "chef", "rider", "admin"],
    },
  },
} as const
