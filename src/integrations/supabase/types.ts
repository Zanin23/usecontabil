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
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          default_voice_id: string
          id: boolean
          onboarded_at: string | null
          updated_at: string
          voice_mode: string
        }
        Insert: {
          default_voice_id?: string
          id?: boolean
          onboarded_at?: string | null
          updated_at?: string
          voice_mode?: string
        }
        Update: {
          default_voice_id?: string
          id?: boolean
          onboarded_at?: string | null
          updated_at?: string
          voice_mode?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          atividade: string
          cnpj: string
          created_at: string
          id: string
          raw: Json
          razao: string
          regime: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atividade?: string
          cnpj?: string
          created_at?: string
          id: string
          raw?: Json
          razao?: string
          regime?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atividade?: string
          cnpj?: string
          created_at?: string
          id?: string
          raw?: Json
          razao?: string
          regime?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_docs: {
        Row: {
          content: string
          id: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          licao_slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          licao_slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          licao_slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      role_plays: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          difficulty_overlays: Json
          id: string
          is_published: boolean
          name: string
          opening_line: string
          persona: Json
          role: string
          scenario_brief: string
          scorecard: Json
          slug: string
          system_prompt: string
          topic: string
          updated_at: string
          use_elevenlabs_agent: boolean
          visibility: string
          voice_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          difficulty_overlays?: Json
          id?: string
          is_published?: boolean
          name: string
          opening_line?: string
          persona?: Json
          role?: string
          scenario_brief?: string
          scorecard?: Json
          slug: string
          system_prompt?: string
          topic?: string
          updated_at?: string
          use_elevenlabs_agent?: boolean
          visibility?: string
          voice_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          difficulty_overlays?: Json
          id?: string
          is_published?: boolean
          name?: string
          opening_line?: string
          persona?: Json
          role?: string
          scenario_brief?: string
          scorecard?: Json
          slug?: string
          system_prompt?: string
          topic?: string
          updated_at?: string
          use_elevenlabs_agent?: boolean
          visibility?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          agent_id: string | null
          coaching_summary: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds: number | null
          ended_at: string | null
          green_flags: string[] | null
          id: string
          live_scores: Json | null
          parent_session_id: string | null
          red_flags: string[] | null
          rehearsal_context: Json | null
          rehearsal_dimension: string | null
          role_play_id: string | null
          scores: Json | null
          self_assessment: Json | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          total_score: number | null
          transcript: Json | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          coaching_summary?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds?: number | null
          ended_at?: string | null
          green_flags?: string[] | null
          id?: string
          live_scores?: Json | null
          parent_session_id?: string | null
          red_flags?: string[] | null
          rehearsal_context?: Json | null
          rehearsal_dimension?: string | null
          role_play_id?: string | null
          scores?: Json | null
          self_assessment?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_score?: number | null
          transcript?: Json | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          coaching_summary?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds?: number | null
          ended_at?: string | null
          green_flags?: string[] | null
          id?: string
          live_scores?: Json | null
          parent_session_id?: string | null
          red_flags?: string[] | null
          rehearsal_context?: Json | null
          rehearsal_dimension?: string | null
          role_play_id?: string | null
          scores?: Json | null
          self_assessment?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_score?: number | null
          transcript?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_role_play_id_fkey"
            columns: ["role_play_id"]
            isOneToOne: false
            referencedRelation: "role_plays"
            referencedColumns: ["id"]
          },
        ]
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
      user_state: {
        Row: {
          last_seen_at: string
          streak_days: number
          streak_last_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          streak_days?: number
          streak_last_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          streak_days?: number
          streak_last_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          cargo: string
          criado_em: string
          duplo_fator: boolean
          email: string
          id: string
          nome: string
          observacao: string | null
          perfil: string
          permissoes: Json
          situacao: string
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: string
          criado_em?: string
          duplo_fator?: boolean
          email: string
          id?: string
          nome?: string
          observacao?: string | null
          perfil?: string
          permissoes?: Json
          situacao?: string
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: string
          criado_em?: string
          duplo_fator?: boolean
          email?: string
          id?: string
          nome?: string
          observacao?: string | null
          perfil?: string
          permissoes?: Json
          situacao?: string
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: { Args: { _email: string }; Returns: string }
      admin_list_users: {
        Args: never
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      claim_admin_if_unclaimed: { Args: never; Returns: boolean }
      has_any_admin: { Args: never; Returns: boolean }
      has_elevenlabs_key: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      role_play_leaderboard: {
        Args: { _limit?: number; _role_play_id: string }
        Returns: {
          difficulty: string
          display_name: string
          duration_seconds: number
          ended_at: string
          session_id: string
          total_score: number
          user_id: string
        }[]
      }
      role_play_popularity: {
        Args: never
        Returns: {
          role_play_id: string
          sessions_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
      difficulty_level: "easy" | "standard" | "hard"
      session_status:
        | "in_progress"
        | "completed"
        | "scored"
        | "abandoned"
        | "rehearsed"
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
      app_role: ["admin"],
      difficulty_level: ["easy", "standard", "hard"],
      session_status: [
        "in_progress",
        "completed",
        "scored",
        "abandoned",
        "rehearsed",
      ],
    },
  },
} as const
