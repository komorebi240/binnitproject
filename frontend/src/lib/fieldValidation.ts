/** Vietnamese messages for the browser's built-in form validation (the native bubble is English and cannot be styled). */

/** The slice of a form control this needs; a real <input>/<select> satisfies it, and tests can fake it. */
export interface FieldDescription {
  validity: {
    valueMissing: boolean;
    typeMismatch: boolean;
    patternMismatch: boolean;
    tooShort: boolean;
    tooLong: boolean;
    rangeUnderflow: boolean;
    rangeOverflow: boolean;
    stepMismatch: boolean;
    badInput: boolean;
  };
  type: string;
  /** "select-one" for a <select>. */
  isSelect: boolean;
  minLength: number;
  maxLength: number;
  min: string;
  max: string;
  /** The browser's own English text, used only when nothing here applies. */
  validationMessage: string;
}

/** "Tên đăng nhập" -> "tên đăng nhập"; a trailing hint such as " (vd: CEO)" is dropped so the sentence reads naturally. */
export function fieldNoun(label: string): string {
  const withoutHint = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!withoutHint) return "trường này";
  return withoutHint.charAt(0).toLowerCase() + withoutHint.slice(1);
}

export function describeInvalidField(field: FieldDescription, label: string): string {
  const noun = fieldNoun(label);
  const { validity } = field;

  if (validity.valueMissing) {
    return field.isSelect ? `Vui lòng chọn ${noun}.` : `Vui lòng nhập ${noun}.`;
  }
  if (validity.typeMismatch) {
    if (field.type === "email") return "Email chưa đúng định dạng, ví dụ ten@congty.com.";
    if (field.type === "url") return "Liên kết chưa đúng định dạng, cần bắt đầu bằng https://.";
    return `Giá trị ${noun} chưa đúng định dạng.`;
  }
  if (validity.tooShort) return `Cần ít nhất ${field.minLength} ký tự cho ${noun}.`;
  if (validity.tooLong) return `Chỉ được tối đa ${field.maxLength} ký tự cho ${noun}.`;
  if (validity.rangeUnderflow) return `Giá trị nhỏ nhất của ${noun} là ${field.min}.`;
  if (validity.rangeOverflow) return `Giá trị lớn nhất của ${noun} là ${field.max}.`;
  if (validity.patternMismatch || validity.stepMismatch || validity.badInput) {
    return `Giá trị ${noun} chưa hợp lệ.`;
  }
  return field.validationMessage || `Giá trị ${noun} chưa hợp lệ.`;
}
