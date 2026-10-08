import type { legal as vi } from "../vi/legal";

export const legal: Record<keyof typeof vi, string> = {
  "legal.agreement.link": "Terms of Service",
  "legal.agreement.loading": "Loading the terms...",
  "legal.agreement.text": "I have read and accept the {terms}.",
  "legal.termsGate.accept": "I have read and accept",
  "legal.termsGate.couldNotAccept": "Couldn't record your acceptance. Please try again.",
  "legal.termsGate.couldNotLoad": "Couldn't load the terms. Please try again.",
  "legal.termsGate.intro": "To keep using Orbit, you need to read and accept the current version of the terms. When the terms change, you will be asked again like this.",
  "legal.termsGate.retry": "Reload",
  "legal.termsGate.title": "Terms of service",
  "legal.termsGate.version": "Version {version} - {date}",
};
