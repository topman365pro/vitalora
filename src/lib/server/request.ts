export function sanitizeForwardedIp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();

  if (!first) {
    return null;
  }

  const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6Pattern = /^[a-fA-F0-9:]+$/;

  if (ipv4Pattern.test(first) || ipv6Pattern.test(first)) {
    return first;
  }

  return null;
}
