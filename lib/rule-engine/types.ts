import type { DocumentType } from "../schemas";

export interface DocumentMeta {
  documentId: string;
  documentType: DocumentType;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number | null;
}

export interface RuleEngineConfig {
  /** ISO date the audit is being run against, for deadline/expiry comparisons. Defaults to now. */
  submissionDate: string;
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
}

export const DEFAULT_RULE_ENGINE_CONFIG: Omit<RuleEngineConfig, "submissionDate"> = {
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
};
