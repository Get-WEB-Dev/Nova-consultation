/**
 * Nova Health Consultancy — Supabase Database Types
 * Auto-generated shape matching 001_schema.sql
 *
 * To regenerate from a live project:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = 'patient' | 'doctor' | 'professional' | 'admin';
export type DoctorStatusDB = 'available' | 'busy' | 'in_consultation' | 'offline';
export type ConsultationType = 'video' | 'in_person' | 'both';
export type GenderType = 'male' | 'female' | 'other';
export type ConsultStatus = 'active' | 'completed' | 'missed' | 'follow_up' | 'waiting' | 'cancelled';
export type QueueStatusDB = 'waiting' | 'called' | 'skipped' | 'joined' | 'left';
export type NotifTypeDB = 'doctor_available' | 'queue_called' | 'follow_up' | 'consultation_complete' | 'saved_doctor_online' | 'chat' | 'system';
export type MessageSender = 'patient' | 'doctor';
export type AttachmentType = 'image' | 'pdf' | 'document' | 'other';

export interface Database {
  public: {
    Tables: {

      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          dob: string | null;
          avatar_url: string | null;
          bio: string | null;
          blood_type: string | null;
          allergies: string | null;
          emergency_contact: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };

      patients: {
        Row: {
          id: string;
          user_id: string;
          dob: string | null;
          phone: string | null;
          blood_type: string | null;
          allergies: string | null;
          emergency_contact: string | null;
          medical_history: string | null;
          insurance_provider: string | null;
          insurance_id: string | null;
          preferred_language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };

      admins: {
        Row: {
          id: string;
          user_id: string;
          department: string | null;
          permissions: string[];
          is_super_admin: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admins']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['admins']['Insert']>;
      };

      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          specialty: string;
          hospital: string | null;
          experience_years: number;
          rating: number;
          review_count: number;
          fee: number;
          languages: string[];
          tags: string[];
          gender: GenderType | null;
          patients_served: number;
          consultation_type: ConsultationType;
          status: DoctorStatusDB;
          location_city: string | null;
          consultation_duration_mins: number;
          next_available_slot: string | null;
          video_provider_identity: string | null;
          slug: string | null;
          is_verified: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doctor_profiles']['Row'], 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count' | 'patients_served'>;
        Update: Partial<Database['public']['Tables']['doctor_profiles']['Insert']>;
      };

      doctor_availability: {
        Row: {
          id: string;
          doctor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doctor_availability']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['doctor_availability']['Insert']>;
      };

      consultations: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          status: ConsultStatus;
          is_follow_up: boolean;
          follow_up_scheduled_at: string | null;
          started_at: string | null;
          ended_at: string | null;
          duration_minutes: number | null;
          notes: string | null;
          summary: string | null;
          video_room_name: string | null;
          video_session_token: string | null;
          patient_rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consultations']['Row'], 'id' | 'created_at' | 'updated_at' | 'video_room_name'>;
        Update: Partial<Database['public']['Tables']['consultations']['Insert']>;
      };

      consultation_queue: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          consultation_id: string | null;
          queue_position: number;
          estimated_wait_mins: number;
          status: QueueStatusDB;
          joined_at: string;
          called_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['consultation_queue']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['consultation_queue']['Insert']>;
      };

      messages: {
        Row: {
          id: string;
          consultation_id: string;
          sender_id: string;
          sender_role: MessageSender;
          body: string | null;
          attachment_url: string | null;
          attachment_name: string | null;
          attachment_type: AttachmentType | null;
          attachment_size: number | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };

      saved_doctors: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          saved_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_doctors']['Row'], 'id' | 'saved_at'>;
        Update: never;
      };

      remind_me: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          notified: boolean;
          notified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['remind_me']['Row'], 'id' | 'created_at' | 'notified' | 'notified_at'>;
        Update: Partial<Database['public']['Tables']['remind_me']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotifTypeDB;
          title: string;
          message: string | null;
          read: boolean;
          doctor_name: string | null;
          doctor_avatar: string | null;
          action_url: string | null;
          ref_id: string | null;
          ref_table: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };

      reviews: {
        Row: {
          id: string;
          consultation_id: string;
          doctor_id: string;
          patient_id: string;
          rating: number;
          comment: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };

      blog_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['blog_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['blog_categories']['Insert']>;
      };

      blog_posts: {
        Row: {
          id: string;
          doctor_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          content: string;
          excerpt: string | null;
          cover_image: string | null;
          thumbnail: string | null;
          video_url: string | null;
          tags: string[];
          likes: number;
          comment_count: number;
          meta_title: string | null;
          meta_description: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['blog_posts']['Row'], 'id' | 'created_at' | 'updated_at' | 'likes' | 'comment_count'>;
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>;
      };

      blog_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          is_approved: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['blog_comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['blog_comments']['Insert']>;
      };

    };
  };
}
