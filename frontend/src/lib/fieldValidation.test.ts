import { describe, expect, it } from "@jest/globals";
import { describeInvalidField, fieldNoun, type FieldDescription } from "./fieldValidation";

const NO_PROBLEM = {
  valueMissing: false,
  typeMismatch: false,
  patternMismatch: false,
  tooShort: false,
  tooLong: false,
  rangeUnderflow: false,
  rangeOverflow: false,
  stepMismatch: false,
  badInput: false,
};

function field(
  problem: Partial<FieldDescription["validity"]>,
  extra: Partial<FieldDescription> = {},
): FieldDescription {
  return {
    validity: { ...NO_PROBLEM, ...problem },
    type: "text",
    isSelect: false,
    minLength: -1,
    maxLength: -1,
    min: "",
    max: "",
    validationMessage: "",
    ...extra,
  };
}

describe("fieldNoun", () => {
  it("lower-cases the first letter and drops a trailing hint", () => {
    expect(fieldNoun("Tên đăng nhập")).toBe("tên đăng nhập");
    expect(fieldNoun("Chức danh hiển thị (vd: CEO, CTO)")).toBe("chức danh hiển thị");
    expect(fieldNoun("  Mật khẩu ")).toBe("mật khẩu");
  });

  it("falls back to a neutral phrase for an empty label", () => {
    expect(fieldNoun("")).toBe("trường này");
    expect(fieldNoun("(tuỳ chọn)")).toBe("trường này");
  });
});

describe("describeInvalidField", () => {
  it("asks to type for a missing text field and to choose for a missing select", () => {
    expect(describeInvalidField(field({ valueMissing: true }), "Tên đăng nhập")).toBe(
      "Vui lòng nhập tên đăng nhập.",
    );
    expect(
      describeInvalidField(field({ valueMissing: true }, { isSelect: true }), "Phòng ban"),
    ).toBe("Vui lòng chọn phòng ban.");
  });

  it("explains a wrong email or link format", () => {
    expect(
      describeInvalidField(field({ typeMismatch: true }, { type: "email" }), "Email"),
    ).toContain("Email chưa đúng định dạng");
    expect(describeInvalidField(field({ typeMismatch: true }, { type: "url" }), "Link")).toContain(
      "https://",
    );
  });

  it("reports length and range limits with the actual numbers", () => {
    expect(describeInvalidField(field({ tooShort: true }, { minLength: 8 }), "Mật khẩu")).toBe(
      "Cần ít nhất 8 ký tự cho mật khẩu.",
    );
    expect(describeInvalidField(field({ tooLong: true }, { maxLength: 200 }), "Tên việc")).toBe(
      "Chỉ được tối đa 200 ký tự cho tên việc.",
    );
    expect(describeInvalidField(field({ rangeUnderflow: true }, { min: "1" }), "Số lượng")).toBe(
      "Giá trị nhỏ nhất của số lượng là 1.",
    );
    expect(describeInvalidField(field({ rangeOverflow: true }, { max: "9" }), "Số lượng")).toBe(
      "Giá trị lớn nhất của số lượng là 9.",
    );
  });

  it("covers the remaining problems and an unknown one without showing English when it can be avoided", () => {
    expect(describeInvalidField(field({ patternMismatch: true }), "Mã")).toBe(
      "Giá trị mã chưa hợp lệ.",
    );
    expect(describeInvalidField(field({}), "Mã")).toBe("Giá trị mã chưa hợp lệ.");
    expect(describeInvalidField(field({}, { validationMessage: "Something odd" }), "Mã")).toBe(
      "Something odd",
    );
  });

  it("reports a missing value before any other problem", () => {
    expect(
      describeInvalidField(
        field({ valueMissing: true, tooShort: true }, { minLength: 8 }),
        "Mật khẩu",
      ),
    ).toBe("Vui lòng nhập mật khẩu.");
  });
});
