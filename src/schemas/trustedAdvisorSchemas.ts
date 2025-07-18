import { z } from "zod";

// Common input schemas
export const BaseInputSchema = z.object({
  language: z.enum(["en", "ja", "fr", "zh"]).default("en"),
  awsAccountId: z.string().optional(),
  region: z.string().optional().default("us-east-1")
});

export const CheckInputSchema = BaseInputSchema.extend({
  checkId: z.string()
});

export const RecommendationInputSchema = BaseInputSchema.extend({
  recommendationIdentifier: z.string()
});

export const OrganizationInputSchema = BaseInputSchema.extend({
  organizationId: z.string()
});

export const FilterInputSchema = z.object({
  awsService: z.string().optional(),
  checkId: z.string().optional(),
  pillar: z.enum(["cost_optimizing", "performance", "security", "service_limits", "fault_tolerance", "operational_excellence"]).optional(),
  source: z.enum(["aws_config", "compute_optimizer", "cost_explorer", "lse", "manual", "pse", "rds", "resilience", "resilience_hub", "security_hub", "stir", "ta_check", "well_architected"]).optional(),
  status: z.enum(["ok", "warning", "error"]).optional(),
  lifecycleStage: z.enum(["in_progress", "pending_response", "dismissed", "resolved"]).optional()
});

export const PaginationInputSchema = z.object({
  maxResults: z.number().min(1).max(200).optional().default(100),
  nextToken: z.string().optional()
});

export const UpdateLifecycleInputSchema = z.object({
  lifecycleStage: z.enum(["pending_response", "in_progress", "dismissed", "resolved"]),
  updateReason: z.string().optional(),
  updateReasonCode: z.enum(["non_critical_account", "temporary_account", "valid_business_case", "other_methods_available", "low_priority", "not_applicable", "other"]).optional()
});

// Common output schemas
export const CheckSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pillar: z.string(),
  awsServices: z.array(z.string()),
  source: z.string(),
  metadata: z.record(z.any()).optional()
});

export const RecommendationSchema = z.object({
  id: z.string(),
  checkId: z.string(),
  type: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lifecycleStage: z.string().optional(),
  updateReason: z.string().optional(),
  updateReasonCode: z.string().optional(),
  pillar: z.string().optional(),
  source: z.string().optional(),
  awsServices: z.array(z.string()).optional(),
  resourcesAggregates: z.object({
    errorCount: z.number().optional(),
    okCount: z.number().optional(),
    warningCount: z.number().optional()
  }).optional()
});

export const ResourceSchema = z.object({
  id: z.string(),
  arn: z.string().optional(),
  awsResourceId: z.string().optional(),
  lastUpdated: z.string().optional(),
  status: z.string(),
  region: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  exclusionStatus: z.enum(["excluded", "included"]).optional()
});

export const AccountSchema = z.object({
  accountId: z.string(),
  name: z.string().optional(),
  email: z.string().optional()
});

// Common metadata schema
export const MetadataSchema = z.object({
  timestamp: z.string(),
  requestId: z.string().optional(),
  awsAccountId: z.string().optional(),
  region: z.string(),
  operationType: z.string()
});

// Response wrapper schemas
export const ListResponseSchema = <T extends z.ZodSchema>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  totalCount: z.number(),
  nextToken: z.string().optional(),
  metadata: MetadataSchema
});

export const SingleResponseSchema = <T extends z.ZodSchema>(itemSchema: T) => z.object({
  item: itemSchema,
  metadata: MetadataSchema
});

export const UpdateResponseSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number().optional(),
  errors: z.array(z.object({
    resourceId: z.string(),
    errorCode: z.string(),
    errorMessage: z.string()
  })).optional(),
  metadata: MetadataSchema
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string(),
  details: z.any().optional(),
  metadata: MetadataSchema
});
