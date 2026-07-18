export function safeNotificationHref(href?: string | null) {
  if (!href) return "/notifications";
  const value = href.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.toLowerCase().startsWith("/javascript:") ||
    value.toLowerCase().startsWith("/data:") ||
    value.toLowerCase().startsWith("/file:")
  ) {
    return "/notifications";
  }

  return value;
}
