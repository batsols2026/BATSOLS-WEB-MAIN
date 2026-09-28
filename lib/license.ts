import { randomBytes } from "crypto";

// Human-readable license key, e.g. BATS-4F82-91DC-77AA
export function generateLicenseKey() {
  const segment = () => randomBytes(2).toString("hex").toUpperCase();
  return `BATS-${segment()}-${segment()}-${segment()}`;
}
