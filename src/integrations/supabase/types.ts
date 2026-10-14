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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anticheat_files: {
        Row: {
          file_path: string
          file_size: number
          filename: string
          id: string
          is_active: boolean | null
          uploaded_at: string
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          file_path: string
          file_size: number
          filename: string
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      bans: {
        Row: {
          banned_by: string | null
          created_at: string | null
          exempted_by_server: string[] | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          mode: string | null
          player_id: string
          player_name: string | null
          reason: string
          server_id: string
          type: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          exempted_by_server?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mode?: string | null
          player_id: string
          player_name?: string | null
          reason: string
          server_id: string
          type?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          exempted_by_server?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mode?: string | null
          player_id?: string
          player_name?: string | null
          reason?: string
          server_id?: string
          type?: string | null
        }
        Relationships: []
      }
      blacklisted_discord_servers: {
        Row: {
          added_at: string
          added_by: string | null
          discord_server_id: string
          id: string
          reason: string | null
          server_name: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          discord_server_id: string
          id?: string
          reason?: string | null
          server_name?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          discord_server_id?: string
          id?: string
          reason?: string | null
          server_name?: string | null
        }
        Relationships: []
      }
      blacklisted_proofs: {
        Row: {
          id: number
          proof_url: string | null
          server_name: string | null
          user_id: number | null
        }
        Insert: {
          id?: number
          proof_url?: string | null
          server_name?: string | null
          user_id?: number | null
        }
        Update: {
          id?: number
          proof_url?: string | null
          server_name?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blacklisted_proofs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "blacklisted_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklisted_users: {
        Row: {
          added_at: string | null
          banned_by: string | null
          discord_id: string
          discord_tag: string | null
          id: number
          last_ban_date: string | null
          reason: string | null
          username: string | null
        }
        Insert: {
          added_at?: string | null
          banned_by?: string | null
          discord_id: string
          discord_tag?: string | null
          id?: number
          last_ban_date?: string | null
          reason?: string | null
          username?: string | null
        }
        Update: {
          added_at?: string | null
          banned_by?: string | null
          discord_id?: string
          discord_tag?: string | null
          id?: number
          last_ban_date?: string | null
          reason?: string | null
          username?: string | null
        }
        Relationships: []
      }
      bot_staff_access: {
        Row: {
          admin_id: string | null
          id: number
          server_custom_id: string | null
        }
        Insert: {
          admin_id?: string | null
          id?: number
          server_custom_id?: string | null
        }
        Update: {
          admin_id?: string | null
          id?: number
          server_custom_id?: string | null
        }
        Relationships: []
      }
      consoles: {
        Row: {
          created_at: string | null
          id: string
          logs: Json | null
          server_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logs?: Json | null
          server_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logs?: Json | null
          server_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_commands: {
        Row: {
          command_data: Json
          command_type: string
          created_at: string | null
          executed_at: string | null
          id: string
          result: Json | null
          server_id: string
          status: string | null
        }
        Insert: {
          command_data: Json
          command_type: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          server_id: string
          status?: string | null
        }
        Update: {
          command_data?: Json
          command_type?: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          server_id?: string
          status?: string | null
        }
        Relationships: []
      }
      discord_users: {
        Row: {
          avatar: string | null
          bio: string | null
          connected_at: string | null
          discord_id: string
          display_name: string | null
          email: string | null
          funds: number | null
          guilds: Json | null
          username: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          connected_at?: string | null
          discord_id: string
          display_name?: string | null
          email?: string | null
          funds?: number | null
          guilds?: Json | null
          username?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          connected_at?: string | null
          discord_id?: string
          display_name?: string | null
          email?: string | null
          funds?: number | null
          guilds?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          created_at: string
          id: string
          message: string
          rating: number
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          rating: number
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          rating?: number
          user_name?: string
        }
        Relationships: []
      }
      kicks: {
        Row: {
          created_at: string | null
          id: string
          kicked_by: string | null
          metadata: Json | null
          mode: string | null
          player_id: string
          player_name: string | null
          reason: string
          server_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kicked_by?: string | null
          metadata?: Json | null
          mode?: string | null
          player_id: string
          player_name?: string | null
          reason: string
          server_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kicked_by?: string | null
          metadata?: Json | null
          mode?: string | null
          player_id?: string
          player_name?: string | null
          reason?: string
          server_id?: string
          type?: string | null
        }
        Relationships: []
      }
      live_monitor_frames: {
        Row: {
          frame_data: string
          player_id: string
          player_name: string | null
          server_id: string
          updated_at: string
        }
        Insert: {
          frame_data: string
          player_id: string
          player_name?: string | null
          server_id: string
          updated_at?: string
        }
        Update: {
          frame_data?: string
          player_id?: string
          player_name?: string | null
          server_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          created_at: string
          display_order: number | null
          discord_url: string | null
          id: string
          logo_url: string
          partner_name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          discord_url?: string | null
          id?: string
          logo_url: string
          partner_name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          discord_url?: string | null
          id?: string
          logo_url?: string
          partner_name?: string
        }
        Relationships: []
      }
      players_snapshots: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          server_id: string
          snapshot: Json
          total_players: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          server_id: string
          snapshot: Json
          total_players?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          server_id?: string
          snapshot?: Json
          total_players?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          display_order: number | null
          duration: string
          features: Json | null
          id: string
          is_active: boolean | null
          plan_name: string
          plan_subtitle: string | null
          price: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          duration: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          plan_subtitle?: string | null
          price: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          duration?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          plan_subtitle?: string | null
          price?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          funds: number
          id: string
          uses_remaining: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          funds?: number
          id?: string
          uses_remaining?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          funds?: number
          id?: string
          uses_remaining?: number
        }
        Relationships: []
      }
      redeem_redemptions: {
        Row: {
          code_id: string
          discord_id: string
          id: string
          redeemed_at: string
        }
        Insert: {
          code_id: string
          discord_id: string
          id?: string
          redeemed_at?: string
        }
        Update: {
          code_id?: string
          discord_id?: string
          id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "redeem_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          player_id: string | null
          player_name: string | null
          reason: string | null
          server_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          player_name?: string | null
          reason?: string | null
          server_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          player_name?: string | null
          reason?: string | null
          server_id?: string
        }
        Relationships: []
      }
      server_admins: {
        Row: {
          added_at: string | null
          id: string
          permissions: Json | null
          server_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          permissions?: Json | null
          server_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          permissions?: Json | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_admins_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["server_id"]
          },
        ]
      }
      server_resources: {
        Row: {
          created_at: string | null
          id: string
          resources: Json
          server_id: string
          total_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          resources?: Json
          server_id: string
          total_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resources?: Json
          server_id?: string
          total_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      server_settings: {
        Row: {
          anti_blackwords: string[] | null
          anti_objects: string[] | null
          created_at: string | null
          discord_webhook: string | null
          id: string
          server_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          anti_blackwords?: string[] | null
          anti_objects?: string[] | null
          created_at?: string | null
          discord_webhook?: string | null
          id?: string
          server_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          anti_blackwords?: string[] | null
          anti_objects?: string[] | null
          created_at?: string | null
          discord_webhook?: string | null
          id?: string
          server_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      servers: {
        Row: {
          ban_count: number | null
          created_at: string
          display_name: string | null
          expires_at: string | null
          id: string
          last_update: string | null
          license_key: string
          owner_email: string | null
          server_id: string
          server_ip: string | null
          status: string | null
        }
        Insert: {
          ban_count?: number | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          id?: string
          last_update?: string | null
          license_key: string
          owner_email?: string | null
          server_id: string
          server_ip?: string | null
          status?: string | null
        }
        Update: {
          ban_count?: number | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          id?: string
          last_update?: string | null
          license_key?: string
          owner_email?: string | null
          server_id?: string
          server_ip?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warns: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          mode: string | null
          player_id: string
          player_name: string | null
          server_id: string
          type: string | null
          warned_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          mode?: string | null
          player_id: string
          player_name?: string | null
          server_id: string
          type?: string | null
          warned_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          mode?: string | null
          player_id?: string
          player_name?: string | null
          server_id?: string
          type?: string | null
          warned_by?: string | null
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
      app_role: "owner" | "admin" | "user"
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
      app_role: ["owner", "admin", "user"],
    },
  },
} as const
