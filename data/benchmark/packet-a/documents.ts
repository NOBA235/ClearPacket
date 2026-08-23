import type { BenchmarkPacket } from "../types";
import groundTruthJson from "./ground-truth.json";

const APPLICANT = "Meyi Ao";

export const packetA: BenchmarkPacket = {
  id: "packet-a",
  label: "Packet A — Clean",
  purpose: "All documents and values agree. Measures false positives: a correct workflow should not invent problems.",
  documents: [
    { documentId: "a-form", documentType: "application_form", originalFilename: "application-form.pdf", mimeType: "application/pdf", fileSizeBytes: 480_000, pageCount: 1 },
    { documentId: "a-id", documentType: "identity_document", originalFilename: "aadhaar.pdf", mimeType: "application/pdf", fileSizeBytes: 210_000, pageCount: 1 },
    { documentId: "a-transcript", documentType: "transcript", originalFilename: "transcript.pdf", mimeType: "application/pdf", fileSizeBytes: 650_000, pageCount: 2 },
    { documentId: "a-income", documentType: "income_certificate", originalFilename: "income-certificate.pdf", mimeType: "application/pdf", fileSizeBytes: 190_000, pageCount: 1 },
    { documentId: "a-bank", documentType: "bank_document", originalFilename: "bank-statement.pdf", mimeType: "application/pdf", fileSizeBytes: 300_000, pageCount: 1 },
    { documentId: "a-residence", documentType: "residence_certificate", originalFilename: "residence-certificate.pdf", mimeType: "application/pdf", fileSizeBytes: 175_000, pageCount: 1 },
  ],
  extractedFacts: [
    { id: "a-f1", documentId: "a-form", documentType: "application_form", field: "full_name", rawValue: APPLICANT, normalizedValue: APPLICANT, evidenceText: `Name: ${APPLICANT}`, confidence: 0.95, readable: true, requiresHumanConfirmation: false },
    { id: "a-f2", documentId: "a-form", documentType: "application_form", field: "signature_present", rawValue: "signed", normalizedValue: true, evidenceText: "Applicant signature block present.", confidence: 0.93, readable: true, requiresHumanConfirmation: false },
    { id: "a-f3", documentId: "a-id", documentType: "identity_document", field: "full_name", rawValue: APPLICANT, normalizedValue: APPLICANT, evidenceText: `Name: ${APPLICANT}`, confidence: 0.96, readable: true, requiresHumanConfirmation: false },
    { id: "a-f4", documentId: "a-id", documentType: "identity_document", field: "date_of_birth", rawValue: "12/05/2004", normalizedValue: "2004-05-12", evidenceText: "DOB: 12/05/2004", confidence: 0.9, readable: true, requiresHumanConfirmation: false },
    { id: "a-f5", documentId: "a-transcript", documentType: "transcript", field: "full_name", rawValue: APPLICANT, normalizedValue: APPLICANT, evidenceText: `Student: ${APPLICANT}`, confidence: 0.94, readable: true, requiresHumanConfirmation: false },
    { id: "a-f6", documentId: "a-transcript", documentType: "transcript", field: "gpa_or_marks", rawValue: "7.8 CGPA", normalizedValue: 7.8, evidenceText: "CGPA: 7.8", confidence: 0.92, readable: true, requiresHumanConfirmation: false },
    { id: "a-f7", documentId: "a-transcript", documentType: "transcript", field: "document_page_count", rawValue: "2", normalizedValue: 2, evidenceText: null, confidence: 0.99, readable: true, requiresHumanConfirmation: false },
    { id: "a-f8", documentId: "a-income", documentType: "income_certificate", field: "financial_year", rawValue: "2025-26", normalizedValue: "2025-26", evidenceText: "Financial Year: 2025-26", confidence: 0.93, readable: true, requiresHumanConfirmation: false },
    { id: "a-f9", documentId: "a-income", documentType: "income_certificate", field: "expiry_date", rawValue: "31/12/2026", normalizedValue: "2026-12-31", evidenceText: "Valid until 31/12/2026", confidence: 0.9, readable: true, requiresHumanConfirmation: false },
    { id: "a-f10", documentId: "a-bank", documentType: "bank_document", field: "account_holder_name", rawValue: APPLICANT, normalizedValue: APPLICANT, evidenceText: `Account Holder: ${APPLICANT}`, confidence: 0.95, readable: true, requiresHumanConfirmation: false },
    { id: "a-f11", documentId: "a-residence", documentType: "residence_certificate", field: "full_name", rawValue: APPLICANT, normalizedValue: APPLICANT, evidenceText: `Name: ${APPLICANT}`, confidence: 0.94, readable: true, requiresHumanConfirmation: false },
    { id: "a-f12", documentId: "a-residence", documentType: "residence_certificate", field: "expiry_date", rawValue: "01/06/2027", normalizedValue: "2027-06-01", evidenceText: "Valid until 01/06/2027", confidence: 0.91, readable: true, requiresHumanConfirmation: false },
  ],
  rawDocumentText: `[application-form.pdf] Name: ${APPLICANT}. Signed. \n[aadhaar.pdf] Name: ${APPLICANT}. DOB: 12/05/2004. \n[transcript.pdf, 2 pages] Student: ${APPLICANT}. CGPA: 7.8. \n[income-certificate.pdf] Financial Year: 2025-26. Valid until 31/12/2026. \n[bank-statement.pdf] Account Holder: ${APPLICANT}. \n[residence-certificate.pdf] Name: ${APPLICANT}. Valid until 01/06/2027.`,
  groundTruth: groundTruthJson.defects,
};
