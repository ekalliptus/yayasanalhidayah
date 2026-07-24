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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: unknown
          metadata: Json
          summary: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          summary?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          summary?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          id: string
          title: string
          category: string
          tag: string
          slug: string
          image: string
          alt: string
          description: string
          donasi_url: string
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
          target_amount: number | null
          raised_amount: number | null
          donatur_count: number | null
          days_left: number | null
          progress_pct: number | null
          wp_campaign_id: number | null
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          title: string
          category: string
          tag?: string
          slug: string
          image: string
          alt?: string
          description: string
          donasi_url: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
          target_amount?: number | null
          raised_amount?: number | null
          donatur_count?: number | null
          days_left?: number | null
          progress_pct?: number | null
          wp_campaign_id?: number | null
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          category?: string
          tag?: string
          slug?: string
          image?: string
          alt?: string
          description?: string
          donasi_url?: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
          target_amount?: number | null
          raised_amount?: number | null
          donatur_count?: number | null
          days_left?: number | null
          progress_pct?: number | null
          wp_campaign_id?: number | null
          last_synced_at?: string | null
        }
        Relationships: []
      }
      trust_logos: {
        Row: {
          id: string
          name: string
          src: string
          url: string
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          src: string
          url?: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          src?: string
          url?: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      why_us: {
        Row: {
          id: string
          n: string
          title: string
          descr: string
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          n: string
          title: string
          descr: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          n?: string
          title?: string
          descr?: string
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: Json | null
          content_html: string | null
          cover_image: string | null
          cover_focal: string | null
          cover_ratio: string | null
          cover_size: string | null
          created_at: string
          excerpt: string | null
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          published_at: string | null
          reading_time: number | null
          slug: string
          status: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_image?: string | null
          cover_focal?: string | null
          cover_ratio?: string | null
          cover_size?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_image?: string | null
          cover_focal?: string | null
          cover_ratio?: string | null
          cover_size?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          honeypot: string | null
          id: string
          ip: unknown
          nama: string
          pesan: string
          phone: string
          status: string
          topik: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          honeypot?: string | null
          id?: string
          ip?: unknown
          nama: string
          pesan: string
          phone: string
          status?: string
          topik?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          honeypot?: string | null
          id?: string
          ip?: unknown
          nama?: string
          pesan?: string
          phone?: string
          status?: string
          topik?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          a: string
          created_at: string
          id: string
          is_published: boolean
          q: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          a: string
          created_at?: string
          id?: string
          is_published?: boolean
          q: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          a?: string
          created_at?: string
          id?: string
          is_published?: boolean
          q?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string
          descr: string
          id: string
          is_published: boolean
          n: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descr: string
          id?: string
          is_published?: boolean
          n: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descr?: string
          id?: string
          is_published?: boolean
          n?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          bg: string
          created_at: string
          id: string
          is_published: boolean
          meta: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          bg: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          bg?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          cap: string | null
          created_at: string
          id: string
          is_published: boolean
          sort_order: number
          src: string
          updated_at: string
        }
        Insert: {
          cap?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          src: string
          updated_at?: string
        }
        Update: {
          cap?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          src?: string
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt: string | null
          bucket: string
          created_at: string
          filename: string
          height: number | null
          id: string
          mime: string | null
          path: string
          size: number | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime?: string | null
          path: string
          size?: number | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime?: string | null
          path?: string
          size?: number | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      misi: {
        Row: {
          body: string
          created_at: string
          id: string
          is_published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      penerima: {
        Row: {
          alamat: string | null
          city: string
          created_at: string
          galon: number
          id: string
          is_published: boolean
          lat: number | null
          lng: number | null
          name: string
          province: string
          sort_order: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          city: string
          created_at?: string
          galon?: number
          id?: string
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          province?: string
          sort_order?: number
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          city?: string
          created_at?: string
          galon?: number
          id?: string
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          province?: string
          sort_order?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_slides: {
        Row: {
          cap: string | null
          created_at: string
          id: string
          is_published: boolean
          meta: string | null
          sort_order: number
          src: string
          updated_at: string
        }
        Insert: {
          cap?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta?: string | null
          sort_order?: number
          src: string
          updated_at?: string
        }
        Update: {
          cap?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta?: string | null
          sort_order?: number
          src?: string
          updated_at?: string
        }
        Relationships: []
      }
      rekening: {
        Row: {
          account_holder: string
          bank: string
          created_at: string
          id: string
          is_published: boolean
          label: string
          no: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder?: string
          bank: string
          created_at?: string
          id?: string
          is_published?: boolean
          label: string
          no: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank?: string
          created_at?: string
          id?: string
          is_published?: boolean
          label?: string
          no?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stats: {
        Row: {
          created_at: string
          grp: string
          id: string
          is_published: boolean
          label: string
          num: number
          sort_order: number
          suffix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grp: string
          id?: string
          is_published?: boolean
          label: string
          num: number
          sort_order?: number
          suffix?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grp?: string
          id?: string
          is_published?: boolean
          label?: string
          num?: number
          sort_order?: number
          suffix?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      team: {
        Row: {
          avatar: string | null
          created_at: string
          id: string
          is_published: boolean
          name: string
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          role: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          body: string
          created_at: string
          id: string
          is_published: boolean
          name: string
          photo: string | null
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_published?: boolean
          name: string
          photo?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          photo?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      values_list: {
        Row: {
          created_at: string
          descr: string
          id: string
          is_published: boolean
          n: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descr: string
          id?: string
          is_published?: boolean
          n: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descr?: string
          id?: string
          is_published?: boolean
          n?: string
          sort_order?: number
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
      get_user_role: { Args: never; Returns: string }
      heartbeat: { Args: never; Returns: string }
      increment_view: { Args: { p_slug: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_editor: { Args: never; Returns: boolean }
      last_heartbeat: { Args: never; Returns: string }
      prune_heartbeats: { Args: { p_days?: number }; Returns: number }
      record_activity: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_summary?: string
        }
        Returns: string
      }
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

// ── Convenience aliases (keep after regenerating types) ──────────────────────
// Tables<>, TablesInsert<>, TablesUpdate<> are already exported above by the generator.

export type Article = Tables<'articles'>;
export type Penerima = Tables<'penerima'>;
export type Testimonial = Tables<'testimonials'>;
export type Faq = Tables<'faqs'>;
export type Stat = Tables<'stats'>;
export type Feature = Tables<'features'>;
export type GalleryItem = Tables<'gallery'>;
export type HeroSlide = Tables<'hero_slides'>;
export type ProgramSlide = Tables<'program_slides'>;
export type TeamMember = Tables<'team'>;
export type ValueItem = Tables<'values_list'>;
export type Misi = Tables<'misi'>;
export type Rekening = Tables<'rekening'>;
export type Category = Tables<'categories'>;
export type Tag = Tables<'tags'>;
export type MediaItem = Tables<'media'>;
export type ActivityEntry = Tables<'activity_log'>;
export type ContactSubmission = Tables<'contact_submissions'>;
export type Profile = Tables<'profiles'>;

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type Role = 'super_admin' | 'owner' | 'admin' | 'editor';
export type ActivityAction =
  | 'create' | 'update' | 'delete' | 'login' | 'logout'
  | 'publish' | 'unpublish' | 'site_rebuild' | 'heartbeat';
