'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Pencil, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { apiFetch, ApiError, type PaginatedResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TrunkDto {
  id: string;
  name: string;
  password: string;
}

const trunkSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caratteri').max(50, 'Massimo 50 caratteri'),
});

type TrunkFormValues = z.infer<typeof trunkSchema>;

export default function TrunksPage() {
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const [trunks, setTrunks] = useState<TrunkDto[]>([]);
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
  const [editingTrunk, setEditingTrunk] = useState<TrunkDto | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrunkDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const isReadOnly = user?.role === 'viewer';

  const form = useForm<TrunkFormValues>({
    resolver: zodResolver(trunkSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<TrunkFormValues>({
    resolver: zodResolver(trunkSchema),
    defaultValues: { name: '' },
  });

  const loadTrunks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<TrunkDto>>('/trunks', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setTrunks(data.data);
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
        setError(dictionary.trunks.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.trunks.errors.load, pagination.limit, pagination.page]);

  useEffect(() => {
    loadTrunks();
  }, [loadTrunks]);

  const resetForms = () => {
    form.reset({ name: '' });
    editForm.reset({ name: '' });
  };

  const onSubmit = async (values: TrunkFormValues) => {
    if (isReadOnly) {
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<TrunkDto>('/trunks', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim() }),
      });
      setDialogOpen(false);
      resetForms();
      await loadTrunks();
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('name', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.trunks.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (trunk: TrunkDto) => {
    if (isReadOnly) {
      return;
    }
    setError(null);
    setEditingTrunk(trunk);
    editForm.reset({ name: trunk.name });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: TrunkFormValues) => {
    if (!editingTrunk) {
      return;
    }
    if (isReadOnly) {
      return;
    }
    setUpdating(true);
    try {
      await apiFetch<TrunkDto>(`/trunks/${editingTrunk.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: values.name.trim() }),
      });
      setEditDialogOpen(false);
      setEditingTrunk(null);
      resetForms();
      await loadTrunks();
    } catch (err) {
      if (err instanceof ApiError) {
        editForm.setError('name', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.trunks.errors.update);
      }
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = (trunk: TrunkDto) => {
    if (isReadOnly) {
      return;
    }
    setDeleteTarget(trunk);
    setDeleteDialogOpen(true);
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
      await apiFetch(`/trunks/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadTrunks();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.trunks.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.trunks.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.trunks.subtitle}</p>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" /> {dictionary.trunks.notices.readOnly}
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {dictionary.trunks.new}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{dictionary.trunks.createTitle}</DialogTitle>
                <DialogDescription>{dictionary.trunks.createDescription}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.trunks.fields.name}</FormLabel>
                        <FormControl>
                          <Input placeholder="es. company-trunk" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={submitting || isReadOnly}>
                      {submitting ? dictionary.trunks.buttons.creating : dictionary.trunks.buttons.create}
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
          <CardTitle>{dictionary.trunks.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : trunks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.common.none}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.trunks.table.name}</TableHead>
                    <TableHead>{dictionary.trunks.table.username}</TableHead>
                    <TableHead>{dictionary.trunks.table.password}</TableHead>
                    <TableHead className="text-right">{dictionary.trunks.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trunks.map((trunk) => (
                    <TableRow key={trunk.id}>
                      <TableCell className="font-medium">{trunk.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {trunk.id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {visiblePasswords[trunk.id] ? trunk.password : '••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [trunk.id]: !prev[trunk.id],
                              }))
                            }
                            aria-label={
                              visiblePasswords[trunk.id]
                                ? dictionary.trunks.buttons.hidePassword
                                : dictionary.trunks.buttons.showPassword
                            }
                          >
                            {visiblePasswords[trunk.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(trunk)}
                            disabled={isReadOnly}
                            aria-label={dictionary.trunks.editTitle}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => confirmDelete(trunk)}
                            disabled={isReadOnly}
                            aria-label={dictionary.trunks.delete.confirm}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{dictionary.trunks.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.trunks.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.trunks.fields.name}</FormLabel>
                    <FormControl>
                      <Input placeholder="es. company-trunk" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updating || isReadOnly}>
                  {updating ? dictionary.trunks.buttons.updating : dictionary.trunks.buttons.update}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeleteTarget(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dictionary.trunks.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? dictionary.trunks.delete.description.replace('{name}', deleteTarget.name)
                : dictionary.trunks.delete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReadOnly || deleting}>
              {dictionary.common.buttons.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isReadOnly || deleting}>
              {deleting ? dictionary.trunks.delete.processing : dictionary.trunks.delete.confirm}
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
