import { SignOut } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/AuthProvider'
import { avatarInitial } from '@/lib/avatar-initial'

export function AccountMenu() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const email = user?.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className="rounded-full" aria-label={t('shell.account')}>
          <span aria-hidden>{avatarInitial(email, i18n.resolvedLanguage ?? i18n.language)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {email ? (
          <>
            <DropdownMenuLabel className="max-w-[220px] truncate" title={email}>
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={() => void signOut()}>
          <SignOut aria-hidden size={20} />
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
