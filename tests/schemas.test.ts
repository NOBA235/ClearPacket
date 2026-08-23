import { describe, it, expect } from "vitest";
import { RequirementSchema, ExtractedFactSchema, RequirementManifestSchema } from "../lib/schemas";
import { buildOracleRequirementsManifest } from "../data/benchmark/requirements-manifest";
import { packetA } from "../data/benchmark/packet-a/documents";
import { packetB } from "../data/benchmark/packet-b/documents";
import { packetC } from "../data/benchmark/packet-c/documents";

describe("Requirement schema validation", () => {
  it("accepts a well-formed requirement", () => {
    const req = {
      id: "r1",
      category: "required_document",
      description: "test",
      required: true,
      sourceDocument: "notice",
      sourceText: "exact quote",
      confidence: 0.9,
    };
    expect(() => RequirementSchema.parse(req)).not.toThrow();
  });

  it("rejects a requirement missing sourceText (no evidence = not a valid requirement)", () => {
    const bad = { id: "r1", category: "required_document", description: "x", required: true, sourceDocument: "notice", confidence: 0.9 };
    expect(() => RequirementSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid category", () => {
    const bad = { id: "r1", category: "not_a_real_category", description: "x", required: true, sourceDocument: "n", sourceText: "t", confidence: 0.9 };
    expect(() => RequirementSchema.parse(bad)).toThrow();
  });

  it("rejects confidence outside [0,1]", () => {
    const bad = { id: "r1", category: "required_document", description: "x", required: true, sourceDocument: "n", sourceText: "t", confidence: 1.5 };
    expect(() => RequirementSchema.parse(bad)).toThrow();
  });

  it("the full oracle manifest for every benchmark packet validates", () => {
    for (const id of ["packet-a", "packet-b", "packet-c"] as const) {
      const manifest = buildOracleRequirementsManifest(id);
      expect(() => RequirementManifestSchema.parse(manifest)).not.toThrow();
    }
  });

  it("every oracle requirement's sourceText is an exact substring of the official notice", async () => {
    const { OFFICIAL_NOTICE_TEXT } = await import("../data/benchmark/official-notice");
    const manifest = buildOracleRequirementsManifest("packet-a");
    for (const req of manifest.requirements) {
      expect(OFFICIAL_NOTICE_TEXT.includes(req.sourceText)).toBe(true);
    }
  });
});

describe("ExtractedFact schema validation", () => {
  it("accepts a well-formed fact", () => {
    expect(() =>
      ExtractedFactSchema.parse({
        id: "f1",
        documentId: "d1",
        documentType: "identity_document",
        field: "full_name",
        rawValue: "Test Name",
        normalizedValue: "Test Name",
        confidence: 0.9,
        readable: true,
        requiresHumanConfirmation: false,
      }),
    ).not.toThrow();
  });

  it("allows null rawValue/normalizedValue for an unreadable field", () => {
    expect(() =>
      ExtractedFactSchema.parse({
        id: "f1",
        documentId: "d1",
        documentType: "identity_document",
        field: "full_name",
        rawValue: null,
        normalizedValue: null,
        confidence: 0.1,
        readable: false,
        requiresHumanConfirmation: true,
      }),
    ).not.toThrow();
  });

  it("rejects an unknown documentType", () => {
    expect(() =>
      ExtractedFactSchema.parse({
        id: "f1",
        documentId: "d1",
        documentType: "not_a_real_type",
        field: "full_name",
        rawValue: "x",
        normalizedValue: "x",
        confidence: 0.9,
        readable: true,
        requiresHumanConfirmation: false,
      }),
    ).toThrow();
  });

  it("every benchmark packet's oracle extracted facts validate", () => {
    for (const packet of [packetA, packetB, packetC]) {
      for (const fact of packet.extractedFacts) {
        expect(() => ExtractedFactSchema.parse(fact)).not.toThrow();
      }
    }
  });
});
