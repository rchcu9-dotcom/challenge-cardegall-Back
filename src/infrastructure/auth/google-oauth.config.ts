function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith('<');
}

/** false tant que GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ne sont pas renseignés (console.cloud.google.com). */
export function isGoogleOAuthConfigured(): boolean {
  return !isPlaceholder(process.env.GOOGLE_CLIENT_ID) && !isPlaceholder(process.env.GOOGLE_CLIENT_SECRET);
}
