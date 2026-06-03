export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          category: string | null
          icon: string | null
          id: number
          name_ar: string | null
          name_en: string | null
          name_fr: string | null
          slug: string
        }
        Insert: {
          category?: string | null
          icon?: string | null
          id: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          slug: string
        }
        Update: {
          category?: string | null
          icon?: string | null
          id?: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          slug?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"] | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          ip: string | null
          reason: string | null
          reason_code: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          ip?: string | null
          reason?: string | null
          reason_code?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          ip?: string | null
          reason?: string | null
          reason_code?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          closed_to_arrival: boolean
          closed_to_departure: boolean
          date: string
          id: string
          is_closed: boolean
          max_stay: number | null
          min_stay: number | null
          price_override_dzd: number | null
          room_type_id: string
          source: string
          units_open: number
          updated_at: string
        }
        Insert: {
          closed_to_arrival?: boolean
          closed_to_departure?: boolean
          date: string
          id?: string
          is_closed?: boolean
          max_stay?: number | null
          min_stay?: number | null
          price_override_dzd?: number | null
          room_type_id: string
          source?: string
          units_open: number
          updated_at?: string
        }
        Update: {
          closed_to_arrival?: boolean
          closed_to_departure?: boolean
          date?: string
          id?: string
          is_closed?: boolean
          max_stay?: number | null
          min_stay?: number | null
          price_override_dzd?: number | null
          room_type_id?: string
          source?: string
          units_open?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          cancellation_reason: string | null
          cancellation_tier: Database["public"]["Enums"]["cancellation_tier"]
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string
          check_out: string
          checked_in_at: string | null
          children: number
          cleaning_fee_dzd: number
          code: string
          commission_amount_dzd: number
          commission_bps: number
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          discount_dzd: number
          extra_guest_fee_dzd: number
          guest_id: string
          host_payout_dzd: number
          host_profile_id: string
          id: string
          is_single_unit: boolean
          nightly_subtotal_dzd: number
          nights: number | null
          payment_deadline: string | null
          property_id: string
          refund_amount_dzd: number
          room_type_id: string
          service_fee_dzd: number
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stay_range: unknown
          total_dzd: number
          units: number
          updated_at: string
        }
        Insert: {
          adults?: number
          cancellation_reason?: string | null
          cancellation_tier: Database["public"]["Enums"]["cancellation_tier"]
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in: string
          check_out: string
          checked_in_at?: string | null
          children?: number
          cleaning_fee_dzd?: number
          code: string
          commission_amount_dzd?: number
          commission_bps: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount_dzd?: number
          extra_guest_fee_dzd?: number
          guest_id: string
          host_payout_dzd?: number
          host_profile_id: string
          id?: string
          is_single_unit?: boolean
          nightly_subtotal_dzd: number
          nights?: number | null
          payment_deadline?: string | null
          property_id: string
          refund_amount_dzd?: number
          room_type_id: string
          service_fee_dzd?: number
          special_requests?: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stay_range?: unknown
          total_dzd: number
          units?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          cancellation_reason?: string | null
          cancellation_tier?: Database["public"]["Enums"]["cancellation_tier"]
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          children?: number
          cleaning_fee_dzd?: number
          code?: string
          commission_amount_dzd?: number
          commission_bps?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount_dzd?: number
          extra_guest_fee_dzd?: number
          guest_id?: string
          host_payout_dzd?: number
          host_profile_id?: string
          id?: string
          is_single_unit?: boolean
          nightly_subtotal_dzd?: number
          nights?: number | null
          payment_deadline?: string | null
          property_id?: string
          refund_amount_dzd?: number
          room_type_id?: string
          service_fee_dzd?: number
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stay_range?: unknown
          total_dzd?: number
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancellation_tier_fkey"
            columns: ["cancellation_tier"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string | null
          partial_until_hours: number | null
          refund_full_until_hours: number
          refund_partial_pct: number
          service_fee_refundable: boolean
          tier: Database["public"]["Enums"]["cancellation_tier"]
        }
        Insert: {
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          partial_until_hours?: number | null
          refund_full_until_hours: number
          refund_partial_pct: number
          service_fee_refundable?: boolean
          tier: Database["public"]["Enums"]["cancellation_tier"]
        }
        Update: {
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          partial_until_hours?: number | null
          refund_full_until_hours?: number
          refund_partial_pct?: number
          service_fee_refundable?: boolean
          tier?: Database["public"]["Enums"]["cancellation_tier"]
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          property_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          property_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          property_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "featured_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          id: number
          name_ar: string | null
          name_en: string | null
          name_fr: string | null
          post_code: string | null
          wilaya_code: number
        }
        Insert: {
          id: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          post_code?: string | null
          wilaya_code: number
        }
        Update: {
          id?: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          post_code?: string | null
          wilaya_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "communes_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          guest_id: string
          host_profile_id: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          property_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          guest_id: string
          host_profile_id: string
          id?: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          property_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          guest_id?: string
          host_profile_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          body: string | null
          created_at: string
          dispute_id: string
          evidence_path: string | null
          id: string
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dispute_id: string
          evidence_path?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dispute_id?: string
          evidence_path?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          against: string | null
          booking_id: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at: string
          description: string | null
          id: string
          opened_by: string
          refund_amount_dzd: number
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          against?: string | null
          booking_id: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          description?: string | null
          id?: string
          opened_by: string
          refund_amount_dzd?: number
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          against?: string | null
          booking_id?: string
          category?: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string
          refund_amount_dzd?: number
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_against_fkey"
            columns: ["against"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_collections: {
        Row: {
          cover_photo_path: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          starts_at: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          subtitle_fr: string | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          cover_photo_path?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          cover_photo_path?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      home_rails: {
        Row: {
          collection_id: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string
          kind: Database["public"]["Enums"]["rail_kind"]
          sort_order: number
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
          wilaya_code: number | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          kind: Database["public"]["Enums"]["rail_kind"]
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
          wilaya_code?: number | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          kind?: Database["public"]["Enums"]["rail_kind"]
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
          wilaya_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "home_rails_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "featured_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_rails_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      host_profiles: {
        Row: {
          bio_ar: string | null
          bio_en: string | null
          bio_fr: string | null
          commission_bps_override: number | null
          created_at: string
          display_name: string
          id: string
          id_doc_path: string | null
          id_doc_type: string | null
          identity_status: Database["public"]["Enums"]["verification_status"]
          kind: Database["public"]["Enums"]["host_kind"]
          legal_name: string | null
          nif: string | null
          owner_id: string
          payout_method: string | null
          payout_rib: string | null
          payout_status: Database["public"]["Enums"]["verification_status"]
          rc_number: string | null
          updated_at: string
        }
        Insert: {
          bio_ar?: string | null
          bio_en?: string | null
          bio_fr?: string | null
          commission_bps_override?: number | null
          created_at?: string
          display_name: string
          id?: string
          id_doc_path?: string | null
          id_doc_type?: string | null
          identity_status?: Database["public"]["Enums"]["verification_status"]
          kind: Database["public"]["Enums"]["host_kind"]
          legal_name?: string | null
          nif?: string | null
          owner_id: string
          payout_method?: string | null
          payout_rib?: string | null
          payout_status?: Database["public"]["Enums"]["verification_status"]
          rc_number?: string | null
          updated_at?: string
        }
        Update: {
          bio_ar?: string | null
          bio_en?: string | null
          bio_fr?: string | null
          commission_bps_override?: number | null
          created_at?: string
          display_name?: string
          id?: string
          id_doc_path?: string | null
          id_doc_type?: string | null
          identity_status?: Database["public"]["Enums"]["verification_status"]
          kind?: Database["public"]["Enums"]["host_kind"]
          legal_name?: string | null
          nif?: string | null
          owner_id?: string
          payout_method?: string | null
          payout_rib?: string | null
          payout_status?: Database["public"]["Enums"]["verification_status"]
          rc_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hotel_staff: {
        Row: {
          accepted_at: string | null
          created_at: string
          host_profile_id: string
          id: string
          invite_token: string | null
          invited_at: string | null
          is_active: boolean
          staff_role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          host_profile_id: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          is_active?: boolean
          staff_role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          host_profile_id?: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          is_active?: boolean
          staff_role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_staff_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_staff_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
        ]
      }
      inventory_holds: {
        Row: {
          booking_id: string
          created_at: string
          date_from: string
          date_to: string
          expires_at: string
          id: string
          room_type_id: string
          status: Database["public"]["Enums"]["hold_status"]
          units: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          date_from: string
          date_to: string
          expires_at: string
          id?: string
          room_type_id: string
          status?: Database["public"]["Enums"]["hold_status"]
          units?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          date_from?: string
          date_to?: string
          expires_at?: string
          id?: string
          room_type_id?: string
          status?: Database["public"]["Enums"]["hold_status"]
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          body_fr: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          sent_push: boolean
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          type: string
          user_id: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          body_fr?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          sent_push?: boolean
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          type: string
          user_id: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          body_fr?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          sent_push?: boolean
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_items: {
        Row: {
          booking_id: string
          net_dzd: number
          payout_id: string
        }
        Insert: {
          booking_id: string
          net_dzd: number
          payout_id: string
        }
        Update: {
          booking_id?: string
          net_dzd?: number
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          commission_amount_dzd: number
          created_at: string
          currency: string
          destination_rib: string | null
          failure_reason: string | null
          gross_dzd: number
          host_profile_id: string
          id: string
          method: string | null
          net_dzd: number
          paid_at: string | null
          period_end: string
          period_start: string
          reference: string | null
          statement_path: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          commission_amount_dzd: number
          created_at?: string
          currency?: string
          destination_rib?: string | null
          failure_reason?: string | null
          gross_dzd: number
          host_profile_id: string
          id?: string
          method?: string | null
          net_dzd: number
          paid_at?: string | null
          period_end: string
          period_start: string
          reference?: string | null
          statement_path?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          commission_amount_dzd?: number
          created_at?: string
          currency?: string
          destination_rib?: string | null
          failure_reason?: string | null
          gross_dzd?: number
          host_profile_id?: string
          id?: string
          method?: string | null
          net_dzd?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          reference?: string | null
          statement_path?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_bps: number
          feature_flags: Json
          geo_fuzz_meters: number
          id: number
          payment_window_minutes: number
          payout_hold_hours: number
          payout_period: string
          request_expiry_hours: number
          updated_at: string
        }
        Insert: {
          commission_bps?: number
          feature_flags?: Json
          geo_fuzz_meters?: number
          id?: number
          payment_window_minutes?: number
          payout_hold_hours?: number
          payout_period?: string
          request_expiry_hours?: number
          updated_at?: string
        }
        Update: {
          commission_bps?: number
          feature_flags?: Json
          geo_fuzz_meters?: number
          id?: number
          payment_window_minutes?: number
          payout_hold_hours?: number
          payout_period?: string
          request_expiry_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          default_wilaya_code: number | null
          display_name: string
          full_name: string | null
          id: string
          is_active: boolean
          phone_e164: string | null
          phone_verified_at: string | null
          preferred_locale: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          default_wilaya_code?: number | null
          display_name: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone_e164?: string | null
          phone_verified_at?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          default_wilaya_code?: number | null
          display_name?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone_e164?: string | null
          phone_verified_at?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_wilaya_code_fkey"
            columns: ["default_wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      promo_banners: {
        Row: {
          body_ar: string | null
          body_en: string | null
          body_fr: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_path: string
          is_active: boolean
          sort_order: number
          starts_at: string | null
          target_url: string | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          body_fr?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          target_url?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          body_fr?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          target_url?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line: string | null
          approved_at: string | null
          cancellation_tier: Database["public"]["Enums"]["cancellation_tier"]
          checkin_time: string
          checkout_time: string
          commune_id: number | null
          cover_photo_path: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          geo: unknown
          geo_fuzzed: unknown
          host_profile_id: string
          house_rules_ar: string | null
          house_rules_en: string | null
          house_rules_fr: string | null
          id: string
          instant_book: boolean
          lat: number | null
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          lng: number | null
          max_nights: number | null
          min_nights: number
          property_type_id: number
          published_at: string | null
          rating_avg: number
          rejection_note: string | null
          rejection_reason:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          review_count: number
          reviewed_by: string | null
          status: Database["public"]["Enums"]["property_status"]
          submitted_at: string | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
          wilaya_code: number
        }
        Insert: {
          address_line?: string | null
          approved_at?: string | null
          cancellation_tier?: Database["public"]["Enums"]["cancellation_tier"]
          checkin_time?: string
          checkout_time?: string
          commune_id?: number | null
          cover_photo_path?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          geo?: unknown
          geo_fuzzed?: unknown
          host_profile_id: string
          house_rules_ar?: string | null
          house_rules_en?: string | null
          house_rules_fr?: string | null
          id?: string
          instant_book?: boolean
          lat?: number | null
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          lng?: number | null
          max_nights?: number | null
          min_nights?: number
          property_type_id: number
          published_at?: string | null
          rating_avg?: number
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          review_count?: number
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          submitted_at?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
          wilaya_code: number
        }
        Update: {
          address_line?: string | null
          approved_at?: string | null
          cancellation_tier?: Database["public"]["Enums"]["cancellation_tier"]
          checkin_time?: string
          checkout_time?: string
          commune_id?: number | null
          cover_photo_path?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          geo?: unknown
          geo_fuzzed?: unknown
          host_profile_id?: string
          house_rules_ar?: string | null
          house_rules_en?: string | null
          house_rules_fr?: string | null
          id?: string
          instant_book?: boolean
          lat?: number | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          lng?: number | null
          max_nights?: number | null
          min_nights?: number
          property_type_id?: number
          published_at?: string | null
          rating_avg?: number
          rejection_note?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          review_count?: number
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          submitted_at?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
          wilaya_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "properties_cancellation_tier_fkey"
            columns: ["cancellation_tier"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "properties_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
          {
            foreignKeyName: "properties_property_type_id_fkey"
            columns: ["property_type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: number
          property_id: string
        }
        Insert: {
          amenity_id: number
          property_id: string
        }
        Update: {
          amenity_id?: number
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          alt_ar: string | null
          alt_en: string | null
          alt_fr: string | null
          created_at: string
          id: string
          is_cover: boolean
          property_id: string
          room_type_id: string | null
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_ar?: string | null
          alt_en?: string | null
          alt_fr?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id: string
          room_type_id?: string | null
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_ar?: string | null
          alt_en?: string | null
          alt_fr?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id?: string
          room_type_id?: string | null
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      property_types: {
        Row: {
          icon: string | null
          id: number
          kind: Database["public"]["Enums"]["listing_kind"]
          name_ar: string | null
          name_en: string | null
          name_fr: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          icon?: string | null
          id: number
          kind: Database["public"]["Enums"]["listing_kind"]
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          icon?: string | null
          id?: number
          kind?: Database["public"]["Enums"]["listing_kind"]
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      rate_plans: {
        Row: {
          adjust_type: Database["public"]["Enums"]["rate_adjust_type"] | null
          adjust_value_dzd: number | null
          date_end: string | null
          date_start: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["rate_plan_kind"]
          label: string | null
          min_nights_threshold: number | null
          price_dzd: number | null
          priority: number
          room_type_id: string
          weekday_mask: number | null
        }
        Insert: {
          adjust_type?: Database["public"]["Enums"]["rate_adjust_type"] | null
          adjust_value_dzd?: number | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["rate_plan_kind"]
          label?: string | null
          min_nights_threshold?: number | null
          price_dzd?: number | null
          priority?: number
          room_type_id: string
          weekday_mask?: number | null
        }
        Update: {
          adjust_type?: Database["public"]["Enums"]["rate_adjust_type"] | null
          adjust_value_dzd?: number | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["rate_plan_kind"]
          label?: string | null
          min_nights_threshold?: number | null
          price_dzd?: number | null
          priority?: number
          room_type_id?: string
          weekday_mask?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          host_profile_id: string
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          host_profile_id: string
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          host_profile_id?: string
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accuracy: number | null
          author_id: string
          booking_id: string
          checkin: number | null
          cleanliness: number | null
          comment_text: string | null
          communication: number | null
          created_at: string
          deleted_at: string | null
          id: string
          location: number | null
          overall: number
          property_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          target: string
          updated_at: string
          value: number | null
        }
        Insert: {
          accuracy?: number | null
          author_id: string
          booking_id: string
          checkin?: number | null
          cleanliness?: number | null
          comment_text?: string | null
          communication?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: number | null
          overall: number
          property_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          target: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          accuracy?: number | null
          author_id?: string
          booking_id?: string
          checkin?: number | null
          cleanliness?: number | null
          comment_text?: string | null
          communication?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: number | null
          overall?: number
          property_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          target?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      room_amenities: {
        Row: {
          amenity_id: number
          room_type_id: string
        }
        Insert: {
          amenity_id: number
          room_type_id: string
        }
        Update: {
          amenity_id?: number
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenities_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          base_occupancy: number | null
          base_price_dzd: number
          bed_config: Json
          cleaning_fee_dzd: number
          created_at: string
          extra_guest_fee_dzd: number
          id: string
          inventory_count: number
          is_active: boolean
          is_default: boolean
          max_adults: number | null
          max_children: number | null
          max_occupancy: number
          name_ar: string | null
          name_en: string | null
          name_fr: string | null
          property_id: string
          size_sqm: number | null
          sort_order: number | null
          updated_at: string
          weekend_price_dzd: number | null
        }
        Insert: {
          base_occupancy?: number | null
          base_price_dzd: number
          bed_config?: Json
          cleaning_fee_dzd?: number
          created_at?: string
          extra_guest_fee_dzd?: number
          id?: string
          inventory_count?: number
          is_active?: boolean
          is_default?: boolean
          max_adults?: number | null
          max_children?: number | null
          max_occupancy: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          property_id: string
          size_sqm?: number | null
          sort_order?: number | null
          updated_at?: string
          weekend_price_dzd?: number | null
        }
        Update: {
          base_occupancy?: number | null
          base_price_dzd?: number
          bed_config?: Json
          cleaning_fee_dzd?: number
          created_at?: string
          extra_guest_fee_dzd?: number
          id?: string
          inventory_count?: number
          is_active?: boolean
          is_default?: boolean
          max_adults?: number | null
          max_children?: number | null
          max_occupancy?: number
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string | null
          property_id?: string
          size_sqm?: number | null
          sort_order?: number | null
          updated_at?: string
          weekend_price_dzd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_dzd: number
          booking_id: string | null
          checkout_url: string | null
          commission_amount_dzd: number
          commission_bps: number
          created_at: string
          currency: string
          expires_at: string | null
          failure_url: string | null
          gateway_fee_dzd: number
          host_payout_dzd: number
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["transaction_kind"]
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_method: string | null
          provider_ref: string | null
          provider_status: string | null
          raw_payload: Json
          refunded_dzd: number
          status: Database["public"]["Enums"]["transaction_status"]
          success_url: string | null
          updated_at: string
        }
        Insert: {
          amount_dzd: number
          booking_id?: string | null
          checkout_url?: string | null
          commission_amount_dzd?: number
          commission_bps: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          failure_url?: string | null
          gateway_fee_dzd?: number
          host_payout_dzd?: number
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["transaction_kind"]
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_method?: string | null
          provider_ref?: string | null
          provider_status?: string | null
          raw_payload?: Json
          refunded_dzd?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          success_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_dzd?: number
          booking_id?: string | null
          checkout_url?: string | null
          commission_amount_dzd?: number
          commission_bps?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          failure_url?: string | null
          gateway_fee_dzd?: number
          host_payout_dzd?: number
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["transaction_kind"]
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_method?: string | null
          provider_ref?: string | null
          provider_status?: string | null
          raw_payload?: Json
          refunded_dzd?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          success_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          process_result: string | null
          processed_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
          provider_ref: string | null
          received_at: string
          signature: string | null
          signature_ok: boolean
          transaction_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          payload: Json
          process_result?: string | null
          processed_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
          provider_ref?: string | null
          received_at?: string
          signature?: string | null
          signature_ok: boolean
          transaction_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          process_result?: string | null
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string
          provider_ref?: string | null
          received_at?: string
          signature?: string | null
          signature_ok?: boolean
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      wilayas: {
        Row: {
          ar_slug: string | null
          code: number
          is_active: boolean
          lat: number | null
          lng: number | null
          name_ar: string
          name_en: string | null
          name_fr: string
        }
        Insert: {
          ar_slug?: string | null
          code: number
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name_ar: string
          name_en?: string | null
          name_fr: string
        }
        Update: {
          ar_slug?: string | null
          code?: number
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name_ar?: string
          name_en?: string | null
          name_fr?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          property_id: string
          wishlist_id: string
        }
        Insert: {
          added_at?: string
          property_id: string
          wishlist_id: string
        }
        Update: {
          added_at?: string
          property_id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          cover_photo_path: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_photo_path?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_photo_path?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      favorites: {
        Row: {
          added_at: string | null
          property_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_conversion_funnel: {
        Row: {
          booking_starts: number | null
          bookings_paid: number | null
          conversion_pct: number | null
          day: string | null
          listing_views: number | null
        }
        Relationships: []
      }
      mv_daily_metrics: {
        Row: {
          bookings_count: number | null
          commission_dzd: number | null
          completed_bookings: number | null
          day: string | null
          gmv_dzd: number | null
          new_users: number | null
        }
        Relationships: []
      }
      mv_host_performance: {
        Row: {
          avg_rating: number | null
          bookings: number | null
          cancellation_rate: number | null
          gmv_dzd: number | null
          host_profile_id: string | null
          listings_active: number | null
          response_rate: number | null
        }
        Relationships: []
      }
      mv_revenue_by_period: {
        Row: {
          commission_dzd: number | null
          gmv_dzd: number | null
          host_net_dzd: number | null
          period: string | null
          period_start: string | null
        }
        Relationships: []
      }
      mv_top_destinations: {
        Row: {
          bookings: number | null
          commune_id: number | null
          gmv_dzd: number | null
          wilaya_code: number | null
          window_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      properties_public: {
        Row: {
          approx_lat: number | null
          approx_lng: number | null
          cancellation_tier:
            | Database["public"]["Enums"]["cancellation_tier"]
            | null
          checkin_time: string | null
          checkout_time: string | null
          commune_id: number | null
          cover_photo_path: string | null
          created_at: string | null
          currency: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          geo_fuzzed: unknown
          host_profile_id: string | null
          house_rules_ar: string | null
          house_rules_en: string | null
          house_rules_fr: string | null
          id: string | null
          instant_book: boolean | null
          listing_kind: Database["public"]["Enums"]["listing_kind"] | null
          max_nights: number | null
          min_nights: number | null
          property_type_id: number | null
          published_at: string | null
          rating_avg: number | null
          review_count: number | null
          status: Database["public"]["Enums"]["property_status"] | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string | null
          wilaya_code: number | null
        }
        Insert: {
          approx_lat?: never
          approx_lng?: never
          cancellation_tier?:
            | Database["public"]["Enums"]["cancellation_tier"]
            | null
          checkin_time?: string | null
          checkout_time?: string | null
          commune_id?: number | null
          cover_photo_path?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          geo_fuzzed?: unknown
          host_profile_id?: string | null
          house_rules_ar?: string | null
          house_rules_en?: string | null
          house_rules_fr?: string | null
          id?: string | null
          instant_book?: boolean | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"] | null
          max_nights?: number | null
          min_nights?: number | null
          property_type_id?: number | null
          published_at?: string | null
          rating_avg?: number | null
          review_count?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          wilaya_code?: number | null
        }
        Update: {
          approx_lat?: never
          approx_lng?: never
          cancellation_tier?:
            | Database["public"]["Enums"]["cancellation_tier"]
            | null
          checkin_time?: string | null
          checkout_time?: string | null
          commune_id?: number | null
          cover_photo_path?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          geo_fuzzed?: unknown
          host_profile_id?: string | null
          house_rules_ar?: string | null
          house_rules_en?: string | null
          house_rules_fr?: string | null
          id?: string | null
          instant_book?: boolean | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"] | null
          max_nights?: number | null
          min_nights?: number | null
          property_type_id?: number | null
          published_at?: string | null
          rating_avg?: number | null
          review_count?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          wilaya_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_cancellation_tier_fkey"
            columns: ["cancellation_tier"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "properties_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_host_performance"
            referencedColumns: ["host_profile_id"]
          },
          {
            foreignKeyName: "properties_property_type_id_fkey"
            columns: ["property_type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      property_review_stats: {
        Row: {
          avg_accuracy: number | null
          avg_checkin: number | null
          avg_cleanliness: number | null
          avg_communication: number | null
          avg_location: number | null
          avg_overall: number | null
          avg_value: number | null
          computed_overall: number | null
          property_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_booking_request: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      apply_payment_event: {
        Args: {
          p_amount_dzd?: number
          p_event_id?: string
          p_gateway_fee_dzd?: number
          p_kind: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_provider_ref: string
        }
        Returns: string
      }
      become_host: { Args: { p_display_name?: string }; Returns: string }
      can_act_on_property:
        | {
            Args: {
              p_min_role: Database["public"]["Enums"]["staff_role"]
              p_property_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_min_role: string; p_property_id: string }
            Returns: boolean
          }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: number
      }
      complete_stays: { Args: never; Returns: number }
      create_booking: {
        Args: {
          p_adults?: number
          p_check_in: string
          p_check_out: string
          p_children?: number
          p_property_id: string
          p_room_type_id: string
          p_special_requests?: string
          p_units?: number
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      decline_booking_request: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      dev_simulate_payment: { Args: { p_booking_id: string }; Returns: string }
      effective_units: {
        Args: { p_date: string; p_room_type_id: string }
        Returns: number
      }
      expire_holds: { Args: never; Returns: number }
      get_or_create_conversation: {
        Args: { p_booking_id: string }
        Returns: string
      }
      grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      has_role: { Args: { r: string }; Returns: boolean }
      host_reply_review: {
        Args: { p_body: string; p_review_id: string }
        Returns: string
      }
      is_host_member: { Args: { p_host_profile_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      my_host_id: { Args: never; Returns: string }
      quote_refund: { Args: { p_booking_id: string }; Returns: number }
      refresh_analytics: { Args: never; Returns: undefined }
      report_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: string
      }
      resolve_nightly_price_dzd: {
        Args: { p_date: string; p_room_type_id: string }
        Returns: number
      }
      send_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: string
      }
      submit_property_for_review: {
        Args: { p_property_id: string }
        Returns: {
          address_line: string | null
          approved_at: string | null
          cancellation_tier: Database["public"]["Enums"]["cancellation_tier"]
          checkin_time: string
          checkout_time: string
          commune_id: number | null
          cover_photo_path: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          geo: unknown
          geo_fuzzed: unknown
          host_profile_id: string
          house_rules_ar: string | null
          house_rules_en: string | null
          house_rules_fr: string | null
          id: string
          instant_book: boolean
          lat: number | null
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          lng: number | null
          max_nights: number | null
          min_nights: number
          property_type_id: number
          published_at: string | null
          rating_avg: number
          rejection_note: string | null
          rejection_reason:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          review_count: number
          reviewed_by: string | null
          status: Database["public"]["Enums"]["property_status"]
          submitted_at: string | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
          wilaya_code: number
        }
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_review: {
        Args: {
          p_accuracy: number
          p_booking_id: string
          p_checkin: number
          p_cleanliness: number
          p_comment?: string
          p_communication: number
          p_location: number
          p_overall?: number
          p_value: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "guest"
        | "host_individual"
        | "host_hotel"
        | "hotel_staff"
        | "admin"
        | "super_admin"
      booking_status:
        | "requested"
        | "declined"
        | "awaiting_payment"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show"
        | "expired"
      cancellation_tier: "flexible" | "moderate" | "strict"
      conversation_kind: "booking" | "inquiry" | "support"
      dispute_category:
        | "refund"
        | "no_show"
        | "property_mismatch"
        | "damage"
        | "payment"
        | "other"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved"
        | "rejected"
        | "cancelled"
      hold_status: "held" | "captured" | "released" | "expired"
      host_kind: "individual" | "hotel"
      listing_kind: "single_unit" | "multi_room"
      payment_method: "edahabia" | "cib" | "baridi_qr"
      payment_provider: "chargily" | "baridi"
      payout_status: "pending" | "processing" | "paid" | "failed" | "on_hold"
      property_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
      rail_kind:
        | "near_you"
        | "popular_in_wilaya"
        | "beachfront"
        | "sahara_escapes"
        | "top_rated"
        | "featured_collection"
        | "recently_viewed"
      rate_adjust_type: "percent" | "absolute"
      rate_plan_kind: "base" | "weekend" | "seasonal" | "long_stay"
      rejection_reason:
        | "incomplete_info"
        | "poor_photo_quality"
        | "prohibited_content"
        | "duplicate"
        | "suspected_fraud"
        | "policy_violation"
        | "other"
      review_status: "pending" | "published" | "hidden" | "removed"
      staff_role: "reception" | "manager"
      transaction_kind: "payment" | "refund" | "payout" | "chargeback"
      transaction_status:
        | "pending"
        | "processing"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
        | "expired"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "guest",
        "host_individual",
        "host_hotel",
        "hotel_staff",
        "admin",
        "super_admin",
      ],
      booking_status: [
        "requested",
        "declined",
        "awaiting_payment",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ],
      cancellation_tier: ["flexible", "moderate", "strict"],
      conversation_kind: ["booking", "inquiry", "support"],
      dispute_category: [
        "refund",
        "no_show",
        "property_mismatch",
        "damage",
        "payment",
        "other",
      ],
      dispute_status: [
        "open",
        "under_review",
        "resolved",
        "rejected",
        "cancelled",
      ],
      hold_status: ["held", "captured", "released", "expired"],
      host_kind: ["individual", "hotel"],
      listing_kind: ["single_unit", "multi_room"],
      payment_method: ["edahabia", "cib", "baridi_qr"],
      payment_provider: ["chargily", "baridi"],
      payout_status: ["pending", "processing", "paid", "failed", "on_hold"],
      property_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      rail_kind: [
        "near_you",
        "popular_in_wilaya",
        "beachfront",
        "sahara_escapes",
        "top_rated",
        "featured_collection",
        "recently_viewed",
      ],
      rate_adjust_type: ["percent", "absolute"],
      rate_plan_kind: ["base", "weekend", "seasonal", "long_stay"],
      rejection_reason: [
        "incomplete_info",
        "poor_photo_quality",
        "prohibited_content",
        "duplicate",
        "suspected_fraud",
        "policy_violation",
        "other",
      ],
      review_status: ["pending", "published", "hidden", "removed"],
      staff_role: ["reception", "manager"],
      transaction_kind: ["payment", "refund", "payout", "chargeback"],
      transaction_status: [
        "pending",
        "processing",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
        "expired",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

