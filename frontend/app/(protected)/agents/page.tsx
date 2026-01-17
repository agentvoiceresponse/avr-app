'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play, Square, PlusCircle, Waves, Pencil, Trash2, Shield } from 'lucide-react';
import { apiFetch, type PaginatedResponse } from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
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

interface ProviderDto {
  id: string;
  type: 'ASR' | 'LLM' | 'TTS' | 'STS';
  name: string;
}

type AgentMode = 'pipeline' | 'sts';

type AgentDto = {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  mode: AgentMode;
  providerAsr?: ProviderDto | null;
  providerLlm?: ProviderDto | null;
  providerTts?: ProviderDto | null;
  providerSts?: ProviderDto | null;
};

const createAgentSchema = (dict: Dictionary) =>
  z
    .object({
      name: z.string().min(2, dict.agents.validation.nameRequired),
      mode: z.enum(['pipeline', 'sts']),
      providerAsrId: z.string().optional(),
      providerLlmId: z.string().optional(),
      providerTtsId: z.string().optional(),
      providerStsId: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.mode === 'sts') {
        if (!values.providerStsId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.agents.validation.stsProviderRequired,
            path: ['providerStsId'],
          });
        }
        ['providerAsrId', 'providerLlmId', 'providerTtsId'].forEach((key) => {
          if (values[key as keyof typeof values]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: dict.agents.validation.noExtraProviders,
              path: [key],
            });
          }
        });
      } else {
        if (!values.providerAsrId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.agents.validation.asrProviderRequired,
            path: ['providerAsrId'],
          });
        }
        if (!values.providerLlmId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.agents.validation.llmProviderRequired,
            path: ['providerLlmId'],
          });
        }
        if (!values.providerTtsId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.agents.validation.ttsProviderRequired,
            path: ['providerTtsId'],
          });
        }
        if (values.providerStsId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dict.agents.validation.noStsInPipeline,
            path: ['providerStsId'],
          });
        }
      }
    });

type AgentFormValues = z.infer<ReturnType<typeof createAgentSchema>>;

type ProviderSelectProps = {
  form: UseFormReturn<AgentFormValues>;
  name: keyof AgentFormValues;
  label: string;
  options: ProviderDto[];
  disabled?: boolean;
};

