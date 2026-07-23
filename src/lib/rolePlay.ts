export type ScoreCategory = { key: string; label: string; description: string; weight?: number };
export type Scorecard = {
  categories: ScoreCategory[];
  red_flag_examples: string[];
  green_flag_examples: string[];
  prompt?: string;
};
export type Persona = {
  first_name: string;
  title: string;
  company: string;
  headshot_url?: string;
  headshot_index?: number;
  voice_id: string;
  voice_label?: string;
};
export type DifficultyOverlays = { easy: string; standard: string; hard: string };

export type RolePlay = {
  id: string;
  slug: string;
  name: string;
  role: string;
  topic: string;
  persona: Persona;
  system_prompt: string;
  difficulty_overlays: DifficultyOverlays;
  scorecard: Scorecard;
  opening_line: string;
  scenario_brief: string;
  is_published: boolean;
  created_at: string;
  use_elevenlabs_agent?: boolean;
  voice_id?: string | null;
  category?: string | null;
};

export const VOICE_PRESETS: { id: string; label: string }[] = [
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — British male, calm" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — British male, warm" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — American male, casual" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — American female, professional" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte — British female, friendly" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice — British female, crisp" },
];

export const ROLE_OPTIONS = ["AE", "CSM", "SA"] as const;