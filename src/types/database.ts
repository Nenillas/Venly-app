export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Surplus split percentages on a monthly record. */
export type MonthlyAllocationColumns = {
  alloc_buffer: number | null;
  alloc_avanza: number | null;
  alloc_travel: number | null;
};

export type Database = {
  public: {
    Tables: {
      monthly_records: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          ending_balance: number | null;
          carried_over_balance: number | null;
          created_at: string | null;
          alloc_buffer: number | null;
          alloc_avanza: number | null;
          alloc_travel: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          ending_balance?: number | null;
          carried_over_balance?: number | null;
          created_at?: string | null;
          alloc_buffer?: number | null;
          alloc_avanza?: number | null;
          alloc_travel?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          ending_balance?: number | null;
          carried_over_balance?: number | null;
          created_at?: string | null;
          alloc_buffer?: number | null;
          alloc_avanza?: number | null;
          alloc_travel?: number | null;
        };
        Relationships: [];
      };
      budget_items: {
        Row: {
          id: string;
          user_id: string;
          monthly_record_id: string | null;
          month: string;
          category: string;
          name: string;
          amount: number;
          paid: boolean | null;
          payment_type: string | null;
          is_autogiro: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          monthly_record_id?: string | null;
          month: string;
          category: string;
          name: string;
          amount?: number;
          paid?: boolean | null;
          payment_type?: string | null;
          is_autogiro?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          monthly_record_id?: string | null;
          month?: string;
          category?: string;
          name?: string;
          amount?: number;
          paid?: boolean | null;
          payment_type?: string | null;
          is_autogiro?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type MonthlyRecordRow = Database['public']['Tables']['monthly_records']['Row'];
export type MonthlyRecordInsert = Database['public']['Tables']['monthly_records']['Insert'];
export type MonthlyRecordUpdate = Database['public']['Tables']['monthly_records']['Update'];
