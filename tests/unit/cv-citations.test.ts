import { describe, expect, it } from "vitest";
import { extractCitations } from "../../src/worker/citations";

describe("extractCitations", () => {
  it.each([
    "Sources: [[Work]], [[Education]].",
    "Fuentes: [[Work]]; [[Education]]",
    "** Sources:** [[Work]]; [[Education]].",
  ])("removes citation-only footer punctuation: %s", footer => {
    expect(extractCitations(`Answer text.\n${footer}`)).toEqual({
      text: "Answer text.",
      sources: ["Work", "Education"],
    });
  });

  it("preserves prose on a final sources line containing citations", () => {
    expect(extractCitations("Answer.\nSources: [[Work]]; see the original.")).toEqual({
      text: "Answer.\nSources: ; see the original.",
      sources: ["Work"],
    });
  });

  it("removes a final English sources line and returns its title", () => {
    expect(extractCitations("Answer text.\nSources: [[Selected Work]]")).toEqual({
      text: "Answer text.",
      sources: ["Selected Work"],
    });
  });

  it("removes a final Markdown-emphasized sources line", () => {
    expect(
      extractCitations("Answer text.\n**Sources:** [[Work]], [[Education]]")
    ).toEqual({
      text: "Answer text.",
      sources: ["Work", "Education"],
    });
  });

  it("removes a final Spanish sources line and parses comma-separated titles", () => {
    expect(
      extractCitations("Answer text.\nFuentes: [[Work, Projects]], [[Education]]")
    ).toEqual({
      text: "Answer text.",
      sources: ["Work, Projects", "Education"],
    });
  });

  it("parses middle-dot-separated Spanish citations", () => {
    expect(
      extractCitations("Answer text.\nFuentes: [[Work]] · [[Education]]")
    ).toEqual({
      text: "Answer text.",
      sources: ["Work", "Education"],
    });
  });

  it("preserves ordinary prose punctuation outside the citation line", () => {
    expect(
      extractCitations("I worked in research, design, and delivery.\nThis ends normally!")
    ).toEqual({
      text: "I worked in research, design, and delivery.\nThis ends normally!",
      sources: [],
    });
  });

  it("removes an empty final sources label without inventing a citation", () => {
    expect(extractCitations("Answer.\nSources:")).toEqual({
      text: "Answer.",
      sources: [],
    });
  });

  it("ignores empty citation tokens on the final sources line", () => {
    expect(extractCitations("Answer.\nSources: [[]], [[  ]] ")).toEqual({
      text: "Answer.",
      sources: [],
    });
  });

  it("keeps a final sources line that contains malformed citation text", () => {
    expect(extractCitations("Answer.\nSources: [[Unclosed]")).toEqual({
      text: "Answer.\nSources: [[Unclosed]",
      sources: [],
    });
  });

  it("does not remove ordinary prose after a sources label", () => {
    expect(extractCitations("Answer.\nSources: were reviewed carefully.")).toEqual({
      text: "Answer.\nSources: were reviewed carefully.",
      sources: [],
    });
  });

  it("preserves ordinary punctuation while extracting an inline citation", () => {
    expect(
      extractCitations("I worked in research, design, and delivery. [[Selected Work]]")
    ).toEqual({
      text: "I worked in research, design, and delivery.",
      sources: ["Selected Work"],
    });
  });
});
