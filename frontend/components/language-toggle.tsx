'use client';

import { useI18n, type Language } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageToggle() {
  const { language, setLanguage, dictionary } = useI18n();
  const languages: Language[] = ['it', 'en'];

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger className="w-[120px]" aria-label={dictionary.common.language}>
        <SelectValue placeholder={dictionary.common.language} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((value) => (
          <SelectItem key={value} value={value}>
            {dictionary.common.languages[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
