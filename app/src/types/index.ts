export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  age: number | null;
  avatar_color: string;
  gender: string | null;  // "male" or "female"
  created_at: string;
}

export interface StudentProfile {
  child_id: string;
  current_level: number;
  learning_pace: string;
  correction_style: string;
  encouragement_style: string;
  instruction_file_id: string | null;
}

export interface Lesson {
  id: string;
  subject: string;
  level: number;
  title: string;
  description: string | null;
  lesson_type: string | null;
  content: Record<string, any>;
  order_index: number;
  created_at: string;
}

export interface LessonAssignment {
  id: string;
  child_id: string;
  lesson_id: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
  lesson?: Lesson;
}

export interface ProgressRecord {
  id: string;
  child_id: string;
  subject: string;
  level: number;
  current_lesson_index: number;
  mastery_score: number;
  streak_days: number;
  last_practice_date: string | null;
}

export interface Session {
  id: string;
  child_id: string;
  lesson_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  total_turns: number;
  correct_count: number;
  mistake_count: number;
}

export interface Reward {
  id: string;
  child_id: string;
  reward_type: string;
  reward_data: Record<string, any>;
  earned_at: string;
}

export interface InstructionFile {
  id: string;
  name: string;
  content: string;
  child_id: string | null;
  lesson_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ParentDashboardData {
  children: Child[];
  recent_sessions: Session[];
  progress_summaries: ProgressRecord[];
}

export interface KidDashboardData {
  child: Child;
  current_lesson: LessonAssignment | null;
  streak_days: number;
  rewards: Reward[];
  progress: ProgressRecord[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
