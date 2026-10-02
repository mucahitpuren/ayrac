/**
 * The letter shown in the account avatar: the first code point of the email, uppercased with the Turkish rules
 * (i -> İ) when the UI language is Turkish and the English ones otherwise. '?' when there is no email.
 */
export function avatarInitial(email: string | undefined, lng: string): string {
  const first = Array.from(email?.trim() ?? '')[0]
  if (!first) return '?'
  const locale = lng.toLowerCase().split('-')[0] === 'tr' ? 'tr' : 'en'
  return first.toLocaleUpperCase(locale)
}
