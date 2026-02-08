'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ServerCog, Pencil, Trash2, Shield } from 'lucide-react';
import { apiFetch, ApiError, type PaginatedResponse } from '@/lib/api';
import { useI18n, type Dictionary } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProviderConfig {
  image?: string;
  env?: Record<string, string>;
  [key: string]: unknown;
}

interface ProviderDto {
  id: string;
  type: 'ASR' | 'LLM' | 'TTS' | 'STS';
  name: string;
  config: ProviderConfig | null;
}

type ProviderType = ProviderDto['type'];

type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputType?: 'text' | 'password';
  widget?: 'textarea' | 'select';
  options?: { value: string; label: string }[];
};

interface ProviderTemplate {
  id: string;
  type: ProviderType;
  label: string;
  description: string;
  defaultImage?: string;
  defaults?: Record<string, string>;
  fields: TemplateField[];
}

// Provider templates will be created inside the component to access i18n

// Schema factory function will be created inside the component to access i18n and templates

type FormValues = {
  name: string;
  type: 'ASR' | 'LLM' | 'TTS' | 'STS';
  templateId?: string;
  image?: string;
  env?: Record<string, string | undefined>;
};

// Utility functions will be moved inside the component to access providerTemplates

export default function ProvidersPage() {
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'viewer';

  const providerTemplates: ProviderTemplate[] = [
    {
      id: 'sts-openai',
      type: 'STS',
      label: dictionary.providers.templates.stsOpenai.label,
      description: dictionary.providers.templates.stsOpenai.description,
      defaultImage: 'agentvoiceresponse/avr-sts-openai',
      defaults: {
        OPENAI_MODEL: 'gpt-4o-realtime-preview',
        OPENAI_VOICE: 'alloy',
        OPENAI_LANGUAGE: 'auto',
      },
      fields: [
        {
          key: 'OPENAI_API_KEY',
          label: dictionary.providers.fieldsExtra.openaiApiKey,
          placeholder: 'sk-...',
          required: true,
          inputType: 'password',
        },
        {
          key: 'OPENAI_MODEL',
          label: dictionary.providers.fieldsExtra.openaiModel,
          placeholder: 'gpt-4o-realtime-preview',
          required: true,
        },
        {
          key: 'OPENAI_VOICE',
          label: dictionary.providers.fieldsExtra.openaiVoice,
          placeholder: dictionary.providers.placeholders.openaiVoice,
        },
        {
          key: 'OPENAI_LANGUAGE',
          label: dictionary.providers.fieldsExtra.openaiLanguage,
          widget: 'select',
          options: [
            { value: 'auto', label: dictionary.providers.languageOptions.autoDetect },
            { value: 'af', label: dictionary.providers.languageOptions.afrikaans },
            { value: 'ar', label: dictionary.providers.languageOptions.arabic },
            { value: 'az', label: dictionary.providers.languageOptions.azerbaijani },
            { value: 'be', label: dictionary.providers.languageOptions.belarusian },
            { value: 'bg', label: dictionary.providers.languageOptions.bulgarian },
            { value: 'bs', label: dictionary.providers.languageOptions.bosnian },
            { value: 'ca', label: dictionary.providers.languageOptions.catalan },
            { value: 'cs', label: dictionary.providers.languageOptions.czech },
            { value: 'cy', label: dictionary.providers.languageOptions.welsh },
            { value: 'da', label: dictionary.providers.languageOptions.danish },
            { value: 'de', label: dictionary.providers.languageOptions.german },
            { value: 'el', label: dictionary.providers.languageOptions.greek },
            { value: 'en', label: dictionary.providers.languageOptions.english },
            { value: 'es', label: dictionary.providers.languageOptions.spanish },
            { value: 'et', label: dictionary.providers.languageOptions.estonian },
            { value: 'fa', label: dictionary.providers.languageOptions.persian },
            { value: 'fi', label: dictionary.providers.languageOptions.finnish },
            { value: 'fr', label: dictionary.providers.languageOptions.french },
            { value: 'gl', label: dictionary.providers.languageOptions.galician },
            { value: 'he', label: dictionary.providers.languageOptions.hebrew },
            { value: 'hi', label: dictionary.providers.languageOptions.hindi },
            { value: 'hr', label: dictionary.providers.languageOptions.croatian },
            { value: 'hu', label: dictionary.providers.languageOptions.hungarian },
            { value: 'hy', label: dictionary.providers.languageOptions.armenian },
            { value: 'id', label: dictionary.providers.languageOptions.indonesian },
            { value: 'is', label: dictionary.providers.languageOptions.icelandic },
            { value: 'it', label: dictionary.providers.languageOptions.italian },
            { value: 'kk', label: dictionary.providers.languageOptions.kazakh },
            { value: 'kn', label: dictionary.providers.languageOptions.kannada },
            { value: 'ko', label: dictionary.providers.languageOptions.korean },
            { value: 'lt', label: dictionary.providers.languageOptions.lithuanian },
            { value: 'lv', label: dictionary.providers.languageOptions.latvian },
            { value: 'mk', label: dictionary.providers.languageOptions.macedonian },
            { value: 'ms', label: dictionary.providers.languageOptions.malay },
            { value: 'ne', label: dictionary.providers.languageOptions.nepali },
            { value: 'nl', label: dictionary.providers.languageOptions.dutch },
            { value: 'no', label: dictionary.providers.languageOptions.norwegian },
            { value: 'pl', label: dictionary.providers.languageOptions.polish },
            { value: 'pt', label: dictionary.providers.languageOptions.portuguese },
            { value: 'ro', label: dictionary.providers.languageOptions.romanian },
            { value: 'ru', label: dictionary.providers.languageOptions.russian },
            { value: 'sk', label: dictionary.providers.languageOptions.slovak },
            { value: 'sl', label: dictionary.providers.languageOptions.slovenian },
            { value: 'sr', label: dictionary.providers.languageOptions.serbian },
            { value: 'sv', label: dictionary.providers.languageOptions.swedish },
            { value: 'sw', label: dictionary.providers.languageOptions.swahili },
            { value: 'ta', label: dictionary.providers.languageOptions.tamil },
            { value: 'th', label: dictionary.providers.languageOptions.thai },
            { value: 'tl', label: dictionary.providers.languageOptions.filipino },
            { value: 'tr', label: dictionary.providers.languageOptions.turkish },
            { value: 'uk', label: dictionary.providers.languageOptions.ukrainian },
            { value: 'ur', label: dictionary.providers.languageOptions.urdu },
            { value: 'vi', label: dictionary.providers.languageOptions.vietnamese },
            { value: 'zh', label: dictionary.providers.languageOptions.chinese },
          ],
        },
        {
          key: 'OPENAI_INSTRUCTIONS',
          label: dictionary.providers.fieldsExtra.openaiInstructions,
          placeholder: dictionary.providers.placeholders.openaiInstructions,
          widget: 'textarea',
        },
      ],
    },
    {
      id: 'sts-elevenlabs',
      type: 'STS',
      label: dictionary.providers.templates.stsElevenlabs.label,
      description: dictionary.providers.templates.stsElevenlabs.description,
      defaultImage: 'agentvoiceresponse/avr-sts-elevenlabs',
      fields: [
        {
          key: 'ELEVENLABS_AGENT_ID',
          label: dictionary.providers.fieldsExtra.elevenlabsAgentId,
          placeholder: 'agent_...',
          required: true,
        },
        {
          key: 'ELEVENLABS_API_KEY',
          label: dictionary.providers.fieldsExtra.elevenlabsApiKey,
          placeholder: 'elevenlabs-api-key',
          required: true,
          inputType: 'password',
        },
      ],
    },
    {
      id: 'sts-gemini',
      type: 'STS',
      label: dictionary.providers.templates.stsGemini.label,
      description: dictionary.providers.templates.stsGemini.description,
      defaultImage: 'agentvoiceresponse/avr-sts-gemini',
      defaults: {
        GEMINI_MODEL: 'gemini-2.5-flash-preview-native-audio-dialog',
      },
      fields: [
        {
          key: 'GEMINI_API_KEY',
          label: dictionary.providers.fieldsExtra.geminiApiKey,
          placeholder: 'gk-...',
          required: true,
          inputType: 'password',
        },
        {
          key: 'GEMINI_MODEL',
          label: dictionary.providers.fieldsExtra.geminiModel,
          placeholder: 'gemini-2.5-flash-preview-native-audio-dialog',
          required: true,
        },
        {
          key: 'GEMINI_INSTRUCTIONS',
          label: dictionary.providers.fieldsExtra.geminiInstructions,
          placeholder: dictionary.providers.placeholders.geminiInstructions,
          widget: 'textarea',
        },
      ],
    },
    {
      id: 'sts-deepgram',
      type: 'STS',
      label: dictionary.providers.templates.stsDeepgram.label,
      description: dictionary.providers.templates.stsDeepgram.description,
      defaultImage: 'agentvoiceresponse/avr-sts-deepgram',
      defaults: {
        DEEPGRAM_API_KEY: '',
        AGENT_PROMPT: 'You are an helpfull Assistant',
        DEEPGRAM_ASR_MODEL: 'nova-3',
        OPENAI_MODEL: 'gpt-4o-mini',
        DEEPGRAM_TTS_MODEL: 'aura-2-thalia-en',
        DEEPGRAM_GREETING: "Hi there, I'm your virtual assistant—how can I help today?",
      },
      fields: [
        {
          key: 'DEEPGRAM_API_KEY',
          label: dictionary.providers.fieldsExtra.deepgramApiKey,
          required: true,
          inputType: 'password',
        },
        {
          key: 'AGENT_PROMPT',
          label: dictionary.providers.fieldsExtra.agentPrompt,
          placeholder: dictionary.providers.placeholders.agentPrompt,
          widget: 'textarea',
        },
        {
          key: 'DEEPGRAM_ASR_MODEL',
          label: dictionary.providers.fieldsExtra.deepgramAsrModel,
          placeholder: 'nova-3',
        },
        {
          key: 'OPENAI_MODEL',
          label: dictionary.providers.fieldsExtra.openaiModel,
          placeholder: 'gpt-4o-mini',
        },
        {
          key: 'DEEPGRAM_TTS_MODEL',
          label: dictionary.providers.fieldsExtra.deepgramTtsModel,
          placeholder: 'aura-2-thalia-en',
        },
        {
          key: 'DEEPGRAM_GREETING',
          label: dictionary.providers.fieldsExtra.deepgramGreeting,
          placeholder: dictionary.providers.placeholders.deepgramGreeting,
          widget: 'textarea',
        },
      ],
    },
  ];

  const createProviderSchema = (dict: Dictionary, templates: ProviderTemplate[]) => z
    .object({
      name: z.string().min(2, dict.providers.validation.nameRequired),
      type: z.enum(['ASR', 'LLM', 'TTS', 'STS']),
      templateId: z.string().optional(),
      image: z.string().optional(),
      env: z.record(z.string(), z.string().optional()).optional(),
    })
    .superRefine((values, ctx) => {
      if (values.templateId) {
        const template = templates.find((tpl) => tpl.id === values.templateId);
        if (!template) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.providers.validation.invalidTemplate,
            path: ['templateId'],
          });
          return;
        }
        if (template.type !== values.type) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.providers.validation.incompatibleTemplate,
            path: ['templateId'],
          });
        }
        const image = values.image?.trim() || template.defaultImage || '';
        if (!image) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.providers.validation.dockerImageRequired,
            path: ['image'],
          });
        }
        template.fields.forEach((field) => {
          const fieldValue = values.env?.[field.key]?.trim();
          if (field.required && !fieldValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: dict.providers.validation.requiredField,
              path: ['env', field.key],
            });
          }
        });
      }
    });

  const providerSchema = createProviderSchema(dictionary, providerTemplates);

  // Utility functions
  const buildDefaultEnv = (template?: ProviderTemplate): Record<string, string> => {
    if (!template) {
      return {};
    }
    const env: Record<string, string> = {};
    template.fields.forEach((field) => {
      env[field.key] = template.defaults?.[field.key] ?? '';
    });
    return env;
  };

  const inferTemplate = (provider: ProviderDto): ProviderTemplate | undefined => {
    if (!provider.config?.env) {
      return undefined;
    }
    const env = provider.config.env;
    return providerTemplates.find((tpl) => {
      if (tpl.type !== provider.type) {
        return false;
      }
      return tpl.fields.every((field) => {
        if (field.required) {
          return env[field.key] !== undefined;
        }
        return true;
      });
    });
  };

  const providerToFormValues = (provider: ProviderDto): FormValues => {
    const template = inferTemplate(provider);
    const envConfig = (provider.config?.env as Record<string, string>) ?? {};
    const envEntries = template
      ? template.fields.reduce((acc, field) => {
          if (field.key === 'OPENAI_LANGUAGE') {
            const raw = String(envConfig[field.key] ?? '');
            acc[field.key] = !raw || raw === 'NULL' ? 'auto' : raw;
            return acc;
          }
          acc[field.key] = String(envConfig[field.key] ?? '');
          return acc;
        }, {} as Record<string, string>)
      : Object.fromEntries(
          Object.entries(envConfig).map(([key, value]) => [key, String(value ?? '')]),
        );

    return {
      name: provider.name,
      type: provider.type,
      templateId: template?.id,
      image: provider.config?.image ?? template?.defaultImage ?? '',
      env: envEntries,
    };
  };

  const buildProviderPayload = (values: FormValues): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      type: values.type,
    };

    const template = values.templateId
      ? providerTemplates.find((tpl) => tpl.id === values.templateId)
      : undefined;

    if (template) {
      const image = values.image?.trim() || template.defaultImage || '';
      const envEntries = template.fields
        .map((field) => {
          const rawValue = values.env?.[field.key] ?? '';
          const trimmed = rawValue.trim();
          if (field.key === 'OPENAI_LANGUAGE') {
            return trimmed === 'auto' ? null : [field.key, trimmed] as [string, string];
          }
          if (trimmed.length > 0) {
            return [field.key, trimmed] as [string, string];
          }
          if (field.required) {
            return [field.key, trimmed] as [string, string];
          }
          return null;
        })
        .filter((entry): entry is [string, string] => entry !== null);

      const config: ProviderConfig = {};
      if (image) {
        config.image = image;
      }
      if (envEntries.length > 0) {
        config.env = Object.fromEntries(envEntries);
      }
      if (Object.keys(config).length > 0) {
        payload.config = config;
      }
    } else {
      const image = values.image?.trim();
      const envEntries = values.env
        ? Object.entries(values.env)
            .map(([key, value]) => [key, (value ?? '').trim()])
            .filter(([, trimmed]) => trimmed.length > 0)
        : [];

      if ((image && image.length > 0) || envEntries.length > 0) {
        const config: ProviderConfig = {};
        if (image && image.length > 0) {
          config.image = image;
        }
        if (envEntries.length > 0) {
          config.env = Object.fromEntries(envEntries);
        }
        payload.config = config;
      }
    }

    return payload;
  };

  const useProviderTemplateController = (
    form: UseFormReturn<FormValues>,
    options?: { skipInitialPopulate?: boolean; resetImageOnTemplateChange?: boolean },
  ) => {
    const { skipInitialPopulate = false, resetImageOnTemplateChange = false } = options ?? {};
    const providerType = form.watch('type');
    const templateId = form.watch('templateId');

    const filteredTemplates = useMemo(
      () => providerTemplates.filter((tpl) => tpl.type === providerType),
      [providerType],
    );

    const selectedTemplate = useMemo(
      () => providerTemplates.find((tpl) => tpl.id === templateId),
      [templateId],
    );

    const initialPopulateRef = useRef<boolean>(skipInitialPopulate);

    useEffect(() => {
      if (filteredTemplates.length === 0) {
        form.setValue('templateId', undefined, { shouldDirty: false, shouldValidate: true });
        form.setValue('image', '', { shouldDirty: false });
        form.setValue('env', {}, { shouldDirty: false });
        return;
      }

      const currentTemplateId = form.getValues('templateId');
      if (!currentTemplateId || !filteredTemplates.some((tpl) => tpl.id === currentTemplateId)) {
        form.setValue('templateId', filteredTemplates[0].id, {
          shouldDirty: false,
          shouldValidate: true,
        });
        initialPopulateRef.current = skipInitialPopulate;
      }
    }, [filteredTemplates, form, skipInitialPopulate]);

    useEffect(() => {
      if (!selectedTemplate) {
        form.setValue('image', '', { shouldDirty: false });
        form.setValue('env', {}, { shouldDirty: false });
        return;
      }

      if (initialPopulateRef.current) {
        initialPopulateRef.current = false;
        return;
      }

      const previousEnv = form.getValues('env') ?? {};
      const nextEnv = buildDefaultEnv(selectedTemplate);
      selectedTemplate.fields.forEach((field) => {
        const previousValue = previousEnv[field.key];
        const fieldName = `env.${field.key}` as const;
        const fieldState = form.getFieldState(fieldName, form.formState);
        if (fieldState.isDirty && previousValue && previousValue.trim().length > 0) {
          nextEnv[field.key] = previousValue;
        }
      });
      form.setValue('env', nextEnv, { shouldDirty: false });

      const imageState = form.getFieldState('image');
      const shouldUpdateImage = resetImageOnTemplateChange || !imageState.isDirty;

      if (shouldUpdateImage && selectedTemplate.defaultImage) {
        form.setValue('image', selectedTemplate.defaultImage, { shouldDirty: false });
      }
    }, [selectedTemplate, form, resetImageOnTemplateChange]);

    return { filteredTemplates, selectedTemplate };
  };

  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const pageSizeOptions = [10, 25, 50];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderDto | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const defaultType: ProviderType = 'STS';
  const defaultTemplate = providerTemplates.find((tpl) => tpl.type === defaultType);

  const form = useForm<FormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      type: defaultType,
      templateId: defaultTemplate?.id,
      image: defaultTemplate?.defaultImage ?? '',
      env: buildDefaultEnv(defaultTemplate),
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      type: defaultType,
      templateId: defaultTemplate?.id,
      image: defaultTemplate?.defaultImage ?? '',
      env: buildDefaultEnv(defaultTemplate),
    },
  });

  const { filteredTemplates: createTemplates, selectedTemplate: createSelectedTemplate } =
    useProviderTemplateController(form, { resetImageOnTemplateChange: true });
  const { filteredTemplates: editTemplates, selectedTemplate: editSelectedTemplate } =
    useProviderTemplateController(editForm, { skipInitialPopulate: true });

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<ProviderDto>>('/providers', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setProviders(data.data);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        hasNextPage: data.hasNextPage,
        hasPreviousPage: data.hasPreviousPage,
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.providers.errors.loadProviders);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.providers.errors.loadProviders, pagination.limit, pagination.page]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const onSubmit = async (values: FormValues) => {
    if (isReadOnly) {
      return;
    }
    setSubmitting(true);
    try {
      const body = buildProviderPayload(values);
      await apiFetch<ProviderDto>('/providers', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setDialogOpen(false);
      form.reset({
        name: '',
        type: defaultType,
        templateId: defaultTemplate?.id,
        image: defaultTemplate?.defaultImage ?? '',
        env: buildDefaultEnv(defaultTemplate),
      });
      await loadProviders();
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('name', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.providers.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (provider: ProviderDto) => {
    if (isReadOnly) {
      return;
    }
    setError(null);
    setEditingProvider(provider);
    editForm.reset(providerToFormValues(provider));
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: FormValues) => {
    if (!editingProvider) {
      return;
    }
    if (isReadOnly) {
      return;
    }
    setUpdating(true);
    try {
      // Per l'aggiornamento, inviamo solo le variabili d'ambiente modificate
      // mantenendo invariati nome, tipo, template e immagine
      const body = {
        config: {
          ...editingProvider.config,
          env: values.env ? Object.fromEntries(
            Object.entries(values.env)
              .map(([key, value]) => [key, (value ?? '').trim()])
              .filter(([, trimmed]) => trimmed.length > 0)
          ) : undefined,
        }
      };
      
      await apiFetch<ProviderDto>(`/providers/${editingProvider.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditDialogOpen(false);
      setEditingProvider(null);
      await loadProviders();
    } catch (err) {
      if (err instanceof ApiError) {
        editForm.setError('root', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.providers.errors.update);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    if (!deleteTarget) {
      return;
    }
    if (isReadOnly) {
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/providers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadProviders();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.providers.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.providers.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.providers.subtitle}</p>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            {dictionary.providers.notices.readOnly}
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <ServerCog className="mr-2 h-4 w-4" /> {dictionary.providers.buttons.new}
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[1400px] max-w-[95vw] max-h-[90vh] overflow-hidden p-0 flex">
            <Form {...form}>
              <form className="flex max-h-[90vh] flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader className="sticky top-0 z-10 border-b border-border/60 bg-background px-6 py-4">
                  <DialogTitle>{dictionary.providers.createTitle}</DialogTitle>
                  <DialogDescription>{dictionary.providers.createDescription}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.providers.fields.name}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={dictionary.providers.placeholders.name}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.providers.fields.type}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={dictionary.common.none} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ASR">ASR</SelectItem>
                              <SelectItem value="LLM">LLM</SelectItem>
                              <SelectItem value="TTS">TTS</SelectItem>
                              <SelectItem value="STS">STS</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {createTemplates.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {createTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {dictionary.providers.notices.noTemplate}
                    </p>
                  )}

                  {createSelectedTemplate ? (
                    <div className="space-y-4 rounded-md border border-dashed border-border/60 p-4">
                      <p className="text-sm text-muted-foreground">
                        {createSelectedTemplate.description}
                      </p>
                      <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{dictionary.providers.fields.image}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={createSelectedTemplate.defaultImage ?? 'repository:tag'}
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {createSelectedTemplate.fields.map((fieldConfig) => (
                        <FormField
                          key={fieldConfig.key}
                          control={form.control}
                          name={`env.${fieldConfig.key}` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {fieldConfig.label}
                                {fieldConfig.required ? (
                                  <span className="text-destructive"> *</span>
                                ) : null}
                              </FormLabel>
                              <FormControl>
                                {fieldConfig.widget === 'textarea' ? (
                                  <Textarea
                                    placeholder={fieldConfig.placeholder}
                                    {...field}
                                    value={field.value ?? ''}
                                  />
                                ) : fieldConfig.widget === 'select' ? (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={fieldConfig.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(fieldConfig.options ?? []).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    type={fieldConfig.inputType === 'password' ? 'password' : 'text'}
                                    placeholder={fieldConfig.placeholder}
                                    {...field}
                                    value={field.value ?? ''}
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <DialogFooter className="sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4">
                  <Button type="submit" disabled={submitting || isReadOnly}>
                    {submitting
                      ? dictionary.providers.buttons.saving
                      : dictionary.providers.buttons.create}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.providers.tableTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead>{dictionary.providers.table.id}</TableHead>
                  <TableHead>{dictionary.providers.table.name}</TableHead>
                  <TableHead>{dictionary.providers.table.type}</TableHead>
                  <TableHead>{dictionary.providers.table.image}</TableHead>
                  <TableHead className="text-right">{dictionary.providers.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                        {provider.id}
                      </TableCell>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.type}</TableCell>
                      <TableCell>{provider.config?.image ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(provider)}
                            disabled={isReadOnly}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setError(null);
                              setDeleteTarget(provider);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={isReadOnly || (deleting && deleteTarget?.id === provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                labels={dictionary.pagination}
                pageSizeOptions={pageSizeOptions}
                onPageSizeChange={(limit) =>
                  setPagination((prev) => ({ ...prev, limit, page: 1 }))
                }
                onPageChange={(page) =>
                  setPagination((prev) => ({ ...prev, page }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingProvider(null);
          }
        }}
      >
        <DialogContent className="w-[1400px] max-w-[95vw] max-h-[90vh] overflow-hidden p-0 flex">
          <Form {...editForm}>
            <form className="flex max-h-[90vh] flex-1 flex-col" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <DialogHeader className="sticky top-0 z-10 border-b border-border/60 bg-background px-6 py-4">
                <DialogTitle>{dictionary.providers.editTitle}</DialogTitle>
                <DialogDescription>{dictionary.providers.editDescription}</DialogDescription>
              </DialogHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.providers.fields.name}</FormLabel>
                      <FormControl>
                          <Input
                            placeholder={dictionary.providers.placeholders.name}
                            {...field}
                            value={field.value ?? ''}
                            disabled
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.providers.fields.type}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASR">ASR</SelectItem>
                            <SelectItem value="LLM">LLM</SelectItem>
                            <SelectItem value="TTS">TTS</SelectItem>
                            <SelectItem value="STS">STS</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editTemplates.length > 0 ? (
                  <FormField
                    control={editForm.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.providers.fields.template}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value} disabled>
                            <SelectTrigger>
                              <SelectValue placeholder={dictionary.common.none} />
                            </SelectTrigger>
                            <SelectContent>
                              {editTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {dictionary.providers.notices.noTemplateEdit}
                  </p>
                )}

                {editSelectedTemplate ? (
                  <div className="space-y-4 rounded-md border border-dashed border-border/60 p-4">
                    <p className="text-sm text-muted-foreground">{editSelectedTemplate.description}</p>
                    <FormField
                      control={editForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.providers.fields.image}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={editSelectedTemplate.defaultImage ?? 'repository:tag'}
                              {...field}
                              value={field.value ?? ''}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {editSelectedTemplate.fields.map((fieldConfig) => (
                      <FormField
                        key={fieldConfig.key}
                        control={editForm.control}
                        name={`env.${fieldConfig.key}` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {fieldConfig.label}
                              {fieldConfig.required ? <span className="text-destructive"> *</span> : null}
                            </FormLabel>
                            <FormControl>
                              {fieldConfig.widget === 'textarea' ? (
                                <Textarea
                                  placeholder={fieldConfig.placeholder}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              ) : fieldConfig.widget === 'select' ? (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={fieldConfig.placeholder} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(fieldConfig.options ?? []).map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={fieldConfig.inputType === 'password' ? 'password' : 'text'}
                                  placeholder={fieldConfig.placeholder}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <DialogFooter className="sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4">
                <Button type="submit" disabled={updating || isReadOnly}>
                  {updating ? dictionary.providers.buttons.saving : dictionary.providers.buttons.update}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dictionary.providers.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dictionary.providers.delete.description.replace('{name}', deleteTarget?.name ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReadOnly || deleting}>
              {dictionary.common.buttons.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isReadOnly || deleting}
            >
              {deleting ? dictionary.providers.delete.processing : dictionary.providers.delete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}
