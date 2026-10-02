import { Moon, Sun } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ThemePreference } from '@/lib/theme'

const OPTIONS: readonly ThemePreference[] = ['light', 'dark', 'system']

function isThemePreference(value: string): value is ThemePreference {
  return (OPTIONS as readonly string[]).includes(value)
}

export function ThemeMenu() {
  const { t } = useTranslation()
  const { preference, resolved, setPreference } = useTheme()
  // Moon while the page is light (offers the dark side), Sun while it is dark.
  const Icon = resolved === 'light' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.label')}>
          <Icon aria-hidden size={24} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            if (isThemePreference(value)) setPreference(value)
          }}
        >
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t(`theme.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
