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
import { ServerCog, Pencil, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type PaginatedResponse } from '@/lib/api';
import { useI18n, type Dictionary } from '@/lib/i18n';
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
  widget?: 'textarea';
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

  const providerTemplates: ProviderTemplate[] = [
    {
      id: 'sts-openai',
      type: 'STS',
      label: dictionary.providers.templates.stsOpenai.label,
      description: dictionary.providers.templates.stsOpenai.description,
      defaultImage: 'agentvoiceresponse/avr-sts-openai',
      defaults: {
        OPENAI_MODEL: 'gpt-4o-mini',
      },
      fields: [
        {
          key: 'OPENAI_API_KEY',
          label: 'OPENAI_API_KEY',
          placeholder: 'sk-...',
          required: true,
          inputType: 'password',
        },
        {
          key: 'OPENAI_MODEL',
          label: 'OPENAI_MODEL',
          placeholder: 'gpt-4o-realtime-preview',
          required: true,
        },
        {
          key: 'OPENAI_INSTRUCTIONS',
          label: 'OPENAI_INSTRUCTIONS',
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
          label: 'ELEVENLABS_AGENT_ID',
          placeholder: 'agent_...',
          required: true,
        },
        {
          key: 'ELEVENLABS_API_KEY',
          label: 'ELEVENLABS_API_KEY',
          placeholder: 'elevenlabs-api-key',
          required: true,
          inputType: 'password',
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
      return tpl.fields.every((field) => env[field.key] !== undefined);
    });
  };

  const providerToFormValues = (provider: ProviderDto): FormValues => {
    const template = inferTemplate(provider);
    const envConfig = (provider.config?.env as Record<string, string>) ?? {};
    const envEntries = template
      ? template.fields.reduce((acc, field) => {
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
        if (previousValue && previousValue.trim().length > 0) {
          nextEnv[field.key] = previousValue;
        }
      });
      form.setValue('env', nextEnv, { shouldDirty: false });

      const currentImage = form.getValues('image');
      const imageState = form.getFieldState('image');
      const shouldUpdateImage = resetImageOnTemplateChange ? !imageState.isDirty : !currentImage;

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
    useProviderTemplateController(form);
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
    setError(null);
    setEditingProvider(provider);
    editForm.reset(providerToFormValues(provider));
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: FormValues) => {
    if (!editingProvider) {
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ServerCog className="mr-2 h-4 w-4" /> {dictionary.providers.buttons.new}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{dictionary.providers.createTitle}</DialogTitle>
              <DialogDescription>{dictionary.providers.createDescription}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.providers.fields.name}</FormLabel>
                      <FormControl>
                        <Input placeholder={dictionary.providers.placeholders.name} {...field} />
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
                    <p className="text-sm text-muted-foreground">{createSelectedTemplate.description}</p>
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
                              {fieldConfig.required ? <span className="text-destructive"> *</span> : null}
                            </FormLabel>
                            <FormControl>
                              {fieldConfig.widget === 'textarea' ? (
                                <Textarea placeholder={fieldConfig.placeholder} {...field} />
                              ) : (
                                <Input
                                  type={fieldConfig.inputType === 'password' ? 'password' : 'text'}
                                  placeholder={fieldConfig.placeholder}
                                  value={field.value ?? ''}
                                  {...field}
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

                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? dictionary.providers.buttons.saving : dictionary.providers.buttons.create}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                  <TableHead>{dictionary.providers.table.name}</TableHead>
                  <TableHead>{dictionary.providers.table.type}</TableHead>
                  <TableHead>{dictionary.providers.table.image}</TableHead>
                  <TableHead className="text-right">{dictionary.providers.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.type}</TableCell>
                      <TableCell>{provider.config?.image ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(provider)}>
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
                            disabled={deleting && deleteTarget?.id === provider.id}
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{dictionary.providers.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.providers.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.providers.fields.name}</FormLabel>
                    <FormControl>
                        <Input placeholder={dictionary.providers.placeholders.name} {...field} disabled />
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
                              <Textarea placeholder={fieldConfig.placeholder} {...field} />
                            ) : (
                              <Input
                                type={fieldConfig.inputType === 'password' ? 'password' : 'text'}
                                placeholder={fieldConfig.placeholder}
                                {...field}
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

              <DialogFooter>
                <Button type="submit" disabled={updating}>
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
            <AlertDialogCancel disabled={deleting}>{dictionary.common.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
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
