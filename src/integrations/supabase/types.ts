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
      budgets: {
        Row: {
          category: string
          couple_id: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
        }
        Insert: {
          category: string
          couple_id: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
        }
        Update: {
          category?: string
          couple_id?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string | null
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          location: string | null
          recurrence: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          recurrence?: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          recurrence?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          anniversary_date: string | null
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          couple_id: string
          created_at: string
          icon: string | null
          id: string
          kind: string
          name: string
        }
        Insert: {
          color?: string | null
          couple_id: string
          created_at?: string
          icon?: string | null
          id?: string
          kind: string
          name: string
        }
        Update: {
          color?: string | null
          couple_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string | null
          couple_id: string
          created_at: string
          created_by: string
          currency: string
          id: string
          kind: string
          note: string | null
          occurred_on: string
        }
        Insert: {
          amount: number
          category?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          kind: string
          note?: string | null
          occurred_on?: string
        }
        Update: {
          amount?: number
          category?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          kind?: string
          note?: string | null
          occurred_on?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          completed: boolean
          couple_id: string
          created_at: string
          goal_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          completed?: boolean
          couple_id: string
          created_at?: string
          goal_id: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          completed?: boolean
          couple_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          progress: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_events: {
        Row: {
          couple_id: string
          event_type: string
          id: string
          occurred_at: string
          place_id: string | null
          place_name: string | null
          user_id: string
        }
        Insert: {
          couple_id: string
          event_type: string
          id?: string
          occurred_at?: string
          place_id?: string | null
          place_name?: string | null
          user_id: string
        }
        Update: {
          couple_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          place_id?: string | null
          place_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      location_settings: {
        Row: {
          arrival_notify: boolean
          created_at: string
          departure_notify: boolean
          share_mode: string
          share_until: string | null
          sharing_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_notify?: boolean
          created_at?: string
          departure_notify?: boolean
          share_mode?: string
          share_until?: string | null
          sharing_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_notify?: boolean
          created_at?: string
          departure_notify?: boolean
          share_mode?: string
          share_until?: string | null
          sharing_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          accuracy: number | null
          battery: number | null
          couple_id: string
          heading: number | null
          lat: number
          lng: number
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          battery?: number | null
          couple_id: string
          heading?: number | null
          lat: number
          lng: number
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          battery?: number | null
          couple_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          caption: string | null
          category: string | null
          couple_id: string
          created_at: string
          id: string
          image_url: string
          media_type: string
          memory_date: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploaded_by: string
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          couple_id: string
          created_at?: string
          id?: string
          image_url: string
          media_type?: string
          memory_date?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by: string
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          image_url?: string
          media_type?: string
          memory_date?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_categories: {
        Row: {
          color: string | null
          couple_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          couple_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          couple_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      memory_favorites: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          memory_id: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          memory_id: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          memory_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          couple_id: string
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          couple_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          couple_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_motivation_enabled: boolean
          in_app_enabled: boolean
          push_enabled: boolean
          reminders_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_motivation_enabled?: boolean
          in_app_enabled?: boolean
          push_enabled?: boolean
          reminders_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_motivation_enabled?: boolean
          in_app_enabled?: boolean
          push_enabled?: boolean
          reminders_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          couple_id: string | null
          created_at: string
          display_name: string | null
          id: string
          invite_code: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          invite_code?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invite_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_fk"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          active: boolean
          body: string | null
          couple_id: string
          created_at: string
          created_by: string
          due_at: string
          id: string
          last_fired_at: string | null
          recurrence: string
          reminder_type: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          due_at: string
          id?: string
          last_fired_at?: string | null
          recurrence?: string
          reminder_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          due_at?: string
          id?: string
          last_fired_at?: string | null
          recurrence?: string
          reminder_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          lat: number
          lng: number
          name: string
          radius_m: number
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          lat: number
          lng: number
          name: string
          radius_m?: number
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          lat?: number
          lng?: number
          name?: string
          radius_m?: number
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          currency: string
          current_amount: number
          deadline: string | null
          id: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_couple: {
        Args: { _anniversary: string; _name: string }
        Returns: string
      }
      is_sharing_active: { Args: { _user: string }; Returns: boolean }
      pair_with_code: { Args: { _code: string }; Returns: string }
      user_couple_id: { Args: { _user: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
