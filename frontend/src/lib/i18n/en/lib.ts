import type { lib as vi } from "../vi/lib";

export const lib: Record<keyof typeof vi, string> = {
  "lib.fieldValidation.enterAtLeastMinlengthCharactersFor": "Enter at least {minLength} characters for {noun}.",
  "lib.fieldValidation.pleaseChooseNoun": "Please choose {noun}.",
  "lib.fieldValidation.pleaseEnterNoun": "Please enter {noun}.",
  "lib.fieldValidation.theEmailFormatIsWrongFor": "The email format is wrong, for example name@company.com.",
  "lib.fieldValidation.theFormatOfNounIsWrong": "The format of {noun} is wrong.",
  "lib.fieldValidation.theLargestValueForNounIs": "The largest value for {noun} is {max}.",
  "lib.fieldValidation.theLinkFormatIsWrongIt": "The link format is wrong, it must start with https://.",
  "lib.fieldValidation.theSmallestValueForNounIs": "The smallest value for {noun} is {min}.",
  "lib.fieldValidation.theValueOfNounIsNot": "The value of {noun} is not valid.",
  "lib.fieldValidation.thisField": "this field",
  "lib.fieldValidation.useAtMostMaxlengthCharactersFor": "Use at most {maxLength} characters for {noun}.",
};
