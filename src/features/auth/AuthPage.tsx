import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signup' | 'login'

// Messages are i18n keys, translated at render time so a language switch updates visible errors.
const MIN_PASSWORD_LENGTH = 8

function buildSchema(mode: AuthMode) {
  const email = z
    .string()
    .trim()
    .min(1, 'form.errors.required')
    .pipe(z.email('form.errors.invalidEmail'))
  const password =
    mode === 'signup'
      ? z.string().min(1, 'form.errors.required').min(MIN_PASSWORD_LENGTH, 'auth.errors.passwordTooShort')
      : z.string().min(1, 'form.errors.required')
  return z.object({ email, password })
}

type AuthValues = { email: string; password: string }

// Supabase Auth error codes -> field and message key. Anything else is a generic failure.
function mapAuthError(code: string | undefined): { field: 'email' | 'password'; key: string } | null {
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
      return { field: 'email', key: 'auth.errors.emailExists' }
    case 'invalid_credentials':
      return { field: 'password', key: 'auth.errors.invalidCredentials' }
    case 'weak_password':
      return { field: 'password', key: 'auth.errors.passwordTooShort' }
    default:
      return null
  }
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const ids = { email: useId(), password: useId(), hint: useId() }
  const [formError, setFormError] = useState<string | null>(null)

  const schema = useMemo(() => buildSchema(mode), [mode])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const isSignup = mode === 'signup'

  const onSubmit = async (values: AuthValues) => {
    setFormError(null)
    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({ email: values.email, password: values.password })
        : await supabase.auth.signInWithPassword({ email: values.email, password: values.password })

      if (error) {
        const mapped = mapAuthError(error.code)
        if (mapped) setError(mapped.field, { type: 'server', message: mapped.key })
        else setFormError('common.errorGeneric')
        return
      }
      // With email confirmation off (D-05) sign-up returns a session at once; none means a misconfigured project.
      if (!data.session) {
        setFormError('common.errorGeneric')
        return
      }
      void navigate('/', { replace: true })
    } catch {
      setFormError('common.errorGeneric')
    }
  }

  const emailError = errors.email?.message
  const passwordError = errors.password?.message

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <p className="font-display text-[26px] leading-none">{t('common.appName')}</p>
      <Card className="w-full max-w-[420px]">
        <CardHeader>
          <h1 className="font-display text-[22px] leading-tight">{t('auth.title')}</h1>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.email}>{t('auth.email')}</Label>
              <Input
                id={ids.email}
                type="email"
                autoFocus
                autoComplete="email"
                inputMode="email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? `${ids.email}-error` : undefined}
                {...register('email')}
              />
              {emailError ? (
                <p id={`${ids.email}-error`} className="text-[13px] leading-[1.3] text-destructive">
                  {t(emailError)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.password}>{t('auth.password')}</Label>
              <Input
                id={ids.password}
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  [isSignup ? ids.hint : null, passwordError ? `${ids.password}-error` : null]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                {...register('password')}
              />
              {isSignup ? (
                <p id={ids.hint} className="text-[13px] leading-[1.3] text-muted-foreground">
                  {t('auth.passwordHint')}
                </p>
              ) : null}
              {passwordError ? (
                <p id={`${ids.password}-error`} className="text-[13px] leading-[1.3] text-destructive">
                  {t(passwordError)}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-[13px] leading-[1.3] text-destructive">
                {t(formError)}
              </p>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full">
              {t(isSignup ? 'auth.signup' : 'auth.login')}
            </Button>
          </form>

          <p className="text-center text-[13px] leading-[1.3]">
            <Link
              to={isSignup ? '/login' : '/signup'}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t(isSignup ? 'auth.toLogin' : 'auth.toSignup')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
