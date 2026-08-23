import type { BenchmarkPacket } from "../types";
import groundTruthJson from "./ground-truth.json";

// Two spellings of the same fictional applicant, on purpose — that's defect #1.
const NAME_ON_FORM = "Wonthong Yeptho";
const NAME_ON_ID = "Wonthong T. Yeptho";

export const packetB: BenchmarkPacket = {
  id: "packet-b",
  label: "Packet B — Ten Administrative Defects",
  purpose: "Ten planted, unambiguous administrative defects. Measures recall and correct categorization/severity.",
  documents: [
    { documentId: "b-form", documentType: "application_form", originalFilename: "application-form.pdf", mimeType: "application/pdf", fileSizeBytes: 470_000, pageCount: 1 },
    // Defect 9: unsupported file format.
    { documentId: "b-id", documentType: "identity_document", originalFilename: "voter-id.heic", mimeType: "image/heic", fileSizeBytes: 2_100_000, pageCount: 1 },
    // Defect 7: only 1 of 2 required pages.
    { documentId: "b-transcript", documentType: "transcript", originalFilename: "transcript.pdf", mimeType: "application/pdf", fileSizeBytes: 310_000, pageCount: 1 },
    { documentId: "b-income", documentType: "income_certificate", originalFilename: "income-certificate.pdf", mimeType: "application/pdf", fileSizeBytes: 200_000, pageCount: 1 },
    { documentId: "b-bank", documentType: "bank_document", originalFilename: "bank-statement.pdf", mimeType: "application/pdf", fileSizeBytes: 280_000, pageCount: 1 },
    // Defect 10: no residence certificate at all.
  ],
  extractedFacts: [
    // Defect 1 (name) + Defect 2 (DOB) sources.
    { id: "b-f1", documentId: "b-form", documentType: "application_form", field: "full_name", rawValue: NAME_ON_FORM, normalizedValue: NAME_ON_FORM, evidenceText: `Name: ${NAME_ON_FORM}`, confidence: 0.94, readable: true, requiresHumanConfirmation: false },
    { id: "b-f2", documentId: "b-form", documentType: "application_form", field: "date_of_birth", rawValue: "17/07/2003", normalizedValue: "2003-07-17", evidenceText: "DOB: 17/07/2003", confidence: 0.88, readable: true, requiresHumanConfirmation: false },
    // Defect 5: signature not detected.
    { id: "b-f3", documentId: "b-form", documentType: "application_form", field: "signature_present", rawValue: "no signature block filled", normalizedValue: false, evidenceText: "Signature field is blank.", confidence: 0.88, readable: true, requiresHumanConfirmation: false },

    { id: "b-f4", documentId: "b-id", documentType: "identity_document", field: "full_name", rawValue: NAME_ON_ID, normalizedValue: NAME_ON_ID, evidenceText: `Name: ${NAME_ON_ID}`, confidence: 0.93, readable: true, requiresHumanConfirmation: false },
    { id: "b-f5", documentId: "b-id", documentType: "identity_document", field: "date_of_birth", rawValue: "14/07/2003", normalizedValue: "2003-07-14", evidenceText: "DOB: 14/07/2003", confidence: 0.87, readable: true, requiresHumanConfirmation: false },

    // Defect 6: GPA below the 6.0 minimum.
    { id: "b-f6", documentId: "b-transcript", documentType: "transcript", field: "full_name", rawValue: NAME_ON_FORM, normalizedValue: NAME_ON_FORM, evidenceText: `Student: ${NAME_ON_FORM}`, confidence: 0.92, readable: true, requiresHumanConfirmation: false },
    { id: "b-f7", documentId: "b-transcript", documentType: "transcript", field: "gpa_or_marks", rawValue: "5.4 CGPA", normalizedValue: 5.4, evidenceText: "CGPA: 5.4", confidence: 0.9, readable: true, requiresHumanConfirmation: false },
    { id: "b-f8", documentId: "b-transcript", documentType: "transcript", field: "document_page_count", rawValue: "1", normalizedValue: 1, evidenceText: null, confidence: 0.99, readable: true, requiresHumanConfirmation: false },

    // Defect 3 (expired) + Defect 4 (wrong FY).
    { id: "b-f9", documentId: "b-income", documentType: "income_certificate", field: "financial_year", rawValue: "2024-25", normalizedValue: "2024-25", evidenceText: "Financial Year: 2024-25", confidence: 0.9, readable: true, requiresHumanConfirmation: false },
    { id: "b-f10", documentId: "b-income", documentType: "income_certificate", field: "expiry_date", rawValue: "31/01/2026", normalizedValue: "2026-01-31", evidenceText: "Valid until 31/01/2026", confidence: 0.89, readable: true, requiresHumanConfirmation: false },

    // Defect 8: bank account holder doesn't match applicant.
    { id: "b-f11", documentId: "b-bank", documentType: "bank_document", field: "account_holder_name", rawValue: "W. Yeptho", normalizedValue: "W. Yeptho", evidenceText: "Account Holder: W. Yeptho", confidence: 0.91, readable: true, requiresHumanConfirmation: false },
  ],
  rawDocumentText: `[application-form.pdf] Name: ${NAME_ON_FORM}. DOB: 17/07/2003. Signature field is blank.\n[voter-id.heic] Name: ${NAME_ON_ID}. DOB: 14/07/2003.\n[transcript.pdf, 1 page uploaded] Student: ${NAME_ON_FORM}. CGPA: 5.4.\n[income-certificate.pdf] Financial Year: 2024-25. Valid until 31/01/2026.\n[bank-statement.pdf] Account Holder: W. Yeptho.`,
  groundTruth: groundTruthJson.defects,
};
