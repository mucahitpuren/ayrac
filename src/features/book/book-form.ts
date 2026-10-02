export type BookFormValues = {
  title: string
  authorsRaw: string
  genre: string
  series: string
  seriesPosition: string
  format: string
  publisher: string
  editionTitle: string
  note: string
}
export const normalizeText = (_s: string): string => ''
export const codePointLength = (_s: string): number => 0
export const parseAuthors = (_s: string): string[] => []
export const bookFormSchema = { safeParse: (_v: unknown) => ({ success: true as const }) } as never
export const toCreateWorkWithCopyInput = (_v: BookFormValues): never => ({}) as never
