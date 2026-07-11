import { z } from "zod";

// Schema for the detected repository
export const RepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  stars: z.number(),
  forks: z.number(),
  language: z.string().nullable(),
  license: z.string().nullable(),
  lastUpdated: z.string(),
  topics: z.array(z.string()),
  openIssues: z.number(),
  isArchived: z.boolean(),
  defaultBranch: z.string(),
  owner: z.object({
    login: z.string(),
    avatarUrl: z.string(),
    type: z.string(),
  }),
});

export type Repo = z.infer<typeof RepoSchema>;

// Schema for detection methods used
export const DetectionMethodSchema = z.object({
  method: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.string(),
});

export type DetectionMethod = z.infer<typeof DetectionMethodSchema>;

// Schema for tech stack detection
export const TechStackSchema = z.object({
  name: z.string(),
  category: z.enum(["framework", "library", "language", "hosting", "cms", "tool"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export type TechStack = z.infer<typeof TechStackSchema>;

// Full result schema
export const DetectionResultSchema = z.object({
  url: z.string(),
  isOpenSource: z.boolean(),
  repo: RepoSchema.nullable(),
  methods: z.array(DetectionMethodSchema),
  techStack: z.array(TechStackSchema),
  scannedAt: z.string(),
  error: z.string().nullable(),
});

export type DetectionResult = z.infer<typeof DetectionResultSchema>;

// API request schema
export const DetectRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export type DetectRequest = z.infer<typeof DetectRequestSchema>;
