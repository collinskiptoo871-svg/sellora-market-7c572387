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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          share_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          share_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          share_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          product_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          product_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          product_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          confirmation_code: string | null
          created_at: string
          currency: string
          description: string
          id: string
          merchant_reference: string
          metadata: Json
          payment_method: string | null
          pesapal_tracking_id: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          raw_status_response: Json | null
          redirect_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmation_code?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          merchant_reference: string
          metadata?: Json
          payment_method?: string | null
          pesapal_tracking_id?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          raw_status_response?: Json | null
          redirect_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmation_code?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          merchant_reference?: string
          metadata?: Json
          payment_method?: string | null
          pesapal_tracking_id?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          raw_status_response?: Json | null
          redirect_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pesapal_config: {
        Row: {
          environment: string
          id: number
          ipn_id: string | null
          ipn_url: string | null
          updated_at: string
        }
        Insert: {
          environment?: string
          id?: number
          ipn_id?: string | null
          ipn_url?: string | null
          updated_at?: string
        }
        Update: {
          environment?: string
          id?: number
          ipn_id?: string | null
          ipn_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          boosted: boolean
          category: string
          condition: Database["public"]["Enums"]["product_condition"]
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          location: string | null
          photos: string[]
          price: number
          seller_id: string
          shipping_available: boolean
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          boosted?: boolean
          category: string
          condition?: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[]
          price: number
          seller_id: string
          shipping_available?: boolean
          status?: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          boosted?: boolean
          category?: string
          condition?: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[]
          price?: number
          seller_id?: string
          shipping_available?: boolean
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_response_minutes: number
          banner_url: string | null
          bio: string | null
          blocked_users: string[]
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          response_rate: number
          shop_description: string | null
          updated_at: string
          user_id: string
          verified: boolean
          warning_level: string
        }
        Insert: {
          avatar_url?: string | null
          avg_response_minutes?: number
          banner_url?: string | null
          bio?: string | null
          blocked_users?: string[]
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          response_rate?: number
          shop_description?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          warning_level?: string
        }
        Update: {
          avatar_url?: string | null
          avg_response_minutes?: number
          banner_url?: string | null
          bio?: string | null
          blocked_users?: string[]
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          response_rate?: number
          shop_description?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          warning_level?: string
        }
        Relationships: []
      }
      recent_searches: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved: boolean
          severity: number
          target_product_id: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved?: boolean
          severity?: number
          target_product_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved?: boolean
          severity?: number
          target_product_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          allow_messages: boolean
          created_at: string
          language: string
          read_receipts: boolean
          region: string
          show_location: boolean
          show_online: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_messages?: boolean
          created_at?: string
          language?: string
          read_receipts?: boolean
          region?: string
          show_location?: boolean
          show_online?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_messages?: boolean
          created_at?: string
          language?: string
          read_receipts?: boolean
          region?: string
          show_location?: boolean
          show_online?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      notification_category: "messages" | "product" | "account" | "promotions"
      payment_purpose:
        | "boost_product"
        | "verification"
        | "subscription"
        | "other"
      payment_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
        | "reversed"
      product_condition: "new" | "like_new" | "used" | "refurbished"
      product_status: "active" | "archived" | "sold" | "deleted"
      report_reason:
        | "misleading"
        | "counterfeit"
        | "scam"
        | "inappropriate"
        | "other"
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
      app_role: ["admin", "moderator", "user"],
      notification_category: ["messages", "product", "account", "promotions"],
      payment_purpose: [
        "boost_product",
        "verification",
        "subscription",
        "other",
      ],
      payment_status: [
        "pending",
        "completed",
        "failed",
        "cancelled",
        "reversed",
      ],
      product_condition: ["new", "like_new", "used", "refurbished"],
      product_status: ["active", "archived", "sold", "deleted"],
      report_reason: [
        "misleading",
        "counterfeit",
        "scam",
        "inappropriate",
        "other",
      ],
    },
  },
} as const
