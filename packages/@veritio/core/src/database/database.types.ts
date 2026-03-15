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
      ab_test_variants: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_enabled: boolean
          split_percentage: number
          study_id: string
          variant_a_content: Json
          variant_b_content: Json
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_enabled?: boolean
          split_percentage?: number
          study_id: string
          variant_a_content?: Json
          variant_b_content?: Json
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_enabled?: boolean
          split_percentage?: number
          study_id?: string
          variant_a_content?: Json
          variant_b_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_variants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_variants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      account: {
        Row: {
          accessToken: string | null
          accessTokenExpiresAt: string | null
          accountId: string
          createdAt: string | null
          id: string
          idToken: string | null
          password: string | null
          providerId: string
          refreshToken: string | null
          refreshTokenExpiresAt: string | null
          scope: string | null
          updatedAt: string | null
          userId: string
        }
        Insert: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId: string
          createdAt?: string | null
          id: string
          idToken?: string | null
          password?: string | null
          providerId: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt?: string | null
          userId: string
        }
        Update: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId?: string
          createdAt?: string | null
          id?: string
          idToken?: string | null
          password?: string | null
          providerId?: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      card_sort_responses: {
        Row: {
          card_movement_percentage: number | null
          card_placements: Json
          created_at: string | null
          custom_categories: Json | null
          id: string
          participant_id: string
          standardized_placements: Json | null
          study_id: string
          total_time_ms: number | null
        }
        Insert: {
          card_movement_percentage?: number | null
          card_placements: Json
          created_at?: string | null
          custom_categories?: Json | null
          id?: string
          participant_id: string
          standardized_placements?: Json | null
          study_id: string
          total_time_ms?: number | null
        }
        Update: {
          card_movement_percentage?: number | null
          card_placements?: Json
          created_at?: string | null
          custom_categories?: Json | null
          id?: string
          participant_id?: string
          standardized_placements?: Json | null
          study_id?: string
          total_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_sort_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_sort_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_sort_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_sort_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      cards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image: Json | null
          label: string
          position: number
          study_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: Json | null
          label: string
          position?: number
          study_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: Json | null
          label?: string
          position?: number
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          position: number
          study_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          position?: number
          study_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          position?: number
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      category_standardizations: {
        Row: {
          agreement_score: number | null
          created_at: string | null
          created_by: string | null
          id: string
          original_names: string[]
          standardized_name: string
          study_id: string
          updated_at: string | null
        }
        Insert: {
          agreement_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          original_names: string[]
          standardized_name: string
          study_id: string
          updated_at?: string | null
        }
        Update: {
          agreement_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          original_names?: string[]
          standardized_name?: string
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_standardizations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_standardizations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_standardizations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      evidence_highlights: {
        Row: {
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          end_time_ms: number | null
          id: string
          is_deleted: boolean
          note: string | null
          snapshot: Json
          source_id: string
          source_type: string
          start_time_ms: number | null
          study_id: string
          tag_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          end_time_ms?: number | null
          id?: string
          is_deleted?: boolean
          note?: string | null
          snapshot?: Json
          source_id: string
          source_type: string
          start_time_ms?: number | null
          study_id: string
          tag_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          end_time_ms?: number | null
          id?: string
          is_deleted?: boolean
          note?: string | null
          snapshot?: Json
          source_id?: string
          source_type?: string
          start_time_ms?: number | null
          study_id?: string
          tag_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_highlights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_highlights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_highlights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      figma_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          figma_email: string | null
          figma_handle: string | null
          figma_img_url: string | null
          figma_user_id: string
          id: string
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          figma_email?: string | null
          figma_handle?: string | null
          figma_img_url?: string | null
          figma_user_id: string
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          figma_email?: string | null
          figma_handle?: string | null
          figma_img_url?: string | null
          figma_user_id?: string
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      first_click_aois: {
        Row: {
          created_at: string | null
          height: number
          id: string
          image_id: string
          name: string
          position: number
          study_id: string
          task_id: string
          updated_at: string | null
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string | null
          height: number
          id?: string
          image_id: string
          name: string
          position?: number
          study_id: string
          task_id: string
          updated_at?: string | null
          width: number
          x: number
          y: number
        }
        Update: {
          created_at?: string | null
          height?: number
          id?: string
          image_id?: string
          name?: string
          position?: number
          study_id?: string
          task_id?: string
          updated_at?: string | null
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "first_click_aois_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "first_click_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_aois_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_aois_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_aois_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "first_click_aois_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "first_click_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      first_click_images: {
        Row: {
          created_at: string | null
          figma_file_key: string | null
          figma_node_id: string | null
          height: number | null
          id: string
          image_url: string
          original_filename: string | null
          source_type: string
          study_id: string
          task_id: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          figma_file_key?: string | null
          figma_node_id?: string | null
          height?: number | null
          id?: string
          image_url: string
          original_filename?: string | null
          source_type: string
          study_id: string
          task_id: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          figma_file_key?: string | null
          figma_node_id?: string | null
          height?: number | null
          id?: string
          image_url?: string
          original_filename?: string | null
          source_type?: string
          study_id?: string
          task_id?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_click_images_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_images_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_images_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "first_click_images_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "first_click_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      first_click_post_task_responses: {
        Row: {
          created_at: string | null
          id: string
          participant_id: string
          question_id: string
          response_id: string
          study_id: string
          task_id: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_id: string
          question_id: string
          response_id: string
          study_id: string
          task_id: string
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_id?: string
          question_id?: string
          response_id?: string
          study_id?: string
          task_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "first_click_post_task_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_post_task_responses_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "first_click_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "first_click_post_task_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "first_click_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      first_click_responses: {
        Row: {
          click_x: number | null
          click_y: number | null
          created_at: string | null
          id: string
          image_id: string
          image_rendered_height: number | null
          image_rendered_width: number | null
          is_correct: boolean | null
          is_skipped: boolean | null
          matched_aoi_id: string | null
          participant_id: string
          study_id: string
          task_id: string
          time_to_click_ms: number | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          click_x?: number | null
          click_y?: number | null
          created_at?: string | null
          id?: string
          image_id: string
          image_rendered_height?: number | null
          image_rendered_width?: number | null
          is_correct?: boolean | null
          is_skipped?: boolean | null
          matched_aoi_id?: string | null
          participant_id: string
          study_id: string
          task_id: string
          time_to_click_ms?: number | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          click_x?: number | null
          click_y?: number | null
          created_at?: string | null
          id?: string
          image_id?: string
          image_rendered_height?: number | null
          image_rendered_width?: number | null
          is_correct?: boolean | null
          is_skipped?: boolean | null
          matched_aoi_id?: string | null
          participant_id?: string
          study_id?: string
          task_id?: string
          time_to_click_ms?: number | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_click_responses_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "first_click_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_responses_matched_aoi_id_fkey"
            columns: ["matched_aoi_id"]
            isOneToOne: false
            referencedRelation: "first_click_aois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "first_click_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "first_click_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      first_click_tasks: {
        Row: {
          created_at: string | null
          id: string
          instruction: string
          position: number
          post_task_questions: Json | null
          study_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instruction: string
          position?: number
          post_task_questions?: Json | null
          study_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instruction?: string
          position?: number
          post_task_questions?: Json | null
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "first_click_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_click_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_designs: {
        Row: {
          background_color: string | null
          created_at: string | null
          display_mode: string
          figma_file_key: string | null
          figma_node_id: string | null
          height: number | null
          id: string
          image_url: string | null
          is_practice: boolean
          mobile_height: number | null
          mobile_image_url: string | null
          mobile_width: number | null
          name: string | null
          original_filename: string | null
          position: number
          questions: Json | null
          source_type: string
          study_id: string
          updated_at: string | null
          weight: number
          width: number | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          display_mode?: string
          figma_file_key?: string | null
          figma_node_id?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_practice?: boolean
          mobile_height?: number | null
          mobile_image_url?: string | null
          mobile_width?: number | null
          name?: string | null
          original_filename?: string | null
          position?: number
          questions?: Json | null
          source_type?: string
          study_id: string
          updated_at?: string | null
          weight?: number
          width?: number | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          display_mode?: string
          figma_file_key?: string | null
          figma_node_id?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_practice?: boolean
          mobile_height?: number | null
          mobile_image_url?: string | null
          mobile_width?: number | null
          name?: string | null
          original_filename?: string | null
          position?: number
          questions?: Json | null
          source_type?: string
          study_id?: string
          updated_at?: string | null
          weight?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_designs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_designs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_designs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_exposures: {
        Row: {
          actual_display_ms: number | null
          configured_duration_ms: number
          countdown_duration_ms: number | null
          countdown_started_at: string | null
          created_at: string | null
          design_id: string
          exposure_ended_at: string | null
          exposure_sequence: number
          exposure_started_at: string
          id: string
          image_rendered_height: number | null
          image_rendered_width: number | null
          participant_id: string
          questions_completed_at: string | null
          questions_started_at: string | null
          session_id: string
          study_id: string
          used_mobile_image: boolean | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          actual_display_ms?: number | null
          configured_duration_ms: number
          countdown_duration_ms?: number | null
          countdown_started_at?: string | null
          created_at?: string | null
          design_id: string
          exposure_ended_at?: string | null
          exposure_sequence?: number
          exposure_started_at: string
          id?: string
          image_rendered_height?: number | null
          image_rendered_width?: number | null
          participant_id: string
          questions_completed_at?: string | null
          questions_started_at?: string | null
          session_id: string
          study_id: string
          used_mobile_image?: boolean | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          actual_display_ms?: number | null
          configured_duration_ms?: number
          countdown_duration_ms?: number | null
          countdown_started_at?: string | null
          created_at?: string | null
          design_id?: string
          exposure_ended_at?: string | null
          exposure_sequence?: number
          exposure_started_at?: string
          id?: string
          image_rendered_height?: number | null
          image_rendered_width?: number | null
          participant_id?: string
          questions_completed_at?: string | null
          questions_started_at?: string | null
          session_id?: string
          study_id?: string
          used_mobile_image?: boolean | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_exposures_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "first_impression_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_exposures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_exposures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "first_impression_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_exposures_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_exposures_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_exposures_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_interaction_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_timestamp: string
          event_type: string
          exposure_id: string
          id: string
          participant_id: string
          phase: string
          question_id: string | null
          session_id: string
          study_id: string
          timestamp_ms: number
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_timestamp: string
          event_type: string
          exposure_id: string
          id?: string
          participant_id: string
          phase: string
          question_id?: string | null
          session_id: string
          study_id: string
          timestamp_ms: number
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_timestamp?: string
          event_type?: string
          exposure_id?: string
          id?: string
          participant_id?: string
          phase?: string
          question_id?: string | null
          session_id?: string
          study_id?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_interaction_events_exposure_id_fkey"
            columns: ["exposure_id"]
            isOneToOne: false
            referencedRelation: "first_impression_exposures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_interaction_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_interaction_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "first_impression_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_interaction_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_interaction_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_interaction_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_responses: {
        Row: {
          created_at: string | null
          design_id: string
          exposure_id: string
          first_interaction_at: string | null
          id: string
          participant_id: string
          question_id: string
          question_shown_at: string | null
          response_time_ms: number | null
          response_value: Json
          session_id: string
          study_id: string
          submitted_at: string | null
          time_to_completion_ms: number | null
          time_to_first_interaction_ms: number | null
        }
        Insert: {
          created_at?: string | null
          design_id: string
          exposure_id: string
          first_interaction_at?: string | null
          id?: string
          participant_id: string
          question_id: string
          question_shown_at?: string | null
          response_time_ms?: number | null
          response_value: Json
          session_id: string
          study_id: string
          submitted_at?: string | null
          time_to_completion_ms?: number | null
          time_to_first_interaction_ms?: number | null
        }
        Update: {
          created_at?: string | null
          design_id?: string
          exposure_id?: string
          first_interaction_at?: string | null
          id?: string
          participant_id?: string
          question_id?: string
          question_shown_at?: string | null
          response_time_ms?: number | null
          response_value?: Json
          session_id?: string
          study_id?: string
          submitted_at?: string | null
          time_to_completion_ms?: number | null
          time_to_first_interaction_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_responses_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "first_impression_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_exposure_id_fkey"
            columns: ["exposure_id"]
            isOneToOne: false
            referencedRelation: "first_impression_exposures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "first_impression_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_sessions: {
        Row: {
          assigned_design_id: string | null
          assignment_mode: string
          completed_at: string | null
          design_sequence: Json | null
          device_type: string | null
          id: string
          participant_id: string
          started_at: string | null
          study_id: string
          total_time_ms: number | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          assigned_design_id?: string | null
          assignment_mode: string
          completed_at?: string | null
          design_sequence?: Json | null
          device_type?: string | null
          id?: string
          participant_id: string
          started_at?: string | null
          study_id: string
          total_time_ms?: number | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          assigned_design_id?: string | null
          assignment_mode?: string
          completed_at?: string | null
          design_sequence?: Json | null
          device_type?: string | null
          id?: string
          participant_id?: string
          started_at?: string | null
          study_id?: string
          total_time_ms?: number | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_sessions_assigned_design_id_fkey"
            columns: ["assigned_design_id"]
            isOneToOne: false
            referencedRelation: "first_impression_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      first_impression_word_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          design_id: string | null
          group_name: string
          id: string
          question_id: string | null
          study_id: string
          updated_at: string | null
          words: string[]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          design_id?: string | null
          group_name: string
          id?: string
          question_id?: string | null
          study_id: string
          updated_at?: string | null
          words: string[]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          design_id?: string | null
          group_name?: string
          id?: string
          question_id?: string | null
          study_id?: string
          updated_at?: string | null
          words?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "first_impression_word_groups_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "first_impression_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_word_groups_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_word_groups_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_impression_word_groups_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_collaborators: {
        Row: {
          added_at: string
          added_by_user_id: string | null
          created_at: string
          id: string
          insight_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by_user_id?: string | null
          created_at?: string
          id?: string
          insight_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by_user_id?: string | null
          created_at?: string
          id?: string
          insight_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_collaborators_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_collaborators_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_evidence: {
        Row: {
          annotation: string | null
          created_at: string
          created_by_user_id: string
          end_time_ms: number | null
          evidence_id: string
          evidence_type: string
          id: string
          insight_id: string
          position: number
          snapshot: Json
          start_time_ms: number | null
          updated_at: string
        }
        Insert: {
          annotation?: string | null
          created_at?: string
          created_by_user_id: string
          end_time_ms?: number | null
          evidence_id: string
          evidence_type: string
          id?: string
          insight_id: string
          position?: number
          snapshot?: Json
          start_time_ms?: number | null
          updated_at?: string
        }
        Update: {
          annotation?: string | null
          created_at?: string
          created_by_user_id?: string
          end_time_ms?: number | null
          evidence_id?: string
          evidence_type?: string
          id?: string
          insight_id?: string
          position?: number
          snapshot?: Json
          start_time_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_evidence_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_evidence_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          id: string
          insight_type: string
          is_deleted: boolean
          organization_id: string
          priority: string
          project_id: string | null
          published_at: string | null
          published_by_user_id: string | null
          status: string
          study_id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          id?: string
          insight_type?: string
          is_deleted?: boolean
          organization_id: string
          priority?: string
          project_id?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          status?: string
          study_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          id?: string
          insight_type?: string
          is_deleted?: boolean
          organization_id?: string
          priority?: string
          project_id?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          status?: string
          study_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: string
          content: string
          contexts: string[]
          created_at: string
          id: string
          preview: string
          priority: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          contexts: string[]
          created_at?: string
          id?: string
          preview: string
          priority?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          contexts?: string[]
          created_at?: string
          id?: string
          preview?: string
          priority?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      link_analytics: {
        Row: {
          created_at: string | null
          custom_params: Json | null
          event_type: string
          id: string
          ip_hash: string | null
          participant_id: string | null
          source: string
          study_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          widget_metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          custom_params?: Json | null
          event_type: string
          id?: string
          ip_hash?: string | null
          participant_id?: string | null
          source: string
          study_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          widget_metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          custom_params?: Json | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          participant_id?: string | null
          source?: string
          study_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          widget_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "link_analytics_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_analytics_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_analytics_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_analytics_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          invite_token: string | null
          invite_type: string
          invited_by_user_id: string
          max_uses: number | null
          message: string | null
          organization_id: string
          role: string
          status: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invite_type: string
          invited_by_user_id: string
          max_uses?: number | null
          message?: string | null
          organization_id: string
          role: string
          status?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invite_type?: string
          invited_by_user_id?: string
          max_uses?: number | null
          message?: string | null
          organization_id?: string
          role?: string
          status?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by_user_id: string | null
          joined_at: string | null
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          joined_at?: string | null
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      panel_incentive_distributions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          fulfillment_method: string | null
          fulfillment_reference: string | null
          id: string
          notes: string | null
          panel_participant_id: string
          participation_id: string | null
          promised_at: string | null
          redeemed_at: string | null
          sent_at: string | null
          status: string
          study_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          fulfillment_method?: string | null
          fulfillment_reference?: string | null
          id?: string
          notes?: string | null
          panel_participant_id: string
          participation_id?: string | null
          promised_at?: string | null
          redeemed_at?: string | null
          sent_at?: string | null
          status?: string
          study_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          fulfillment_method?: string | null
          fulfillment_reference?: string | null
          id?: string
          notes?: string | null
          panel_participant_id?: string
          participation_id?: string | null
          promised_at?: string | null
          redeemed_at?: string | null
          sent_at?: string | null
          status?: string
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_incentive_distributions_panel_participant_id_fkey"
            columns: ["panel_participant_id"]
            isOneToOne: false
            referencedRelation: "panel_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_incentive_distributions_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "panel_study_participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_incentive_distributions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_incentive_distributions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_incentive_distributions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      panel_participant_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          panel_participant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          panel_participant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          panel_participant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_participant_notes_panel_participant_id_fkey"
            columns: ["panel_participant_id"]
            isOneToOne: false
            referencedRelation: "panel_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_participant_tags: {
        Row: {
          assigned_at: string | null
          panel_participant_id: string
          panel_tag_id: string
          source: string
        }
        Insert: {
          assigned_at?: string | null
          panel_participant_id: string
          panel_tag_id: string
          source?: string
        }
        Update: {
          assigned_at?: string | null
          panel_participant_id?: string
          panel_tag_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_participant_tags_panel_participant_id_fkey"
            columns: ["panel_participant_id"]
            isOneToOne: false
            referencedRelation: "panel_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_participant_tags_panel_tag_id_fkey"
            columns: ["panel_tag_id"]
            isOneToOne: false
            referencedRelation: "panel_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_participants: {
        Row: {
          consent_given_at: string | null
          consent_version: string | null
          created_at: string | null
          custom_attributes: Json | null
          demographics: Json | null
          email: string
          first_name: string | null
          id: string
          last_active_at: string | null
          last_contacted_at: string | null
          last_name: string | null
          source: string
          source_details: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          custom_attributes?: Json | null
          demographics?: Json | null
          email: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          source?: string
          source_details?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          custom_attributes?: Json | null
          demographics?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          source?: string
          source_details?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      panel_segments: {
        Row: {
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          last_count_updated_at: string | null
          name: string
          participant_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          last_count_updated_at?: string | null
          name: string
          participant_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          last_count_updated_at?: string | null
          name?: string
          participant_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      panel_study_participations: {
        Row: {
          completed_at: string | null
          completion_time_seconds: number | null
          created_at: string | null
          id: string
          invited_at: string | null
          panel_participant_id: string
          participant_id: string | null
          source: string | null
          started_at: string | null
          status: string
          study_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          panel_participant_id: string
          participant_id?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          study_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          panel_participant_id?: string
          participant_id?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_study_participations_panel_participant_id_fkey"
            columns: ["panel_participant_id"]
            isOneToOne: false
            referencedRelation: "panel_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_study_participations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_study_participations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_study_participations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_study_participations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      panel_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      panel_widget_configs: {
        Row: {
          active_study_id: string | null
          config: Json | null
          created_at: string | null
          default_tag_ids: string[] | null
          embed_code_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_study_id?: string | null
          config?: Json | null
          created_at?: string | null
          default_tag_ids?: string[] | null
          embed_code_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_study_id?: string | null
          config?: Json | null
          created_at?: string | null
          default_tag_ids?: string[] | null
          embed_code_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_widget_configs_active_study_id_fkey"
            columns: ["active_study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_widget_configs_active_study_id_fkey"
            columns: ["active_study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_widget_configs_active_study_id_fkey"
            columns: ["active_study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      participant_analysis_flags: {
        Row: {
          created_at: string | null
          flag_reason: string | null
          flag_type: string
          id: string
          is_excluded: boolean | null
          participant_id: string
          study_id: string
        }
        Insert: {
          created_at?: string | null
          flag_reason?: string | null
          flag_type: string
          id?: string
          is_excluded?: boolean | null
          participant_id: string
          study_id: string
        }
        Update: {
          created_at?: string | null
          flag_reason?: string | null
          flag_type?: string
          id?: string
          is_excluded?: boolean | null
          participant_id?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_analysis_flags_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_analysis_flags_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_analysis_flags_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_analysis_flags_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      participant_fingerprints: {
        Row: {
          cookie_hash: string | null
          created_at: string | null
          fingerprint_confidence: number | null
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
          participant_id: string
          study_id: string
        }
        Insert: {
          cookie_hash?: string | null
          created_at?: string | null
          fingerprint_confidence?: number | null
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          participant_id: string
          study_id: string
        }
        Update: {
          cookie_hash?: string | null
          created_at?: string | null
          fingerprint_confidence?: number | null
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          participant_id?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_fingerprints_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_fingerprints_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_fingerprints_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_fingerprints_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      participant_variant_assignments: {
        Row: {
          ab_test_variant_id: string
          assigned_at: string
          assigned_variant: string
          id: string
          participant_id: string
        }
        Insert: {
          ab_test_variant_id: string
          assigned_at?: string
          assigned_variant: string
          id?: string
          participant_id: string
        }
        Update: {
          ab_test_variant_id?: string
          assigned_at?: string
          assigned_variant?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_variant_assignments_ab_test_variant_id_fkey"
            columns: ["ab_test_variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_variant_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          categories_created: number | null
          city: string | null
          completed_at: string | null
          country: string | null
          id: string
          identifier_type: string | null
          identifier_value: string | null
          metadata: Json | null
          region: string | null
          rejected_at: string | null
          screening_result: string | null
          session_token: string | null
          started_at: string | null
          status: string | null
          study_id: string
          url_tags: Json | null
        }
        Insert: {
          categories_created?: number | null
          city?: string | null
          completed_at?: string | null
          country?: string | null
          id?: string
          identifier_type?: string | null
          identifier_value?: string | null
          metadata?: Json | null
          region?: string | null
          rejected_at?: string | null
          screening_result?: string | null
          session_token?: string | null
          started_at?: string | null
          status?: string | null
          study_id: string
          url_tags?: Json | null
        }
        Update: {
          categories_created?: number | null
          city?: string | null
          completed_at?: string | null
          country?: string | null
          id?: string
          identifier_type?: string | null
          identifier_value?: string | null
          metadata?: Json | null
          region?: string | null
          rejected_at?: string | null
          screening_result?: string | null
          session_token?: string | null
          started_at?: string | null
          status?: string | null
          study_id?: string
          url_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      pca_analyses: {
        Row: {
          computed_at: string | null
          id: string
          response_count: number
          study_id: string
          support_ratios: Json
          top_ias: Json
        }
        Insert: {
          computed_at?: string | null
          id?: string
          response_count?: number
          study_id: string
          support_ratios?: Json
          top_ias?: Json
        }
        Update: {
          computed_at?: string | null
          id?: string
          response_count?: number
          study_id?: string
          support_ratios?: Json
          top_ias?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pca_analyses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pca_analyses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pca_analyses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_at: string
          added_by_user_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          project_id: string
          role: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by_user_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          project_id: string
          role: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by_user_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          project_id?: string
          role?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prototype_test_click_events: {
        Row: {
          created_at: string | null
          frame_id: string
          hotspot_id: string | null
          id: string
          session_id: string
          study_id: string
          task_id: string
          time_since_frame_load_ms: number | null
          timestamp: string | null
          triggered_transition: boolean | null
          viewport_x: number | null
          viewport_y: number | null
          was_hotspot: boolean | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string | null
          frame_id: string
          hotspot_id?: string | null
          id?: string
          session_id: string
          study_id: string
          task_id: string
          time_since_frame_load_ms?: number | null
          timestamp?: string | null
          triggered_transition?: boolean | null
          viewport_x?: number | null
          viewport_y?: number | null
          was_hotspot?: boolean | null
          x: number
          y: number
        }
        Update: {
          created_at?: string | null
          frame_id?: string
          hotspot_id?: string | null
          id?: string
          session_id?: string
          study_id?: string
          task_id?: string
          time_since_frame_load_ms?: number | null
          timestamp?: string | null
          triggered_transition?: boolean | null
          viewport_x?: number | null
          viewport_y?: number | null
          was_hotspot?: boolean | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_click_events_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_click_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_click_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_click_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_click_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "prototype_test_click_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      prototype_test_frames: {
        Row: {
          created_at: string | null
          figma_node_id: string
          height: number | null
          id: string
          name: string
          page_name: string | null
          position: number | null
          prototype_id: string
          study_id: string
          thumbnail_url: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          figma_node_id: string
          height?: number | null
          id?: string
          name: string
          page_name?: string | null
          position?: number | null
          prototype_id: string
          study_id: string
          thumbnail_url?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          figma_node_id?: string
          height?: number | null
          id?: string
          name?: string
          page_name?: string | null
          position?: number | null
          prototype_id?: string
          study_id?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_frames_prototype_id_fkey"
            columns: ["prototype_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_prototypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_frames_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_frames_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_frames_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      prototype_test_navigation_events: {
        Row: {
          click_event_id: string | null
          created_at: string | null
          from_frame_id: string | null
          id: string
          sequence_number: number
          session_id: string
          study_id: string
          task_id: string
          time_on_from_frame_ms: number | null
          timestamp: string | null
          to_frame_id: string
          triggered_by: string
        }
        Insert: {
          click_event_id?: string | null
          created_at?: string | null
          from_frame_id?: string | null
          id?: string
          sequence_number: number
          session_id: string
          study_id: string
          task_id: string
          time_on_from_frame_ms?: number | null
          timestamp?: string | null
          to_frame_id: string
          triggered_by: string
        }
        Update: {
          click_event_id?: string | null
          created_at?: string | null
          from_frame_id?: string | null
          id?: string
          sequence_number?: number
          session_id?: string
          study_id?: string
          task_id?: string
          time_on_from_frame_ms?: number | null
          timestamp?: string | null
          to_frame_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_navigation_events_click_event_id_fkey"
            columns: ["click_event_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_click_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_from_frame_id_fkey"
            columns: ["from_frame_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_navigation_events_to_frame_id_fkey"
            columns: ["to_frame_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      prototype_test_post_task_responses: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          question_id: string
          session_id: string
          study_id: string
          task_attempt_id: string
          task_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          question_id: string
          session_id: string
          study_id: string
          task_attempt_id: string
          task_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          question_id?: string
          session_id?: string
          study_id?: string
          task_attempt_id?: string
          task_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_post_task_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_task_attempt_id_fkey"
            columns: ["task_attempt_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_task_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_post_task_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      prototype_test_prototypes: {
        Row: {
          created_at: string | null
          figma_file_key: string
          figma_file_modified_at: string | null
          figma_node_id: string | null
          figma_url: string
          frame_count: number | null
          id: string
          last_synced_at: string | null
          name: string | null
          password: string | null
          starting_frame_id: string | null
          study_id: string
          sync_error: string | null
          sync_status: string | null
        }
        Insert: {
          created_at?: string | null
          figma_file_key: string
          figma_file_modified_at?: string | null
          figma_node_id?: string | null
          figma_url: string
          frame_count?: number | null
          id?: string
          last_synced_at?: string | null
          name?: string | null
          password?: string | null
          starting_frame_id?: string | null
          study_id: string
          sync_error?: string | null
          sync_status?: string | null
        }
        Update: {
          created_at?: string | null
          figma_file_key?: string
          figma_file_modified_at?: string | null
          figma_node_id?: string | null
          figma_url?: string
          frame_count?: number | null
          id?: string
          last_synced_at?: string | null
          name?: string | null
          password?: string | null
          starting_frame_id?: string | null
          study_id?: string
          sync_error?: string | null
          sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_prototypes_starting_frame_id_fkey"
            columns: ["starting_frame_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_prototypes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_prototypes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_prototypes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      prototype_test_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          device_info: Json | null
          id: string
          participant_id: string
          started_at: string | null
          study_id: string
          total_time_ms: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          participant_id: string
          started_at?: string | null
          study_id: string
          total_time_ms?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          participant_id?: string
          started_at?: string | null
          study_id?: string
          total_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      prototype_test_task_attempts: {
        Row: {
          backtrack_count: number | null
          click_count: number | null
          created_at: string | null
          id: string
          is_direct: boolean | null
          misclick_count: number | null
          outcome: string
          participant_id: string
          path_taken: Json | null
          post_task_responses: Json | null
          session_id: string
          study_id: string
          task_attempt_id: string | null
          task_id: string
          time_to_first_click_ms: number | null
          total_time_ms: number | null
        }
        Insert: {
          backtrack_count?: number | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          is_direct?: boolean | null
          misclick_count?: number | null
          outcome: string
          participant_id: string
          path_taken?: Json | null
          post_task_responses?: Json | null
          session_id: string
          study_id: string
          task_attempt_id?: string | null
          task_id: string
          time_to_first_click_ms?: number | null
          total_time_ms?: number | null
        }
        Update: {
          backtrack_count?: number | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          is_direct?: boolean | null
          misclick_count?: number | null
          outcome?: string
          participant_id?: string
          path_taken?: Json | null
          post_task_responses?: Json | null
          session_id?: string
          study_id?: string
          task_attempt_id?: string | null
          task_id?: string
          time_to_first_click_ms?: number | null
          total_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_task_attempts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_task_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_task_attempts_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_task_attempts_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_task_attempts_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "prototype_test_task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      prototype_test_tasks: {
        Row: {
          created_at: string | null
          flow_type: string | null
          id: string
          instruction: string | null
          position: number | null
          post_task_questions: Json | null
          start_frame_id: string | null
          study_id: string
          success_criteria_type: string
          success_frame_ids: Json | null
          success_pathway: Json | null
          time_limit_ms: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          flow_type?: string | null
          id?: string
          instruction?: string | null
          position?: number | null
          post_task_questions?: Json | null
          start_frame_id?: string | null
          study_id: string
          success_criteria_type?: string
          success_frame_ids?: Json | null
          success_pathway?: Json | null
          time_limit_ms?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          flow_type?: string | null
          id?: string
          instruction?: string | null
          position?: number | null
          post_task_questions?: Json | null
          start_frame_id?: string | null
          study_id?: string
          success_criteria_type?: string
          success_frame_ids?: Json | null
          success_pathway?: Json | null
          time_limit_ms?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prototype_test_tasks_start_frame_id_fkey"
            columns: ["start_frame_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prototype_test_tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      recording_annotations: {
        Row: {
          annotation_type: string
          content: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_ms: number
          id: string
          layer: number
          recording_id: string
          start_ms: number
          style: Json
          updated_at: string
        }
        Insert: {
          annotation_type: string
          content?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          end_ms: number
          id?: string
          layer?: number
          recording_id: string
          start_ms: number
          style?: Json
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          content?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          end_ms?: number
          id?: string
          layer?: number
          recording_id?: string
          start_ms?: number
          style?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_annotations_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_clips: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_ms: number
          id: string
          recording_id: string
          start_ms: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_ms: number
          id?: string
          recording_id: string
          start_ms: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_ms?: number
          id?: string
          recording_id?: string
          start_ms?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_clips_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_comments: {
        Row: {
          clip_id: string | null
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          recording_id: string
          timestamp_ms: number | null
          updated_at: string
        }
        Insert: {
          clip_id?: string | null
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          recording_id: string
          timestamp_ms?: number | null
          updated_at?: string
        }
        Update: {
          clip_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          recording_id?: string
          timestamp_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_comments_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "recording_clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_comments_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string
          id: string
          recording_id: string
          timestamp_ms: number
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          recording_id: string
          timestamp_ms: number
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          recording_id?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "recording_events_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_shares: {
        Row: {
          access_level: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          password_hash: string | null
          recording_id: string
          revoked_at: string | null
          share_code: string
          updated_at: string
          view_count: number
        }
        Insert: {
          access_level?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          password_hash?: string | null
          recording_id: string
          revoked_at?: string | null
          share_code: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          password_hash?: string | null
          recording_id?: string
          revoked_at?: string | null
          share_code?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "recording_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_track_configs: {
        Row: {
          created_at: string
          id: string
          layout_preset: string
          recording_id: string
          scroll_position: number
          tracks: Json
          updated_at: string
          user_id: string
          zoom_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          layout_preset?: string
          recording_id: string
          scroll_position?: number
          tracks?: Json
          updated_at?: string
          user_id: string
          zoom_level?: number
        }
        Update: {
          created_at?: string
          id?: string
          layout_preset?: string
          recording_id?: string
          scroll_position?: number
          tracks?: Json
          updated_at?: string
          user_id?: string
          zoom_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "recording_track_configs_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          capture_mode: string
          chunk_etags: Json | null
          chunks_uploaded: number | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          file_size_bytes: number | null
          id: string
          linked_recording_id: string | null
          mime_type: string | null
          participant_id: string
          question_response_id: string | null
          recording_type: string
          resolution_height: number | null
          resolution_width: number | null
          scope: string
          started_at: string | null
          status: string
          status_message: string | null
          storage_path: string
          storage_provider: string
          study_id: string
          task_attempt_id: string | null
          total_chunks: number | null
          transcription_language: string | null
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          capture_mode?: string
          chunk_etags?: Json | null
          chunks_uploaded?: number | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          file_size_bytes?: number | null
          id?: string
          linked_recording_id?: string | null
          mime_type?: string | null
          participant_id: string
          question_response_id?: string | null
          recording_type?: string
          resolution_height?: number | null
          resolution_width?: number | null
          scope?: string
          started_at?: string | null
          status?: string
          status_message?: string | null
          storage_path: string
          storage_provider?: string
          study_id: string
          task_attempt_id?: string | null
          total_chunks?: number | null
          transcription_language?: string | null
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          capture_mode?: string
          chunk_etags?: Json | null
          chunks_uploaded?: number | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          file_size_bytes?: number | null
          id?: string
          linked_recording_id?: string | null
          mime_type?: string | null
          participant_id?: string
          question_response_id?: string | null
          recording_type?: string
          resolution_height?: number | null
          resolution_width?: number | null
          scope?: string
          started_at?: string | null
          status?: string
          status_message?: string | null
          storage_path?: string
          storage_provider?: string
          study_id?: string
          task_attempt_id?: string | null
          total_chunks?: number | null
          transcription_language?: string | null
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_linked_recording_id_fkey"
            columns: ["linked_recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "recordings_task_attempt_id_fkey"
            columns: ["task_attempt_id"]
            isOneToOne: false
            referencedRelation: "prototype_test_task_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      session: {
        Row: {
          createdAt: string | null
          expiresAt: string
          id: string
          ipAddress: string | null
          token: string
          updatedAt: string | null
          userAgent: string | null
          userId: string
        }
        Insert: {
          createdAt?: string | null
          expiresAt: string
          id: string
          ipAddress?: string | null
          token: string
          updatedAt?: string | null
          userAgent?: string | null
          userId: string
        }
        Update: {
          createdAt?: string | null
          expiresAt?: string
          id?: string
          ipAddress?: string | null
          token?: string
          updatedAt?: string | null
          userAgent?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          branding: Json | null
          closing_rule: Json | null
          created_at: string | null
          description: string | null
          email_notification_settings: Json | null
          file_attachments: Json | null
          folder_id: string | null
          id: string
          is_archived: boolean
          language: string | null
          last_opened_at: string | null
          last_response_at: string | null
          launched_at: string | null
          participant_requirements: string | null
          password: string | null
          project_id: string
          public_results_token: string | null
          purpose: string | null
          recordings_deleted_at: string | null
          response_prevention_settings: Json | null
          retention_warning_sent_at: string | null
          session_recording_settings: Json | null
          session_replay_enabled: boolean | null
          settings: Json | null
          share_code: string | null
          sharing_settings: Json | null
          status: string | null
          study_type: string
          thank_you_message: string | null
          title: string
          updated_at: string | null
          url_slug: string | null
          user_id: string | null
          welcome_message: string | null
        }
        Insert: {
          branding?: Json | null
          closing_rule?: Json | null
          created_at?: string | null
          description?: string | null
          email_notification_settings?: Json | null
          file_attachments?: Json | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          language?: string | null
          last_opened_at?: string | null
          last_response_at?: string | null
          launched_at?: string | null
          participant_requirements?: string | null
          password?: string | null
          project_id: string
          public_results_token?: string | null
          purpose?: string | null
          recordings_deleted_at?: string | null
          response_prevention_settings?: Json | null
          retention_warning_sent_at?: string | null
          session_recording_settings?: Json | null
          session_replay_enabled?: boolean | null
          settings?: Json | null
          share_code?: string | null
          sharing_settings?: Json | null
          status?: string | null
          study_type: string
          thank_you_message?: string | null
          title: string
          updated_at?: string | null
          url_slug?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Update: {
          branding?: Json | null
          closing_rule?: Json | null
          created_at?: string | null
          description?: string | null
          email_notification_settings?: Json | null
          file_attachments?: Json | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          language?: string | null
          last_opened_at?: string | null
          last_response_at?: string | null
          launched_at?: string | null
          participant_requirements?: string | null
          password?: string | null
          project_id?: string
          public_results_token?: string | null
          purpose?: string | null
          recordings_deleted_at?: string | null
          response_prevention_settings?: Json | null
          retention_warning_sent_at?: string | null
          session_recording_settings?: Json | null
          session_replay_enabled?: boolean | null
          settings?: Json | null
          share_code?: string | null
          sharing_settings?: Json | null
          status?: string | null
          study_type?: string
          thank_you_message?: string | null
          title?: string
          updated_at?: string | null
          url_slug?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studies_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_comments: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          mentions: string[] | null
          parent_comment_id: string | null
          study_id: string
          thread_position: number | null
          updated_at: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          mentions?: string[] | null
          parent_comment_id?: string | null
          study_id: string
          thread_position?: number | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          mentions?: string[] | null
          parent_comment_id?: string | null
          study_id?: string
          thread_position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "study_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_comments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_comments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_comments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_digest_queue: {
        Row: {
          id: string
          last_updated: string
          responses_count: number
          responses_since: string
          study_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          last_updated?: string
          responses_count?: number
          responses_since?: string
          study_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          last_updated?: string
          responses_count?: number
          responses_since?: string
          study_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_digest_queue_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_digest_queue_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_digest_queue_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_flow_questions: {
        Row: {
          branching_logic: Json | null
          config: Json | null
          created_at: string | null
          custom_section_id: string | null
          description: string | null
          display_logic: Json | null
          id: string
          is_required: boolean | null
          position: number
          question_text: string
          question_text_html: string | null
          question_type: string
          section: string
          study_id: string
          updated_at: string | null
        }
        Insert: {
          branching_logic?: Json | null
          config?: Json | null
          created_at?: string | null
          custom_section_id?: string | null
          description?: string | null
          display_logic?: Json | null
          id?: string
          is_required?: boolean | null
          position?: number
          question_text: string
          question_text_html?: string | null
          question_type: string
          section: string
          study_id: string
          updated_at?: string | null
        }
        Update: {
          branching_logic?: Json | null
          config?: Json | null
          created_at?: string | null
          custom_section_id?: string | null
          description?: string | null
          display_logic?: Json | null
          id?: string
          is_required?: boolean | null
          position?: number
          question_text?: string
          question_text_html?: string | null
          question_type?: string
          section?: string
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_flow_questions_custom_section_id_fkey"
            columns: ["custom_section_id"]
            isOneToOne: false
            referencedRelation: "survey_custom_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_questions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_questions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_questions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_flow_responses: {
        Row: {
          created_at: string | null
          id: string
          participant_id: string
          question_id: string
          response_time_ms: number | null
          response_value: Json
          study_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_id: string
          question_id: string
          response_time_ms?: number | null
          response_value: Json
          study_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_id?: string
          question_id?: string
          response_time_ms?: number | null
          response_value?: Json
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_flow_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "study_flow_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_flow_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_incentive_configs: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          enabled: boolean | null
          fulfillment_config: Json | null
          fulfillment_provider: string | null
          incentive_type: string | null
          study_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          enabled?: boolean | null
          fulfillment_config?: Json | null
          fulfillment_provider?: string | null
          incentive_type?: string | null
          study_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          enabled?: boolean | null
          fulfillment_config?: Json | null
          fulfillment_provider?: string | null
          incentive_type?: string | null
          study_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_incentive_configs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_incentive_configs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_incentive_configs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_question_notes: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          question_id: string
          study_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          question_id: string
          study_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          question_id?: string
          study_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_question_notes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "study_flow_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_section_notes: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          section: string
          study_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          section: string
          study_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          section?: string
          study_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_section_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_section_notes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_segments: {
        Row: {
          conditions: Json
          created_at: string
          description: string | null
          id: string
          name: string
          participant_count: number | null
          study_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          participant_count?: number | null
          study_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          participant_count?: number | null
          study_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_segments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_segments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_segments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_share_links: {
        Row: {
          allow_comments: boolean | null
          allow_download: boolean | null
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          last_viewed_at: string | null
          password_hash: string | null
          share_token: string
          study_id: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          allow_comments?: boolean | null
          allow_download?: boolean | null
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_viewed_at?: string | null
          password_hash?: string | null
          share_token?: string
          study_id: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          allow_comments?: boolean | null
          allow_download?: boolean | null
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_viewed_at?: string | null
          password_hash?: string | null
          share_token?: string
          study_id?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_share_links_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_share_links_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_share_links_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      study_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string | null
          id: string
          study_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          id?: string
          study_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          id?: string
          study_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tag_assignments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tag_assignments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tag_assignments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "study_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "study_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tags: {
        Row: {
          color: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          position: number | null
          tag_group: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          position?: number | null
          tag_group?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          position?: number | null
          tag_group?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_custom_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          parent_section: string
          position: number
          study_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          parent_section?: string
          position?: number
          study_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          parent_section?: string
          position?: number
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_custom_sections_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_custom_sections_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_custom_sections_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string | null
          id: string
          participant_id: string
          question_id: string
          response_time_ms: number | null
          response_value: Json
          study_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_id: string
          question_id: string
          response_time_ms?: number | null
          response_value: Json
          study_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_id?: string
          question_id?: string
          response_time_ms?: number | null
          response_value?: Json
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "study_flow_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      survey_rules: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          position: number
          study_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          position?: number
          study_id: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          position?: number
          study_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_rules_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_rules_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_rules_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      survey_variables: {
        Row: {
          created_at: string
          description: string | null
          formula: Json
          id: string
          name: string
          study_id: string
          updated_at: string
          variable_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          formula?: Json
          id?: string
          name: string
          study_id: string
          updated_at?: string
          variable_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          formula?: Json
          id?: string
          name?: string
          study_id?: string
          updated_at?: string
          variable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_variables_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_variables_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_variables_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      tasks: {
        Row: {
          correct_node_id: string | null
          correct_node_ids: Json | null
          created_at: string | null
          id: string
          position: number
          post_task_questions: Json | null
          question: string
          study_id: string
        }
        Insert: {
          correct_node_id?: string | null
          correct_node_ids?: Json | null
          created_at?: string | null
          id?: string
          position?: number
          post_task_questions?: Json | null
          question: string
          study_id: string
        }
        Update: {
          correct_node_id?: string | null
          correct_node_ids?: Json | null
          created_at?: string | null
          id?: string
          position?: number
          post_task_questions?: Json | null
          question?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_correct_node_id_fkey"
            columns: ["correct_node_id"]
            isOneToOne: false
            referencedRelation: "tree_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      transcripts: {
        Row: {
          confidence_avg: number | null
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          full_text: string | null
          id: string
          language: string | null
          last_retry_at: string | null
          model: string | null
          next_retry_at: string | null
          processing_time_ms: number | null
          provider: string | null
          recording_id: string
          retry_count: number
          segments: Json | null
          status: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          confidence_avg?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          full_text?: string | null
          id?: string
          language?: string | null
          last_retry_at?: string | null
          model?: string | null
          next_retry_at?: string | null
          processing_time_ms?: number | null
          provider?: string | null
          recording_id: string
          retry_count?: number
          segments?: Json | null
          status?: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          confidence_avg?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          full_text?: string | null
          id?: string
          language?: string | null
          last_retry_at?: string | null
          model?: string | null
          next_retry_at?: string | null
          processing_time_ms?: number | null
          provider?: string | null
          recording_id?: string
          retry_count?: number
          segments?: Json | null
          status?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_nodes: {
        Row: {
          created_at: string | null
          id: string
          label: string
          parent_id: string | null
          path: unknown
          position: number
          study_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          parent_id?: string | null
          path?: unknown
          position?: number
          study_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          parent_id?: string | null
          path?: unknown
          position?: number
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tree_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_nodes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_nodes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_nodes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      tree_test_post_task_responses: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          question_id: string
          study_id: string
          task_id: string
          tree_test_response_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          question_id: string
          study_id: string
          task_id: string
          tree_test_response_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          question_id?: string
          study_id?: string
          task_id?: string
          tree_test_response_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tree_test_post_task_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_post_task_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "tree_test_post_task_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_post_task_responses_tree_test_response_id_fkey"
            columns: ["tree_test_response_id"]
            isOneToOne: false
            referencedRelation: "tree_test_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_test_responses: {
        Row: {
          backtrack_count: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          is_direct: boolean | null
          is_skipped: boolean | null
          participant_id: string
          path_taken: string[]
          selected_node_id: string | null
          study_id: string
          task_id: string
          time_to_first_click_ms: number | null
          total_time_ms: number | null
        }
        Insert: {
          backtrack_count?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_direct?: boolean | null
          is_skipped?: boolean | null
          participant_id: string
          path_taken?: string[]
          selected_node_id?: string | null
          study_id: string
          task_id: string
          time_to_first_click_ms?: number | null
          total_time_ms?: number | null
        }
        Update: {
          backtrack_count?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_direct?: boolean | null
          is_skipped?: boolean | null
          participant_id?: string
          path_taken?: string[]
          selected_node_id?: string | null
          study_id?: string
          task_id?: string
          time_to_first_click_ms?: number | null
          total_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tree_test_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_responses_selected_node_id_fkey"
            columns: ["selected_node_id"]
            isOneToOne: false
            referencedRelation: "tree_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_test_responses_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
          {
            foreignKeyName: "tree_test_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          createdAt: string | null
          email: string
          emailVerified: boolean | null
          firstName: string | null
          id: string
          image: string | null
          lastName: string | null
          name: string | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          email: string
          emailVerified?: boolean | null
          firstName?: string | null
          id: string
          image?: string | null
          lastName?: string | null
          name?: string | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          email?: string
          emailVerified?: boolean | null
          firstName?: string | null
          id?: string
          image?: string | null
          lastName?: string | null
          name?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          analytics_enabled: boolean | null
          avatar_url: string | null
          created_at: string | null
          dashboard_show_archived: boolean | null
          dashboard_table_density: string | null
          dashboard_theme: string | null
          default_background_color: string | null
          default_closing_rule_type: string | null
          default_language: string | null
          default_logo_size: number | null
          default_logo_url: string | null
          default_max_participants: number | null
          default_milestone_values: number[] | null
          default_notifications_enabled: boolean | null
          default_notify_daily_digest: boolean | null
          default_notify_every_response: boolean | null
          default_notify_milestones: boolean | null
          default_notify_on_close: boolean | null
          default_primary_color: string | null
          default_radius_option: string | null
          default_response_prevention_level: string | null
          default_style_preset: string | null
          default_theme_mode: string | null
          display_name_preference: string | null
          email_marketing: boolean | null
          email_product_updates: boolean | null
          email_security_alerts: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          dashboard_show_archived?: boolean | null
          dashboard_table_density?: string | null
          dashboard_theme?: string | null
          default_background_color?: string | null
          default_closing_rule_type?: string | null
          default_language?: string | null
          default_logo_size?: number | null
          default_logo_url?: string | null
          default_max_participants?: number | null
          default_milestone_values?: number[] | null
          default_notifications_enabled?: boolean | null
          default_notify_daily_digest?: boolean | null
          default_notify_every_response?: boolean | null
          default_notify_milestones?: boolean | null
          default_notify_on_close?: boolean | null
          default_primary_color?: string | null
          default_radius_option?: string | null
          default_response_prevention_level?: string | null
          default_style_preset?: string | null
          default_theme_mode?: string | null
          display_name_preference?: string | null
          email_marketing?: boolean | null
          email_product_updates?: boolean | null
          email_security_alerts?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          dashboard_show_archived?: boolean | null
          dashboard_table_density?: string | null
          dashboard_theme?: string | null
          default_background_color?: string | null
          default_closing_rule_type?: string | null
          default_language?: string | null
          default_logo_size?: number | null
          default_logo_url?: string | null
          default_max_participants?: number | null
          default_milestone_values?: number[] | null
          default_notifications_enabled?: boolean | null
          default_notify_daily_digest?: boolean | null
          default_notify_every_response?: boolean | null
          default_notify_milestones?: boolean | null
          default_notify_on_close?: boolean | null
          default_primary_color?: string | null
          default_radius_option?: string | null
          default_response_prevention_level?: string | null
          default_style_preset?: string | null
          default_theme_mode?: string | null
          display_name_preference?: string | null
          email_marketing?: boolean | null
          email_product_updates?: boolean | null
          email_security_alerts?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification: {
        Row: {
          createdAt: string | null
          expiresAt: string
          id: string
          identifier: string
          updatedAt: string | null
          value: string
        }
        Insert: {
          createdAt?: string | null
          expiresAt: string
          id: string
          identifier: string
          updatedAt?: string | null
          value: string
        }
        Update: {
          createdAt?: string | null
          expiresAt?: string
          id?: string
          identifier?: string
          updatedAt?: string | null
          value?: string
        }
        Relationships: []
      }
      widget_impressions: {
        Row: {
          created_at: string
          fingerprint_hash: string | null
          first_seen_at: string
          has_participated: boolean
          id: string
          impression_count: number | null
          ip_hash: string
          last_seen_at: string
          participated_at: string | null
          study_id: string
          updated_at: string
          user_agent: string | null
          visitor_hash: string
        }
        Insert: {
          created_at?: string
          fingerprint_hash?: string | null
          first_seen_at?: string
          has_participated?: boolean
          id?: string
          impression_count?: number | null
          ip_hash: string
          last_seen_at?: string
          participated_at?: string | null
          study_id: string
          updated_at?: string
          user_agent?: string | null
          visitor_hash: string
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string | null
          first_seen_at?: string
          has_participated?: boolean
          id?: string
          impression_count?: number | null
          ip_hash?: string
          last_seen_at?: string
          participated_at?: string | null
          study_id?: string
          updated_at?: string
          user_agent?: string | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_impressions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_impressions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_impressions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      widget_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          first_impression_at: string
          has_clicked: boolean
          has_dismissed: boolean
          has_participated: boolean
          id: string
          impression_count: number | null
          ip_hash: string | null
          last_impression_at: string
          participant_id: string | null
          session_id: string
          study_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          first_impression_at?: string
          has_clicked?: boolean
          has_dismissed?: boolean
          has_participated?: boolean
          id?: string
          impression_count?: number | null
          ip_hash?: string | null
          last_impression_at?: string
          participant_id?: string | null
          session_id: string
          study_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          first_impression_at?: string
          has_clicked?: boolean
          has_dismissed?: boolean
          has_participated?: boolean
          id?: string
          impression_count?: number | null
          ip_hash?: string | null
          last_impression_at?: string
          participant_id?: string | null
          session_id?: string
          study_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_sessions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      yjs_documents: {
        Row: {
          created_at: string
          doc_name: string
          id: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_name: string
          id?: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_name?: string
          id?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      insights_with_counts: {
        Row: {
          collaborator_count: number | null
          created_at: string | null
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          evidence_count: number | null
          id: string | null
          insight_type: string | null
          is_deleted: boolean | null
          organization_id: string | null
          priority: string | null
          project_id: string | null
          published_at: string | null
          published_by_user_id: string | null
          status: string | null
          study_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "study_permissions"
            referencedColumns: ["study_id"]
          },
        ]
      }
      project_permissions: {
        Row: {
          effective_role: string | null
          organization_id: string | null
          project_id: string | null
          source: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      studies_with_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_archived: boolean | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          study_type: string | null
          tags: Json[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_permissions: {
        Row: {
          effective_role: string | null
          organization_id: string | null
          project_id: string | null
          source: string | null
          study_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_permissions"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_orphaned_yjs_documents: { Args: never; Returns: number }
      confirm_recording_chunk: {
        Args: {
          p_chunk_number: number
          p_chunk_size: number
          p_etag: string
          p_recording_id: string
          p_session_token: string
        }
        Returns: {
          chunks_uploaded: number
          is_complete: boolean
          total_chunks: number
        }[]
      }
      create_default_panel_tags: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_annotations_at_time: {
        Args: { p_recording_id: string; p_time_ms: number }
        Returns: {
          annotation_type: string
          content: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_ms: number
          id: string
          layer: number
          recording_id: string
          start_ms: number
          style: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "recording_annotations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_annotations_in_range: {
        Args: { p_end_ms: number; p_recording_id: string; p_start_ms: number }
        Returns: {
          annotation_type: string
          content: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_ms: number
          id: string
          layer: number
          recording_id: string
          start_ms: number
          style: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "recording_annotations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_link_analytics_summary: {
        Args: { p_study_id: string }
        Returns: {
          completes: number
          quota_fulls: number
          screenouts: number
          source: string
          starts: number
          views: number
        }[]
      }
      get_recording_with_webcam: {
        Args: { p_recording_id: string }
        Returns: {
          primary_recording: Database["public"]["Tables"]["recordings"]["Row"]
          webcam_recording: Database["public"]["Tables"]["recordings"]["Row"]
        }[]
      }
      increment_share_view_count: {
        Args: { p_share_code: string }
        Returns: {
          access_level: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          password_hash: string | null
          recording_id: string
          revoked_at: string | null
          share_code: string
          updated_at: string
          view_count: number
        }
        SetofOptions: {
          from: "*"
          to: "recording_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      nanoid: { Args: { size?: number }; Returns: string }
      text2ltree: { Args: { "": string }; Returns: unknown }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
