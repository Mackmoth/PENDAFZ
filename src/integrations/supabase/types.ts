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
      announcements: {
        Row: {
          archived_at: string | null
          attachments: Json
          body: string
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          attachments?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          branch_id: string | null
          created_at: string
          department_id: string | null
          event_id: string | null
          id: string
          member_id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          time_in: string | null
        }
        Insert: {
          attendance_date?: string
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          event_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          time_in?: string | null
        }
        Update: {
          attendance_date?: string
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          event_id?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          time_in?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string | null
          status: string
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          contact_person: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          leader_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          cancelled_at: string | null
          event_id: string
          id: string
          member_id: string
          registered_at: string
        }
        Insert: {
          cancelled_at?: string | null
          event_id: string
          id?: string
          member_id: string
          registered_at?: string
        }
        Update: {
          cancelled_at?: string | null
          event_id?: string
          id?: string
          member_id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          branch_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          max_participants: number | null
          organizer_id: string | null
          poster_url: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          max_participants?: number | null
          organizer_id?: string | null
          poster_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          max_participants?: number | null
          organizer_id?: string | null
          poster_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          email: string | null
          id: string
          ip_address: string | null
          os: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      member_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          member_id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name: string
          file_path: string
          id?: string
          member_id: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          member_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          branch_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          education_level: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          joined_at: string
          linked_user_id: string | null
          medical_notes: string | null
          membership_number: string
          national_id: string | null
          nationality: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          qr_token: string
          skills: string | null
          status: Database["public"]["Enums"]["member_status"]
          talents: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          joined_at?: string
          linked_user_id?: string | null
          medical_notes?: string | null
          membership_number: string
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          qr_token?: string
          skills?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          talents?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          joined_at?: string
          linked_user_id?: string | null
          medical_notes?: string | null
          membership_number?: string
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          qr_token?: string
          skills?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          talents?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          address: string | null
          attendance_rules: Json | null
          backup_schedule: string | null
          email: string | null
          financial_year_start: string | null
          id: number
          logo_url: string | null
          membership_fee_amount: number | null
          membership_fee_currency: string | null
          motto: string | null
          name: string
          notification_preferences: Json | null
          phone: string | null
          session_timeout_minutes: number | null
          theme: string
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          attendance_rules?: Json | null
          backup_schedule?: string | null
          email?: string | null
          financial_year_start?: string | null
          id?: number
          logo_url?: string | null
          membership_fee_amount?: number | null
          membership_fee_currency?: string | null
          motto?: string | null
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          session_timeout_minutes?: number | null
          theme?: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          attendance_rules?: Json | null
          backup_schedule?: string | null
          email?: string | null
          financial_year_start?: string | null
          id?: number
          logo_url?: string | null
          membership_fee_amount?: number | null
          membership_fee_currency?: string | null
          motto?: string | null
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          session_timeout_minutes?: number | null
          theme?: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          member_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          period_month: number | null
          period_year: number | null
          receipt_number: string
          recorded_by: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          period_month?: number | null
          period_year?: number | null
          receipt_number: string
          recorded_by?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          period_month?: number | null
          period_year?: number | null
          receipt_number?: string
          recorded_by?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          key: string
          module: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          module: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          avatar_url: string | null
          branch: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          date_joined: string | null
          date_of_birth: string | null
          department: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          avatar_url?: string | null
          branch?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          avatar_url?: string | null
          branch?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_fk"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      responsibilities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_departments: {
        Row: {
          assigned_at: string
          department_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          department_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          department_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted: boolean
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_responsibilities: {
        Row: {
          assigned_at: string
          responsibility_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          responsibility_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          responsibility_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_responsibilities_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "responsibilities"
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
      is_staff: { Args: { _uid: string }; Returns: boolean }
      next_membership_number: { Args: never; Returns: string }
      next_receipt_number: { Args: never; Returns: string }
      user_has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status:
        | "active"
        | "inactive"
        | "suspended"
        | "locked"
        | "pending_verification"
        | "archived"
      announcement_status: "draft" | "scheduled" | "published" | "archived"
      app_role:
        | "super_admin"
        | "admin"
        | "finance_officer"
        | "attendance_officer"
        | "welfare_officer"
        | "secretary"
        | "branch_leader"
        | "department_leader"
        | "member"
      attendance_status: "present" | "absent" | "late" | "excused" | "visitor"
      event_status:
        | "draft"
        | "scheduled"
        | "ongoing"
        | "completed"
        | "cancelled"
      member_status: "active" | "inactive" | "suspended" | "visitor" | "alumni"
      notification_type:
        | "event"
        | "birthday"
        | "payment"
        | "announcement"
        | "attendance"
        | "system"
      payment_method:
        | "cash"
        | "mobile_money"
        | "bank_transfer"
        | "card"
        | "other"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payment_type:
        | "membership_fee"
        | "registration_fee"
        | "donation"
        | "fundraising"
        | "project"
        | "expense"
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
      account_status: [
        "active",
        "inactive",
        "suspended",
        "locked",
        "pending_verification",
        "archived",
      ],
      announcement_status: ["draft", "scheduled", "published", "archived"],
      app_role: [
        "super_admin",
        "admin",
        "finance_officer",
        "attendance_officer",
        "welfare_officer",
        "secretary",
        "branch_leader",
        "department_leader",
        "member",
      ],
      attendance_status: ["present", "absent", "late", "excused", "visitor"],
      event_status: ["draft", "scheduled", "ongoing", "completed", "cancelled"],
      member_status: ["active", "inactive", "suspended", "visitor", "alumni"],
      notification_type: [
        "event",
        "birthday",
        "payment",
        "announcement",
        "attendance",
        "system",
      ],
      payment_method: [
        "cash",
        "mobile_money",
        "bank_transfer",
        "card",
        "other",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payment_type: [
        "membership_fee",
        "registration_fee",
        "donation",
        "fundraising",
        "project",
        "expense",
        "other",
      ],
    },
  },
} as const
