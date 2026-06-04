import * as vscode from "vscode";
import { FilterDocsHover } from "../../src/hover/filterDocsHover";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: { __: (key: string) => key },
}));

jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  filterAtOffset: jest.fn(),
  getFilterDoc: jest.fn(),
}));

import { filterAtOffset, getFilterDoc } from "@xubylele/jinja2-enhanced-shared";

const filterAtOffsetMock = filterAtOffset as jest.Mock;
const getFilterDocMock = getFilterDoc as jest.Mock;

function makeDocument(text: string) {
  return {
    getText: () => text,
    offsetAt: (_pos: any) => 5,
  } as any;
}

function makePosition() {
  return { line: 0, character: 5 } as any;
}

describe("FilterDocsHover", () => {
  let provider: FilterDocsHover;

  beforeEach(() => {
    filterAtOffsetMock.mockReset();
    getFilterDocMock.mockReset();
    provider = new FilterDocsHover();
  });

  it("returns undefined when no filter found at cursor", () => {
    filterAtOffsetMock.mockReturnValue(undefined);
    const result = provider.provideHover(makeDocument("{{ name }}"), makePosition());
    expect(result).toBeUndefined();
  });

  it("returns undefined when filter has no documentation", () => {
    filterAtOffsetMock.mockReturnValue({ name: "custom_filter" });
    getFilterDocMock.mockReturnValue(undefined);
    const result = provider.provideHover(makeDocument("{{ name|custom_filter }}"), makePosition());
    expect(result).toBeUndefined();
  });

  it("returns a Hover with filter documentation when both filter and doc are found", () => {
    filterAtOffsetMock.mockReturnValue({ name: "upper" });
    getFilterDocMock.mockReturnValue({
      name: "upper",
      signature: "upper()",
      descriptionKey: "filter.upper.description",
      example: "{{ name|upper }}",
    });

    const result = provider.provideHover(makeDocument("{{ name|upper }}"), makePosition());

    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(vscode.Hover);
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("upper");
    expect(md.value).toContain("upper()");
  });
});
