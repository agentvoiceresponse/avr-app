'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Pencil, Trash2, Shield } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
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

interface NumberDto {
  id: string;
  value: string;
  application: 'agent' | 'internal' | 'transfer';
  denoiseEnabled?: boolean | null;
  recordingEnabled?: boolean | null;
  agent?: {
    id: string;
    name: string;
  } | null;
  phone?: {
    id: string;
    fullName: string;
  } | null;
  trunk?: {
    id: string;
    name: string;
  } | null;
}

interface AgentDto {
  id: string;
  name: string;
}

interface PhoneDto {
  id: string;
  fullName: string;
}

interface TrunkDto {
  id: string;
  name: string;
}

const APPLICATIONS = ['agent', 'internal', 'transfer'] as const;
type ApplicationValue = (typeof APPLICATIONS)[number];
type ToggleValue = 'on' | 'off';

const optionalId = (message: string) =>
  z
    .string()
    .uuid(message)
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val));

const makeNumberSchema = (dict: Dictionary) =>
  z
    .object({
      value: z
        .string()
        .min(3, 'Minimo 3 caratteri')
        .max(32, 'Massimo 32 caratteri')
        .regex(/^\+?[0-9]+$/, dict.numbers.validation.numberFormat),
      application: z.enum(APPLICATIONS),
      agentId: optionalId(dict.numbers.validation.agentRequired).optional(),
      phoneId: optionalId(dict.numbers.validation.phoneRequired).optional(),
      trunkId: optionalId(dict.numbers.validation.trunkRequired).optional(),
      denoiseEnabled: z.enum(['on', 'off']).optional(),
      recordingEnabled: z.enum(['on', 'off']).optional(),
    })
    .superRefine((val, ctx) => {
      if (val.application === 'agent' && !val.agentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agentId'],
          message: dict.numbers.validation.agentRequired,
        });
      }
      if (val.application === 'internal' && !val.phoneId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phoneId'],
          message: dict.numbers.validation.phoneRequired,
        });
      }
      if (val.application === 'transfer' && !val.trunkId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['trunkId'],
          message: dict.numbers.validation.trunkRequired,
        });
      }
    });

type NumberFormValues = z.infer<ReturnType<typeof makeNumberSchema>>;

type UpdateNumberFormValues = NumberFormValues;

function NumbersSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<NumberDto[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const pageSizeOptions = [10, 25, 50];
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [phones, setPhones] = useState<PhoneDto[]>([]);
  const [trunks, setTrunks] = useState<TrunkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [phonesLoading, setPhonesLoading] = useState(true);
  const [trunksLoading, setTrunksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NumberDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<NumberDto | null>(null);
  const [updating, setUpdating] = useState(false);
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const numberSchema = useMemo(() => makeNumberSchema(dictionary), [dictionary]);

  const isReadOnly = user?.role === 'viewer';

  const form = useForm<NumberFormValues>({
    resolver: zodResolver(numberSchema),
    defaultValues: {
      value: '',
      application: 'agent',
      agentId: '',
      phoneId: '',
      trunkId: '',
      denoiseEnabled: 'on',
      recordingEnabled: 'off',
    },
  });

  const editForm = useForm<UpdateNumberFormValues>({
    resolver: zodResolver(numberSchema),
    defaultValues: {
      value: '',
      application: 'agent',
      agentId: '',
      phoneId: '',
      trunkId: '',
      denoiseEnabled: 'on',
      recordingEnabled: 'off',
    },
  });

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const response = await apiFetch<PaginatedResponse<AgentDto>>('/agents', {
        query: { page: 1, limit: 100 },
        paginated: true,
      });
      const mapped = response.data.map((agent) => ({ id: agent.id, name: agent.name }));
      setAgents(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare gli agenti');
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const loadPhones = useCallback(async () => {
    setPhonesLoading(true);
    try {
      const response = await apiFetch<PaginatedResponse<PhoneDto>>('/phones', {
        query: { page: 1, limit: 100 },
        paginated: true,
      });
      setPhones(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i telefoni');
    } finally {
      setPhonesLoading(false);
    }
  }, []);

  const loadTrunks = useCallback(async () => {
    setTrunksLoading(true);
    try {
      const response = await apiFetch<PaginatedResponse<TrunkDto>>('/trunks', {
        query: { page: 1, limit: 100 },
        paginated: true,
      });
      setTrunks(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i trunk');
    } finally {
      setTrunksLoading(false);
    }
  }, []);

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<NumberDto>>('/numbers', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setNumbers(data.data);
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
        setError(dictionary.numbers.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.numbers.errors.load, pagination.limit, pagination.page]);

  useEffect(() => {
    loadAgents();
    loadPhones();
    loadTrunks();
    loadNumbers();
  }, [loadAgents, loadNumbers, loadPhones, loadTrunks]);

  const openEditDialog = (number: NumberDto) => {
    setError(null);
    setEditingNumber(number);
    editForm.reset({
      value: number.value,
      application: number.application,
      agentId: number.agent?.id ?? '',
      phoneId: number.phone?.id ?? '',
      trunkId: number.trunk?.id ?? '',
      denoiseEnabled: number.denoiseEnabled === false ? 'off' : 'on',
      recordingEnabled: number.recordingEnabled ? 'on' : 'off',
    });
    setEditDialogOpen(true);
  };

  const onSubmit = async (values: NumberFormValues) => {
    setSubmitting(true);
    try {
      const isAgent = values.application === 'agent';
      const denoiseEnabled = isAgent ? values.denoiseEnabled === 'on' : undefined;
      const recordingEnabled = isAgent ? values.recordingEnabled === 'on' : undefined;
      await apiFetch<NumberDto>('/numbers', {
        method: 'POST',
        body: JSON.stringify({
          value: values.value.trim(),
          application: values.application,
          agentId: values.agentId || undefined,
          phoneId: values.phoneId || undefined,
          trunkId: values.trunkId || undefined,
          denoiseEnabled,
          recordingEnabled,
        }),
      });
      setDialogOpen(false);
      form.reset({
        value: '',
        application: 'agent',
        agentId: '',
        phoneId: '',
        trunkId: '',
        denoiseEnabled: 'on',
        recordingEnabled: 'off',
      });
      await loadNumbers();
    } catch (err) {
      if (err instanceof ApiError) {
        const lower = err.message.toLowerCase();
        const field: keyof NumberFormValues =
          lower.includes('application')
            ? 'application'
            : lower.includes('agent')
              ? 'agentId'
          : lower.includes('phone')
            ? 'phoneId'
            : lower.includes('trunk')
              ? 'trunkId'
              : 'value';
        form.setError(field, { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.numbers.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: UpdateNumberFormValues) => {
    if (!editingNumber) {
      return;
    }

    setUpdating(true);
    try {
      const isAgent = values.application === 'agent';
      const denoiseEnabled = isAgent ? values.denoiseEnabled === 'on' : undefined;
      const recordingEnabled = isAgent ? values.recordingEnabled === 'on' : undefined;
      await apiFetch<NumberDto>(`/numbers/${editingNumber.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          value: values.value.trim(),
          application: values.application,
          agentId: values.agentId || undefined,
          phoneId: values.phoneId || undefined,
          trunkId: values.trunkId || undefined,
          denoiseEnabled,
          recordingEnabled,
        }),
      });
      setEditDialogOpen(false);
      setEditingNumber(null);
      editForm.reset({
        value: '',
        application: 'agent',
        agentId: '',
        phoneId: '',
        trunkId: '',
        denoiseEnabled: 'on',
        recordingEnabled: 'off',
      });
      await loadNumbers();
    } catch (err) {
      if (err instanceof ApiError) {
        const lower = err.message.toLowerCase();
        const field: keyof UpdateNumberFormValues =
          lower.includes('application')
            ? 'application'
            : lower.includes('agent')
              ? 'agentId'
          : lower.includes('phone')
            ? 'phoneId'
            : lower.includes('trunk')
              ? 'trunkId'
              : 'value';
        editForm.setError(field, { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.numbers.errors.update);
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
      await apiFetch(`/numbers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadNumbers();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.numbers.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  const agentOptions = useMemo(() => agents, [agents]);
  const phoneOptions = useMemo(() => phones, [phones]);
  const trunkOptions = useMemo(() => trunks, [trunks]);
  const applicationOptions = useMemo(
    () =>
      APPLICATIONS.map((value) => ({
        value,
        label: dictionary.numbers.applicationOptions[value],
      })),
    [dictionary.numbers.applicationOptions],
  );
  const toggleOptions = useMemo(
    () => [
      { value: 'on', label: dictionary.numbers.toggleOptions.on },
      { value: 'off', label: dictionary.numbers.toggleOptions.off },
    ],
    [dictionary.numbers.toggleOptions],
  );

  const selectedCreateApplication = form.watch('application');
  const selectedEditApplication = editForm.watch('application');

  const formatApplication = (application: ApplicationValue) =>
    dictionary.numbers.applicationOptions[application];

  const formatDestination = (number: NumberDto) => {
    if (number.application === 'agent') {
      return number.agent?.name ?? dictionary.common.none;
    }
    if (number.application === 'internal') {
      return number.phone?.fullName || number.phone?.id || dictionary.common.none;
    }
    if (number.application === 'transfer') {
      return number.trunk?.name ?? dictionary.common.none;
    }
    return dictionary.common.none;
  };

  useEffect(() => {
    if (selectedCreateApplication === 'agent') {
      form.setValue('phoneId', '');
      form.setValue('trunkId', '');
    }
    if (selectedCreateApplication === 'internal') {
      form.setValue('agentId', '');
      form.setValue('trunkId', '');
    }
    if (selectedCreateApplication === 'transfer') {
      form.setValue('agentId', '');
      form.setValue('phoneId', '');
    }
  }, [selectedCreateApplication, form]);

  useEffect(() => {
    if (selectedEditApplication === 'agent') {
      editForm.setValue('phoneId', '');
      editForm.setValue('trunkId', '');
    }
    if (selectedEditApplication === 'internal') {
      editForm.setValue('agentId', '');
      editForm.setValue('trunkId', '');
    }
    if (selectedEditApplication === 'transfer') {
      editForm.setValue('agentId', '');
      editForm.setValue('phoneId', '');
    }
  }, [selectedEditApplication, editForm]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.numbers.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.numbers.subtitle}</p>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            {dictionary.numbers.notices.readOnly}
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={agentsLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> {dictionary.numbers.new}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{dictionary.numbers.createTitle}</DialogTitle>
                <DialogDescription>{dictionary.numbers.createDescription}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.numbers.fields.value}</FormLabel>
                        <FormControl>
                          <Input placeholder="es. +390123456789" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="application"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.numbers.fields.application}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={dictionary.common.none} />
                            </SelectTrigger>
                            <SelectContent>
                              {applicationOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedCreateApplication === 'agent' && (
                    <FormField
                      control={form.control}
                      name="agentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.numbers.fields.agent}</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={agentsLoading}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {agentOptions.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedCreateApplication === 'agent' && (
                    <FormField
                      control={form.control}
                      name="denoiseEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.numbers.fields.denoise}</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value as ToggleValue}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {toggleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedCreateApplication === 'agent' && (
                    <FormField
                      control={form.control}
                      name="recordingEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.numbers.fields.recording}</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value as ToggleValue}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {toggleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedCreateApplication === 'internal' && (
                    <FormField
                      control={form.control}
                      name="phoneId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.numbers.fields.phone}</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={phonesLoading}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {phoneOptions.map((phone) => (
                                  <SelectItem key={phone.id} value={phone.id}>
                                    {phone.fullName || phone.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedCreateApplication === 'transfer' && (
                    <FormField
                      control={form.control}
                      name="trunkId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary.numbers.fields.trunk}</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={trunksLoading}>
                              <SelectTrigger>
                                <SelectValue placeholder={dictionary.common.none} />
                              </SelectTrigger>
                              <SelectContent>
                                {trunkOptions.map((trunk) => (
                                  <SelectItem key={trunk.id} value={trunk.id}>
                                    {trunk.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? dictionary.numbers.buttons.creating : dictionary.numbers.buttons.create}
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
          <CardTitle>{dictionary.numbers.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <NumbersSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : numbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.common.none}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.numbers.table.number}</TableHead>
                    <TableHead>{dictionary.numbers.table.application}</TableHead>
                    <TableHead>{dictionary.numbers.table.destination}</TableHead>
                    {isReadOnly ? null : (
                      <TableHead className="text-right">{dictionary.numbers.table.actions}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium">{number.value}</TableCell>
                      <TableCell>{formatApplication(number.application)}</TableCell>
                      <TableCell>{formatDestination(number)}</TableCell>
                      {isReadOnly ? null : (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(number)}
                              disabled={updating && editingNumber?.id === number.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                setError(null);
                                setDeleteTarget(number);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleting && deleteTarget?.id === number.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
            setEditingNumber(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{dictionary.numbers.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.numbers.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.numbers.fields.value}</FormLabel>
                    <FormControl>
                      <Input placeholder="es. +390123456789" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="application"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.numbers.fields.application}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={dictionary.common.none} />
                        </SelectTrigger>
                        <SelectContent>
                          {applicationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedEditApplication === 'agent' && (
                <FormField
                  control={editForm.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.numbers.fields.agent}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} disabled={agentsLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            {agentOptions.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedEditApplication === 'agent' && (
                <FormField
                  control={editForm.control}
                  name="denoiseEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.numbers.fields.denoise}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value as ToggleValue}>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            {toggleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedEditApplication === 'agent' && (
                <FormField
                  control={editForm.control}
                  name="recordingEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.numbers.fields.recording}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value as ToggleValue}>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            {toggleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedEditApplication === 'internal' && (
                <FormField
                  control={editForm.control}
                  name="phoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.numbers.fields.phone}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} disabled={phonesLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            {phoneOptions.map((phone) => (
                              <SelectItem key={phone.id} value={phone.id}>
                                {phone.fullName || phone.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedEditApplication === 'transfer' && (
                <FormField
                  control={editForm.control}
                  name="trunkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.numbers.fields.trunk}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} disabled={trunksLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder={dictionary.common.none} />
                          </SelectTrigger>
                          <SelectContent>
                            {trunkOptions.map((trunk) => (
                              <SelectItem key={trunk.id} value={trunk.id}>
                                {trunk.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? dictionary.numbers.buttons.updating : dictionary.numbers.buttons.update}
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
            <AlertDialogTitle>{dictionary.numbers.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? dictionary.numbers.delete.description.replace('{value}', deleteTarget.value)
                : dictionary.numbers.delete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{dictionary.common.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? dictionary.numbers.delete.processing : dictionary.numbers.delete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
