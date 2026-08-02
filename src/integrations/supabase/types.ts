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
      ads: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          duration: number
          id: string
          title: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          title: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_purchases: {
        Row: {
          chats_amount: number
          credits_amount: number
          croins_spent: number
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          chats_amount?: number
          credits_amount?: number
          croins_spent?: number
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          chats_amount?: number
          credits_amount?: number
          croins_spent?: number
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_categories: {
        Row: {
          category: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_actions: {
        Row: {
          action_type: string
          bot_id: string
          created_at: string
          id: string
          target_id: string
        }
        Insert: {
          action_type: string
          bot_id: string
          created_at?: string
          id?: string
          target_id: string
        }
        Update: {
          action_type?: string
          bot_id?: string
          created_at?: string
          id?: string
          target_id?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          active: boolean
          comment_posts: boolean
          created_at: string
          created_by: string | null
          id: string
          last_run_at: string | null
          persona: string
          reply_chats: boolean
          system_prompt: string
        }
        Insert: {
          active?: boolean
          comment_posts?: boolean
          created_at?: string
          created_by?: string | null
          id: string
          last_run_at?: string | null
          persona?: string
          reply_chats?: boolean
          system_prompt?: string
        }
        Update: {
          active?: boolean
          comment_posts?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          last_run_at?: string | null
          persona?: string
          reply_chats?: boolean
          system_prompt?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          conversation_id: string
          created_at: string | null
          from_user_id: string
          id: string
          signal_data: string
          signal_type: string
          to_user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          from_user_id: string
          id?: string
          signal_data: string
          signal_type: string
          to_user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          signal_data?: string
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_memberships: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          name: string
          perks: string | null
          price_croins: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          name: string
          perks?: string | null
          price_croins: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          name?: string
          perks?: string | null
          price_croins?: number
          updated_at?: string
        }
        Relationships: []
      }
      channel_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          membership_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          membership_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          membership_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          kicked_at: string | null
          role: Database["public"]["Enums"]["group_role"] | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          kicked_at?: string | null
          role?: Database["public"]["Enums"]["group_role"] | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          kicked_at?: string | null
          role?: Database["public"]["Enums"]["group_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          group_image_url: string | null
          id: string
          is_ai_chat: boolean
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_image_url?: string | null
          id?: string
          is_ai_chat?: boolean
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_image_url?: string | null
          id?: string
          is_ai_chat?: boolean
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_emojis: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          image_url: string
          membership_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          image_url: string
          membership_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string
          membership_id?: string | null
          name?: string
        }
        Relationships: []
      }
      creator_pro_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_verifications: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_emojis: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          image_url: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          image_url: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_emojis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_verification: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
          verification_email: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
          verification_email?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          verification_email?: string | null
        }
        Relationships: []
      }
      device_verification_codes: {
        Row: {
          code: string
          created_at: string
          device_fingerprint: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          device_fingerprint: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          device_fingerprint?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      emoji_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      errors: {
        Row: {
          additional_info: Json | null
          component_stack: string | null
          error_message: string
          error_stack: string | null
          id: string
          timestamp: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_info?: Json | null
          component_stack?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          timestamp?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_info?: Json | null
          component_stack?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          timestamp?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_creators: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_creators_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_creators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_response: string | null
          admin_response_at: string | null
          admin_response_by: string | null
          created_at: string
          id: string
          important: boolean
          message: string
          rating: number | null
          response_read: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          admin_response_at?: string | null
          admin_response_by?: string | null
          created_at?: string
          id?: string
          important?: boolean
          message: string
          rating?: number | null
          response_read?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          admin_response_at?: string | null
          admin_response_by?: string | null
          created_at?: string
          id?: string
          important?: boolean
          message?: string
          rating?: number | null
          response_read?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_admin_response_by_fkey"
            columns: ["admin_response_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string
        }
        Relationships: []
      }
      livestream_chat: {
        Row: {
          created_at: string
          croins_gift: number
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          croins_gift?: number
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          croins_gift?: number
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: []
      }
      livestream_likes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          stream_id?: string
          user_id?: string
        }
        Relationships: []
      }
      livestream_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          signal_data: string
          signal_type: string
          stream_id: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          signal_data: string
          signal_type: string
          stream_id: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          signal_data?: string
          signal_type?: string
          stream_id?: string
          to_user_id?: string | null
        }
        Relationships: []
      }
      livestreams: {
        Row: {
          adults_only: boolean
          category: string
          created_at: string
          description: string | null
          dislikes_count: number
          ended_at: string | null
          id: string
          likes_count: number
          members_only: boolean
          started_at: string
          status: string
          thumbnail_url: string | null
          title: string
          user_id: string
          viewer_count: number
        }
        Insert: {
          adults_only?: boolean
          category?: string
          created_at?: string
          description?: string | null
          dislikes_count?: number
          ended_at?: string | null
          id?: string
          likes_count?: number
          members_only?: boolean
          started_at?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          user_id: string
          viewer_count?: number
        }
        Update: {
          adults_only?: boolean
          category?: string
          created_at?: string
          description?: string | null
          dislikes_count?: number
          ended_at?: string | null
          id?: string
          likes_count?: number
          members_only?: boolean
          started_at?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "livestreams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_custom: boolean
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          is_custom?: boolean
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_custom?: boolean
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_system: boolean | null
          system_type: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          system_type?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          system_type?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          voice_url?: string | null
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
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mods: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          downloads: number
          file_url: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          downloads?: number
          file_url: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          downloads?: number
          file_url?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_likes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          audio_url: string
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          dislikes_count: number
          duration: number
          id: string
          likes_count: number
          members_only: boolean
          plays_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dislikes_count?: number
          duration?: number
          id?: string
          likes_count?: number
          members_only?: boolean
          plays_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dislikes_count?: number
          duration?: number
          id?: string
          likes_count?: number
          members_only?: boolean
          plays_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_accounts: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_accounts_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          status: string
          subcross_post_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          status?: string
          subcross_post_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string
          subcross_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_subcross_post_id_fkey"
            columns: ["subcross_post_id"]
            isOneToOne: false
            referencedRelation: "subcross_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          dislikes_count: number
          id: string
          image_url: string | null
          likes_count: number
          poll_boosts: Json
          poll_options: Json | null
          poll_question: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          dislikes_count?: number
          id?: string
          image_url?: string | null
          likes_count?: number
          poll_boosts?: Json
          poll_options?: Json | null
          poll_question?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          dislikes_count?: number
          id?: string
          image_url?: string | null
          likes_count?: number
          poll_boosts?: Json
          poll_options?: Json | null
          poll_question?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean
          allow_group_invites_from_strangers: boolean
          avatar_url: string | null
          bio: string | null
          boost_followers: number
          created_at: string
          creator_username: string | null
          crossatrix_user_id: string | null
          id: string
          last_seen: string | null
          show_online_status: boolean
          text_hue: number | null
          text_lightness: number | null
          text_saturation: number | null
          username: string
        }
        Insert: {
          age_verified?: boolean
          allow_group_invites_from_strangers?: boolean
          avatar_url?: string | null
          bio?: string | null
          boost_followers?: number
          created_at?: string
          creator_username?: string | null
          crossatrix_user_id?: string | null
          id: string
          last_seen?: string | null
          show_online_status?: boolean
          text_hue?: number | null
          text_lightness?: number | null
          text_saturation?: number | null
          username: string
        }
        Update: {
          age_verified?: boolean
          allow_group_invites_from_strangers?: boolean
          avatar_url?: string | null
          bio?: string | null
          boost_followers?: number
          created_at?: string
          creator_username?: string | null
          crossatrix_user_id?: string | null
          id?: string
          last_seen?: string | null
          show_online_status?: boolean
          text_hue?: number | null
          text_lightness?: number | null
          text_saturation?: number | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_broadcasters: {
        Row: {
          created_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      radio_channel_broadcasters: {
        Row: {
          added_by: string | null
          channel_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          channel_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          channel_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_channel_broadcasters_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "radio_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_channels: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      radio_news: {
        Row: {
          broadcaster_id: string
          channel_id: string | null
          created_at: string
          id: string
          text: string
        }
        Insert: {
          broadcaster_id: string
          channel_id?: string | null
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          broadcaster_id?: string
          channel_id?: string | null
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_news_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "radio_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_now_playing: {
        Row: {
          channel_id: string | null
          id: number
          news_started_at: string | null
          news_text: string | null
          song_id: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          id?: number
          news_started_at?: string | null
          news_text?: string | null
          song_id?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          id?: number
          news_started_at?: string | null
          news_text?: string | null
          song_id?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_now_playing_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "radio_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_now_playing_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "radio_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_songs: {
        Row: {
          artist: string | null
          audio_url: string
          channel_id: string | null
          cover_url: string | null
          created_at: string
          duration_seconds: number
          id: string
          title: string
          uploader_id: string
        }
        Insert: {
          artist?: string | null
          audio_url: string
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          title: string
          uploader_id: string
        }
        Update: {
          artist?: string | null
          audio_url?: string
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          title?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_songs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "radio_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      render_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_path: string | null
          output_path: string | null
          progress: number
          recipe: Json
          status: string
          updated_at: string
          user_id: string
          worker_job_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_path?: string | null
          output_path?: string | null
          progress?: number
          recipe?: Json
          status?: string
          updated_at?: string
          user_id: string
          worker_job_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_path?: string | null
          output_path?: string | null
          progress?: number
          recipe?: Json
          status?: string
          updated_at?: string
          user_id?: string
          worker_job_id?: string | null
        }
        Relationships: []
      }
      subcross_comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          is_like: boolean
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          is_like: boolean
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          is_like?: boolean
          user_id?: string
        }
        Relationships: []
      }
      subcross_comments: {
        Row: {
          content: string
          created_at: string
          dislikes_count: number
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dislikes_count?: number
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dislikes_count?: number
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcross_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "subcross_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcross_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcross_members: {
        Row: {
          id: string
          joined_at: string
          subcross_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          subcross_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          subcross_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subcross_post_votes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subcross_posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          dislikes_count: number
          id: string
          image_url: string | null
          likes_count: number
          link_url: string | null
          subcross_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          dislikes_count?: number
          id?: string
          image_url?: string | null
          likes_count?: number
          link_url?: string | null
          subcross_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          dislikes_count?: number
          id?: string
          image_url?: string | null
          likes_count?: number
          link_url?: string | null
          subcross_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcross_posts_subcross_id_fkey"
            columns: ["subcross_id"]
            isOneToOne: false
            referencedRelation: "subcrosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcross_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcrosses: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          members_count: number
          name: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          members_count?: number
          name: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          members_count?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ad_requests: {
        Row: {
          created_at: string
          duration: number
          id: string
          price: number
          review_note: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number
          id?: string
          price?: number
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          price?: number
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_changelog_seen: {
        Row: {
          id: string
          last_seen_changelog_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_changelog_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_changelog_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_content_blocks: {
        Row: {
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_installed_mods: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          mod_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          mod_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          mod_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          ai_reason: string | null
          ai_reviewed: boolean | null
          ai_reviewed_at: string | null
          ai_verdict: string | null
          conversation_id: string | null
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          ai_reason?: string | null
          ai_reviewed?: boolean | null
          ai_reviewed_at?: string | null
          ai_verdict?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          ai_reason?: string | null
          ai_reviewed?: boolean | null
          ai_reviewed_at?: string | null
          ai_verdict?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warnings: {
        Row: {
          created_at: string
          id: string
          reason: string
          related_report_id: string | null
          user_id: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          related_report_id?: string | null
          user_id: string
          warning_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          related_report_id?: string | null
          user_id?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "user_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_categories: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      video_category_views: {
        Row: {
          category: string
          id: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          category: string
          id?: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          category?: string
          id?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_not_interested: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          category: string
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_not_interested_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reports: {
        Row: {
          ai_reason: string | null
          ai_reviewed: boolean | null
          ai_reviewed_at: string | null
          ai_verdict: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          video_id: string
        }
        Insert: {
          ai_reason?: string | null
          ai_reviewed?: boolean | null
          ai_reviewed_at?: string | null
          ai_verdict?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          video_id: string
        }
        Update: {
          ai_reason?: string | null
          ai_reviewed?: boolean | null
          ai_reviewed_at?: string | null
          ai_verdict?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_weekly_stats: {
        Row: {
          id: string
          updated_at: string
          video_id: string
          week_start: string
          weekly_dislikes: number
          weekly_likes: number
          weekly_views: number
        }
        Insert: {
          id?: string
          updated_at?: string
          video_id: string
          week_start: string
          weekly_dislikes?: number
          weekly_likes?: number
          weekly_views?: number
        }
        Update: {
          id?: string
          updated_at?: string
          video_id?: string
          week_start?: string
          weekly_dislikes?: number
          weekly_likes?: number
          weekly_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_weekly_stats_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          adults_only: boolean
          allowed_membership_ids: string[]
          appeal_status: string
          category: string
          comments_count: number
          created_at: string
          description: string | null
          dislikes_count: number
          duration: number | null
          id: string
          likes_count: number
          members_only: boolean
          moderation_reason: string | null
          moderation_status: string
          staff_rated_by: string | null
          staff_rating: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          views_count: number
        }
        Insert: {
          adults_only?: boolean
          allowed_membership_ids?: string[]
          appeal_status?: string
          category?: string
          comments_count?: number
          created_at?: string
          description?: string | null
          dislikes_count?: number
          duration?: number | null
          id?: string
          likes_count?: number
          members_only?: boolean
          moderation_reason?: string | null
          moderation_status?: string
          staff_rated_by?: string | null
          staff_rating?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
          views_count?: number
        }
        Update: {
          adults_only?: boolean
          allowed_membership_ids?: string[]
          appeal_status?: string
          category?: string
          comments_count?: number
          created_at?: string
          description?: string | null
          dislikes_count?: number
          duration?: number | null
          id?: string
          likes_count?: number
          members_only?: boolean
          moderation_reason?: string | null
          moderation_status?: string
          staff_rated_by?: string | null
          staff_rating?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "videos_staff_rated_by_fkey"
            columns: ["staff_rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_group_member: {
        Args: { _conversation_id: string; _new_user_id: string }
        Returns: boolean
      }
      change_group_role: {
        Args: {
          _conversation_id: string
          _new_role: Database["public"]["Enums"]["group_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      create_group_conversation: {
        Args: { group_name: string; participant_ids: string[] }
        Returns: string
      }
      data_api: { Args: { action: string }; Returns: Json }
      deduct_ai_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      delete_group: { Args: { _conversation_id: string }; Returns: boolean }
      demote_from_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      find_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_or_reset_ai_credits: { Args: { p_user_id: string }; Returns: number }
      has_group_role: {
        Args: {
          _conversation_id: string
          _role: Database["public"]["Enums"]["group_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_app_owner: { Args: { _user_id: string }; Returns: boolean }
      is_channel_broadcaster: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_channel_owner: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_content_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_elder_moderator_or_above: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_moderator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_moderator_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_radio_broadcaster: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      leave_group: { Args: { _conversation_id: string }; Returns: boolean }
      owner_boost: {
        Args: {
          p_amount: number
          p_kind: string
          p_sub_kind?: string
          p_target_id: string
        }
        Returns: boolean
      }
      promote_to_admin: { Args: { target_user_id: string }; Returns: undefined }
      remove_group_member: {
        Args: { _conversation_id: string; _target_user_id: string }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "moderator_lite"
        | "moderator"
        | "elder_moderator"
      group_role: "admin" | "moderator" | "member"
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
      app_role: [
        "admin",
        "user",
        "moderator_lite",
        "moderator",
        "elder_moderator",
      ],
      group_role: ["admin", "moderator", "member"],
    },
  },
} as const
