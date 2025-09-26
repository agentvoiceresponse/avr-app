'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Pencil, Trash2, Shield } from 'lucide-react';
import { apiFetch, ApiError, type PaginatedResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
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
  agent: {
    id: string;
    name: string;
  };
}

interface AgentDto {
  id: string;
  name: string;
}

const numberSchema = z.object({
  value: z
    .string()
    .min(5, 'Minimo 5 caratteri')
    .max(32, 'Massimo 32 caratteri')
    .regex(/^\+?[0-9]+$/, 'Sono ammessi solo cifre ed eventualmente il prefisso +'),
  agentId: z.string().uuid('Seleziona un agente valido'),
});

const updateNumberSchema = numberSchema;

type NumberFormValues = z.infer<typeof numberSchema>;

type UpdateNumberFormValues = z.infer<typeof updateNumberSchema>;

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
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);
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

  const isReadOnly = user?.role === 'viewer';

  const form = useForm<NumberFormValues>({
    resolver: zodResolver(numberSchema),
    defaultValues: {
      value: '',
      agentId: '',
    },
  });

  const editForm = useForm<UpdateNumberFormValues>({
    resolver: zodResolver(updateNumberSchema),
    defaultValues: {
      value: '',
      agentId: '',
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
    loadNumbers();
  }, [loadAgents, loadNumbers]);

  const openEditDialog = (number: NumberDto) => {
    setError(null);
    setEditingNumber(number);
    editForm.reset({ value: number.value, agentId: number.agent.id });
    setEditDialogOpen(true);
  };

  const onSubmit = async (values: NumberFormValues) => {
    setSubmitting(true);
    try {
      await apiFetch<NumberDto>('/numbers', {
        method: 'POST',
        body: JSON.stringify({
          value: values.value.trim(),
          agentId: values.agentId,
        }),
      });
      setDialogOpen(false);
      form.reset({ value: '', agentId: '' });
      await loadNumbers();
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('value', { message: err.message });
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
      await apiFetch<NumberDto>(`/numbers/${editingNumber.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          value: values.value.trim(),
          agentId: values.agentId,
        }),
      });
      setEditDialogOpen(false);
      setEditingNumber(null);
      editForm.reset({ value: '', agentId: '' });
      await loadNumbers();
    } catch (err) {
      if (err instanceof ApiError) {
        editForm.setError('value', { message: err.message });
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
                    <TableHead>{dictionary.numbers.table.agent}</TableHead>
                    {isReadOnly ? null : (
                      <TableHead className="text-right">{dictionary.numbers.table.actions}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium">{number.value}</TableCell>
                      <TableCell>{number.agent?.name ?? dictionary.common.none}</TableCell>
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
