// Kiểu dữ liệu khớp với app/models.py của repo mstudent-backend

export type Category = 'deadline' | 'exam' | 'class_change' | 'event' | 'admin' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type Source = 'email' | 'lms' | 'zalo' | 'manual' | 'classroom' | 'sheet';

export interface Task {
  id: number;
  title: string;
  course: string | null;
  category: Category;
  due_at: string | null; // ISO 8601, +07:00
  location: string | null;
  action: string | null;
  priority: Priority;
  source: Source;
  message_id: string;
  status: string;
  reminders: string[];
  updated_from: string[];
  sources: string[]; // các nguồn đã góp vào việc (gộp giữa email / Classroom / bảng lớp…)
  note: string | null;
  // 003: lời mời sự kiện (rsvp null = việc thường)
  rsvp?: 'pending' | 'going' | 'declined' | null;
  event_end?: string | null;
  event_url?: string | null;
  register_url?: string | null;
  register_deadline?: string | null;
  mandatory?: boolean;
  fit_level?: 'high' | 'medium' | 'low' | null;
  fit_reason?: string | null;
  fit_mode?: string | null;
  form_meta?: FormMeta | null;
}

export interface TraceStep {
  agent: string;
  kind: 'llm' | 'rules' | 'python';
  ms: number;
  output?: unknown;
  error?: string;
}

export interface IngestResult {
  message_id: string;
  relevant: boolean;
  category: Category;
  reason: string;
  created: Task[];
  updated: Task[];
  mode: 'llm' | 'offline' | 'cache';
  trace: TraceStep[];
  duplicate: boolean;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  mode: 'llm' | 'offline';
  tool_calls: ToolCall[];
  document_context?: string | null;
}

export interface ChatFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  file?: Blob;
}

export interface Health {
  ok: boolean;
  mode: 'llm' | 'offline';
  model: string; // model trả lời (trích việc, trợ lý…)
  filter_model?: string; // model lọc thông báo; trùng `model` khi chưa bật Gemini Decision
  now: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  deadline: 'Hạn nộp',
  exam: 'Thi',
  class_change: 'Đổi lịch',
  event: 'Sự kiện',
  admin: 'Thủ tục',
  other: 'Khác',
};

// ---- Tài khoản & tích hợp ----

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  has_password: boolean;
  google_linked: boolean;
  gmail_connected: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface PublicConfig {
  registration_open: boolean;
  google: { enabled: boolean; web_client_id: string; ios_client_id: string; gmail: boolean };
}

export interface Stats {
  messages_read: number;
  noise_filtered: number;
  tasks_created: number;
  tasks_done: number;
  tasks_open: number;
  changes_caught: number;
  ai_runs: number;
  by_source: Record<string, number>;
}

export interface AiCheck {
  ok: boolean;
  mode: 'llm' | 'offline';
  model: string;
  latency_ms?: number;
  error?: string;
}

export interface GmailStatus {
  connected: boolean;
  email?: string;
  last_sync_at?: string | null;
}

export interface GmailSyncResult {
  scanned: number;
  new: number;
  tasks_created: number;
  tasks_updated: number;
  noise_filtered: number;
  results: IngestResult[];
}

// ---------------- Nguồn tự động (002) ----------------

export type SourceKind = 'gmail' | 'classroom' | 'ics' | 'sheet';

export interface SourceConnection {
  id: number;
  kind: SourceKind;
  label: string;
  enabled: boolean;
  last_run_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  created_at: string;
  last: { created: number; updated: number; skipped: number; mode: string } | null;
}

// ---------------- 003: hồ sơ học tập ----------------

export interface Profile {
  school_name: string;
  school_abbr: string;
  degree_level: '' | 'dai_hoc' | 'thac_si' | 'tien_si';
  major_code: string;
  major_name: string;
  student_id: string;
  class_name: string;
  phone: string;
  needs_profile: boolean;
}

// ---- 003: form đăng ký sự kiện ----

export type FormRole = 'name' | 'student_id' | 'email' | 'class_name' | 'school' | 'major' | 'phone';

/** Cấu trúc form công khai do máy chủ đọc: câu nào (entry) hỏi thông tin gì (role). Không chứa dữ liệu cá nhân. */
export interface FormMeta {
  form_id: string;
  fields: { entry: string; role: FormRole }[];
}