function ProviderSelect({ form, name, label, options, disabled }: ProviderSelectProps) {
  const { dictionary } = useI18n();
  return (
    <FormField
      control={form.control}
      name={name as 'providerAsrId'}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
              value={field.value ?? 'none'}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={dictionary.common.none}>
                  {field.value ? options.find((p) => p.id === field.value)?.name : dictionary.common.none}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{dictionary.common.none}</SelectItem>
                {options.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMap, setActionMap] = useState<Record<string, boolean>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDto | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'viewer';

  const agentSchema = useMemo(() => createAgentSchema(dictionary), [dictionary]);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      mode: 'sts',
      providerAsrId: undefined,
      providerLlmId: undefined,
      providerTtsId: undefined,
      providerStsId: undefined,
    },
  });

  const editForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      mode: 'pipeline',
      providerAsrId: undefined,
      providerLlmId: undefined,
      providerTtsId: undefined,
      providerStsId: undefined,
    },
  });

  const providerOptions = useMemo(() => {
    const grouped: Record<ProviderDto['type'], ProviderDto[]> = {
      ASR: [],
      LLM: [],
      TTS: [],
      STS: [],
    };
    providers.forEach((provider) => {
      grouped[provider.type].push(provider);
    });
    return grouped;
  }, [providers]);

  const createMode = form.watch('mode');
  const editMode = editForm.watch('mode');

  useEffect(() => {
    if (createMode === 'sts') {
      form.setValue('providerAsrId', undefined);
      form.setValue('providerLlmId', undefined);
      form.setValue('providerTtsId', undefined);
    } else {
      form.setValue('providerStsId', undefined);
    }
  }, [createMode, form]);

  useEffect(() => {
    if (editMode === 'sts') {
      editForm.setValue('providerAsrId', undefined);
      editForm.setValue('providerLlmId', undefined);
      editForm.setValue('providerTtsId', undefined);
    } else {
      editForm.setValue('providerStsId', undefined);
    }
  }, [editMode, editForm]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, providersRes] = await Promise.all([
        apiFetch<PaginatedResponse<AgentDto>>('/agents', {
          query: { page: pagination.page, limit: pagination.limit },
          paginated: true,
        }),
        apiFetch<PaginatedResponse<ProviderDto>>('/providers', {
          query: { page: 1, limit: 100 },
          paginated: true,
        }),
      ]);
      setAgents(agentsRes.data);
      setPagination({
        page: agentsRes.page,
        limit: agentsRes.limit,
        total: agentsRes.total,
        hasNextPage: agentsRes.hasNextPage,
        hasPreviousPage: agentsRes.hasPreviousPage,
      });
      setProviders(providersRes.data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.agents.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.agents.errors.load, pagination.limit, pagination.page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toRequestBody = (values: AgentFormValues) => ({
    name: values.name,
    mode: values.mode,
    providerAsrId: values.providerAsrId || undefined,
    providerLlmId: values.providerLlmId || undefined,
    providerTtsId: values.providerTtsId || undefined,
    providerStsId: values.providerStsId || undefined,
  });

  const onSubmit = async (values: AgentFormValues) => {
    if (isReadOnly) {
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<AgentDto>('/agents', {
        method: 'POST',
        body: JSON.stringify(toRequestBody(values)),
      });
      setDialogOpen(false);
      form.reset({
        name: '',
        mode: 'sts',
        providerAsrId: undefined,
        providerLlmId: undefined,
        providerTtsId: undefined,
        providerStsId: undefined,
      });
      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.agents.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (agent: AgentDto) => {
    if (isReadOnly) {
      return;
    }
    setError(null);
    setEditingAgent(agent);
    editForm.reset({
      name: agent.name,
      mode: agent.mode,
      providerAsrId: agent.providerAsr?.id,
      providerLlmId: agent.providerLlm?.id,
      providerTtsId: agent.providerTts?.id,
      providerStsId: agent.providerSts?.id,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: AgentFormValues) => {
    if (!editingAgent) {
      return;
    }
    if (isReadOnly) {
      return;
    }
    setUpdating(true);
    try {
      await apiFetch<AgentDto>(`/agents/${editingAgent.id}`, {
        method: 'PUT',
        body: JSON.stringify(toRequestBody(values)),
      });
      setEditDialogOpen(false);
      setEditingAgent(null);
      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.agents.errors.update);
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
      await apiFetch(`/agents/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.agents.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  const triggerAction = async (id: string, action: 'run' | 'stop') => {
    if (isReadOnly) {
      return;
    }
    setActionMap((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/agents/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.agents.errors.action);
      }
    } finally {
      setActionMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const renderProvider = (provider?: ProviderDto | null) => {
    if (!provider) return '—';
    return `${provider.name} (${provider.type})`;
  };

  const pageSizeOptions = [10, 25, 50];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.agents.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.agents.subtitle}</p>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            {dictionary.agents.notices.readOnly}
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {dictionary.agents.new}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{dictionary.agents.createTitle}</DialogTitle>
                <DialogDescription>{dictionary.agents.createDescription}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.agents.modeLabel}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue>
                              {dictionary.agents.modes[field.value as AgentMode]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pipeline">
                              {dictionary.agents.modes.pipeline}
                            </SelectItem>
                            <SelectItem value="sts">{dictionary.agents.modes.sts}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.agents.fields.name}</FormLabel>
                      <FormControl>
                        <Input placeholder={dictionary.agents.placeholders.name} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {createMode === 'pipeline' ? (
                  <>
                    <ProviderSelect
                      form={form}
                      name="providerAsrId"
                      label={dictionary.agents.fields.providerAsr}
                      options={providerOptions.ASR}
                    />
                    <ProviderSelect
                      form={form}
                      name="providerLlmId"
                      label={dictionary.agents.fields.providerLlm}
                      options={providerOptions.LLM}
                    />
                    <ProviderSelect
                      form={form}
                      name="providerTtsId"
                      label={dictionary.agents.fields.providerTts}
                      options={providerOptions.TTS}
                    />
                  </>
                ) : null}
                {createMode === 'sts' ? (
                  <ProviderSelect
                    form={form}
                    name="providerStsId"
                    label={dictionary.agents.fields.providerSts}
                    options={providerOptions.STS}
                  />
                ) : null}
                <DialogFooter>
                  <Button type="submit" disabled={submitting || isReadOnly}>
                    {dictionary.agents.buttons.create}
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
          <CardTitle>{dictionary.agents.title}</CardTitle>
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
                    <TableHead>{dictionary.agents.table.id}</TableHead>
                    <TableHead>{dictionary.agents.table.name}</TableHead>
                    <TableHead>{dictionary.agents.table.status}</TableHead>
                    <TableHead>{dictionary.agents.table.providerAsr}</TableHead>
                    <TableHead>{dictionary.agents.table.providerLlm}</TableHead>
                    <TableHead>{dictionary.agents.table.providerTts}</TableHead>
                    <TableHead>{dictionary.agents.table.providerSts}</TableHead>
                    <TableHead className="text-right">{dictionary.agents.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                        {agent.id}
                      </TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>
                        <Badge variant={agent.status === 'running' ? 'default' : 'secondary'}>
                          <Waves className="mr-2 h-3 w-3" />
                          {dictionary.common.status[agent.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderProvider(agent.providerAsr)}</TableCell>
                      <TableCell>{renderProvider(agent.providerLlm)}</TableCell>
                      <TableCell>{renderProvider(agent.providerTts)}</TableCell>
                      <TableCell>{renderProvider(agent.providerSts)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isReadOnly || actionMap[agent.id]}
                            onClick={() => triggerAction(agent.id, 'run')}
                          >
                            <Play className="mr-2 h-3 w-3" /> {dictionary.common.buttons.run}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isReadOnly || actionMap[agent.id]}
                            onClick={() => triggerAction(agent.id, 'stop')}
                          >
                            <Square className="mr-2 h-3 w-3" /> {dictionary.common.buttons.stop}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(agent)}
                            disabled={isReadOnly}
                          >
                            <Pencil className="mr-2 h-3 w-3" /> {dictionary.common.buttons.edit}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setError(null);
                              setDeleteTarget(agent);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={isReadOnly || (deleting && deleteTarget?.id === agent.id)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> {dictionary.common.buttons.delete}
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
            setEditingAgent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{dictionary.agents.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.agents.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.agents.modeLabel}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue>
                            {dictionary.agents.modes[field.value as AgentMode]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pipeline">
                            {dictionary.agents.modes.pipeline}
                          </SelectItem>
                          <SelectItem value="sts">{dictionary.agents.modes.sts}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.agents.fields.name}</FormLabel>
                    <FormControl>
                      <Input placeholder={dictionary.agents.placeholders.name} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editMode === 'pipeline' ? (
                <>
                  <ProviderSelect
                    form={editForm}
                    name="providerAsrId"
                    label={dictionary.agents.fields.providerAsr}
                    options={providerOptions.ASR}
                  />
                  <ProviderSelect
                    form={editForm}
                    name="providerLlmId"
                    label={dictionary.agents.fields.providerLlm}
                    options={providerOptions.LLM}
                  />
                  <ProviderSelect
                    form={editForm}
                    name="providerTtsId"
                    label={dictionary.agents.fields.providerTts}
                    options={providerOptions.TTS}
                  />
                </>
              ) : null}
              {editMode === 'sts' ? (
                <ProviderSelect
                  form={editForm}
                  name="providerStsId"
                  label={dictionary.agents.fields.providerSts}
                  options={providerOptions.STS}
                />
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={updating || isReadOnly}>
                  {dictionary.agents.buttons.update}
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
            <AlertDialogTitle>{dictionary.agents.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dictionary.agents.delete.description.replace(
                '{name}',
                deleteTarget ? ` ${deleteTarget.name}` : '',
              )}
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
              {deleting
                ? dictionary.agents.delete.processing
                : dictionary.agents.delete.confirm}
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
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-12 w-full" />
      ))}
    </div>
  );
}
