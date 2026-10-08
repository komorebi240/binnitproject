import { describe, expect, it } from "@jest/globals";
import { describeInvalidField, fieldNoun, type FieldDescription, type Translate } from "./fieldValidation";
import { EN } from "./i18n/en";
import { translate } from "./i18n/translate";
import { VI } from "./i18n/vi";

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

const vi: Translate = (key, params) => translate("vi", VI, VI, key, params);
const en: Translate = (key, params) => translate("en", EN, VI, key, params);

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
    expect(fieldNoun("Tên đăng nhập", vi)).toBe("tên đăng nhập");
    expect(fieldNoun("Chức danh hiển thị (vd: CEO, CTO)", vi)).toBe("chức danh hiển thị");
    expect(fieldNoun("  Mật khẩu ", vi)).toBe("mật khẩu");
  });

  it("keeps an acronym as written", () => {
    expect(fieldNoun("KPI tháng", vi)).toBe("KPI tháng");
  });

  it("falls back to a neutral phrase for an empty label, in the language of the translator", () => {
    expect(fieldNoun("", vi)).toBe("trường này");
    expect(fieldNoun("(tuỳ chọn)", vi)).toBe("trường này");
    expect(fieldNoun("", en)).toBe("this field");
  });
});

describe("describeInvalidField", () => {
  it("asks to type for a missing text field and to choose for a missing select", () => {
    expect(describeInvalidField(field({ valueMissing: true }), "Tên đăng nhập", vi)).toBe("Vui lòng nhập tên đăng nhập.");
    expect(describeInvalidField(field({ valueMissing: true }, { isSelect: true }), "Phòng ban", vi)).toBe("Vui lòng chọn phòng ban.");
  });

  it("explains a wrong email or link format", () => {
    expect(describeInvalidField(field({ typeMismatch: true }, { type: "email" }), "Email", vi)).toContain("Email chưa đúng định dạng");
    expect(describeInvalidField(field({ typeMismatch: true }, { type: "url" }), "Link", vi)).toContain("https://");
  });

  it("reports length and range limits with the actual numbers", () => {
    expect(describeInvalidField(field({ tooShort: true }, { minLength: 8 }), "Mật khẩu", vi)).toBe("Cần ít nhất 8 ký tự cho mật khẩu.");
    expect(describeInvalidField(field({ tooLong: true }, { maxLength: 200 }), "Tên việc", vi)).toBe("Chỉ được tối đa 200 ký tự cho tên việc.");
    expect(describeInvalidField(field({ rangeUnderflow: true }, { min: "1" }), "Số lượng", vi)).toBe("Giá trị nhỏ nhất của số lượng là 1.");
    expect(describeInvalidField(field({ rangeOverflow: true }, { max: "9" }), "Số lượng", vi)).toBe("Giá trị lớn nhất của số lượng là 9.");
  });

  it("covers the remaining problems and an unknown one without showing English when it can be avoided", () => {
    expect(describeInvalidField(field({ patternMismatch: true }), "Mã", vi)).toBe("Giá trị mã chưa hợp lệ.");
    expect(describeInvalidField(field({}), "Mã", vi)).toBe("Giá trị mã chưa hợp lệ.");
    expect(describeInvalidField(field({}, { validationMessage: "Something odd" }), "Mã", vi)).toBe("Something odd");
  });

  it("reports a missing value before any other problem", () => {
    expect(describeInvalidField(field({ valueMissing: true, tooShort: true }, { minLength: 8 }), "Mật khẩu", vi)).toBe("Vui lòng nhập mật khẩu.");
  });

  it("speaks English when the translator does", () => {
    expect(describeInvalidField(field({ valueMissing: true }), "Username", en)).toBe("Please enter username.");
    expect(describeInvalidField(field({ tooShort: true }, { minLength: 8 }), "Password", en)).toBe("Enter at least 8 characters for password.");
    expect(describeInvalidField(field({ typeMismatch: true }, { type: "email" }), "Email", en)).toBe("The email format is wrong, for example name@company.com.");
  });
});
