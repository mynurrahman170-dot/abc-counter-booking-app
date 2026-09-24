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
      booking_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          booking_id: string | null
          booking_point_id: string | null
          created_at: string
          details: Json
          id: string
          trip_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          booking_id?: string | null
          booking_point_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          trip_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          booking_id?: string | null
          booking_point_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          trip_id?: string | null
        }
        Relationships: []
      }
      booking_points: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          name: string
          phone: string | null
          point_type: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          point_type?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          point_type?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_id: string
          entity_type: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          trip_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trip_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trip_id?: string | null
        }
        Relationships: []
      }
      credential_requests: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          login_id: string | null
          message: string | null
          name: string
          phone: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          login_id?: string | null
          message?: string | null
          name: string
          phone?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          login_id?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          booking_point_id: string | null
          created_at: string
          email: string | null
          id: string
          login_id: string | null
          name: string
        }
        Insert: {
          booking_point_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          login_id?: string | null
          name?: string
        }
        Update: {
          booking_point_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          login_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_booking_point_id_fkey"
            columns: ["booking_point_id"]
            isOneToOne: false
            referencedRelation: "booking_points"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_settings: {
        Row: {
          code_hash: string
          id: boolean
          updated_at: string
        }
        Insert: {
          code_hash: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          code_hash?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          created_by: string | null
          from_place: string | null
          id: string
          name: string
          note: string | null
          to_place: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_place?: string | null
          id?: string
          name: string
          note?: string | null
          to_place?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_place?: string | null
          id?: string
          name?: string
          note?: string | null
          to_place?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          booking_point_id: string | null
          created_at: string
          created_by: string | null
          departure_date: string
          departure_time: string
          fare: number
          id: string
          note: string | null
          route: string
          seats_available: number
          status: string
          supervisor_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          booking_point_id?: string | null
          created_at?: string
          created_by?: string | null
          departure_date: string
          departure_time: string
          fare?: number
          id?: string
          note?: string | null
          route: string
          seats_available?: number
          status?: string
          supervisor_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          booking_point_id?: string | null
          created_at?: string
          created_by?: string | null
          departure_date?: string
          departure_time?: string
          fare?: number
          id?: string
          note?: string | null
          route?: string
          seats_available?: number
          status?: string
          supervisor_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_booking_point_id_fkey"
            columns: ["booking_point_id"]
            isOneToOne: false
            referencedRelation: "booking_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "supervisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_bookings: {
        Row: {
          amount: number
          booking_point_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          fare_per_seat: number
          id: string
          note: string | null
          passenger_name: string | null
          passenger_phone: string | null
          seat_numbers: string[]
          status: string
          ticket_no: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_point_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          fare_per_seat?: number
          id?: string
          note?: string | null
          passenger_name?: string | null
          passenger_phone?: string | null
          seat_numbers?: string[]
          status?: string
          ticket_no?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_point_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          fare_per_seat?: number
          id?: string
          note?: string | null
          passenger_name?: string | null
          passenger_phone?: string | null
          seat_numbers?: string[]
          status?: string
          ticket_no?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_bookings_booking_point_id_fkey"
            columns: ["booking_point_id"]
            isOneToOne: false
            referencedRelation: "booking_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisors: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      trip_seat_locks: {
        Row: {
          booking_id: string
          booking_point_id: string | null
          created_at: string
          seat_number: string
          trip_id: string
        }
        Insert: {
          booking_id: string
          booking_point_id?: string | null
          created_at?: string
          seat_number: string
          trip_id: string
        }
        Update: {
          booking_id?: string
          booking_point_id?: string | null
          created_at?: string
          seat_number?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_seat_locks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "seat_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_seat_locks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          created_by: string | null
          departure_date: string
          departure_time: string
          fare: number
          id: string
          master_point_id: string | null
          route: string | null
          route_id: string | null
          schedule_id: string | null
          supervisor_id: string | null
          total_seats: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          departure_date?: string
          departure_time: string
          fare?: number
          id?: string
          master_point_id?: string | null
          route?: string | null
          route_id?: string | null
          schedule_id?: string | null
          supervisor_id?: string | null
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          departure_date?: string
          departure_time?: string
          fare?: number
          id?: string
          master_point_id?: string | null
          route?: string | null
          route_id?: string | null
          schedule_id?: string | null
          supervisor_id?: string | null
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_master_point_id_fkey"
            columns: ["master_point_id"]
            isOneToOne: false
            referencedRelation: "booking_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "supervisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      vehicles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          seat_count: number
          vehicle_group: string | null
          vehicle_number: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          seat_count?: number
          vehicle_group?: string | null
          vehicle_number: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          seat_count?: number
          vehicle_group?: string | null
          vehicle_number?: string
          vehicle_type?: string | null
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
      is_master_point: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_booking_point: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "master_admin" | "moderator" | "booking_point"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["master_admin", "moderator", "booking_point"],
    },
  },
} as const
