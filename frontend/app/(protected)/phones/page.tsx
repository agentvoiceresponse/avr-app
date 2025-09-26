'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2, Shield, Pencil } from 'lucide-react';
import { apiFetch, ApiError, getApiUrl, type PaginatedResponse } from '@/lib/api';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

interface PhoneClient {
  id: string;
  fullName: string | null;
  password?: string;
}

const fullNameSchema = z.string().min(2, 'Minimo 2 caratteri').max(64, 'Massimo 64 caratteri');

const passwordSchema = z.string().min(6, 'Minimo 6 caratteri').max(64, 'Massimo 64 caratteri');

const phoneSchema = z.object({
  fullName: fullNameSchema,
  password: passwordSchema,
});

const updatePhoneSchema = z.object({
  fullName: fullNameSchema,
  password: z.union([passwordSchema, z.literal('')]),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type UpdatePhoneFormValues = z.infer<typeof updatePhoneSchema>;

function PhonesSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function PhonesPage() {
  const [phones, setPhones] = useState<PhoneClient[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<PhoneClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneClient | null>(null);
  const [updating, setUpdating] = useState(false);
  const [domain, setDomain] = useState('');
  const { dictionary } = useI18n();
  const { user } = useAuth();

  const isReadOnly = user?.role === 'viewer';

  const websocketServer = useMemo(() => (domain ? `wss://${domain}:8089/ws` : ''), [domain]);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      fullName: '',
      password: '',
    },
  });

  const editForm = useForm<UpdatePhoneFormValues>({
    resolver: zodResolver(updatePhoneSchema),
    defaultValues: {
      fullName: '',
      password: '',
    },
  });

  const loadPhones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<PhoneClient>>('/phones', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setPhones(data.data);
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
        setError(dictionary.phones.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.phones.errors.load, pagination.limit, pagination.page]);

  useEffect(() => {
    loadPhones();
  }, [loadPhones]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.hostname);
      return;
    }
    try {
      const url = new URL(getApiUrl());
      setDomain(url.hostname);
    } catch {
      setDomain('');
    }
  }, []);

  const openEditDialog = (phone: PhoneClient) => {
    setError(null);
    setEditingPhone(phone);
    editForm.reset({ fullName: phone.fullName ?? '', password: '' });
    setEditDialogOpen(true);
  };

  const onSubmit = async (values: PhoneFormValues) => {
    setSubmitting(true);
    try {
      await apiFetch<PhoneClient>('/phones', {
        method: 'POST',
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          password: values.password,
        }),
      });
      setDialogOpen(false);
      form.reset({ fullName: '', password: '' });
      await loadPhones();
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('fullName', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.phones.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: UpdatePhoneFormValues) => {
    if (!editingPhone) {
      return;
    }

    setUpdating(true);
    try {
      const payload: Record<string, string> = {
        fullName: values.fullName.trim(),
      };

      const trimmedPassword = values.password.trim();
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      await apiFetch<PhoneClient>(`/phones/${editingPhone.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditDialogOpen(false);
      setEditingPhone(null);
      editForm.reset({ fullName: '', password: '' });
      await loadPhones();
    } catch (err) {
      if (err instanceof ApiError) {
        editForm.setError('fullName', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.phones.errors.update);
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
      await apiFetch(`/phones/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadPhones();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.phones.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.phones.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.phones.subtitle}</p>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            {dictionary.phones.notices.readOnly}
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {dictionary.phones.new}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{dictionary.phones.createTitle}</DialogTitle>
                <DialogDescription>{dictionary.phones.createDescription}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.phones.fields.fullName}</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Mario Rossi" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.phones.fields.password}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="********" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? dictionary.phones.buttons.creating
                        : dictionary.phones.buttons.create}
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
          <CardTitle>{dictionary.phones.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PhonesSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : phones.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.common.none}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>{dictionary.phones.table.fullName}</TableHead>
                      <TableHead>{dictionary.phones.table.domain}</TableHead>
                      <TableHead>{dictionary.phones.table.username}</TableHead>
                      <TableHead>{dictionary.phones.table.websocket}</TableHead>
                      {isReadOnly ? null : (
                        <TableHead className="text-right">{dictionary.phones.table.actions}</TableHead>
                      )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {phones.map((phone) => (
                    <TableRow key={phone.id}>
                      <TableCell className="font-medium">
                        {phone.fullName?.length ? phone.fullName : dictionary.common.none}
                      </TableCell>
                      <TableCell>{domain || dictionary.common.none}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{phone.id}</code>
                      </TableCell>
                      <TableCell>
                        {websocketServer ? (
                          <code className="rounded bg-muted px-2 py-1 text-xs">{websocketServer}</code>
                        ) : (
                          dictionary.common.none
                        )}
                      </TableCell>
                      {isReadOnly ? null : (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(phone)}
                              disabled={updating && editingPhone?.id === phone.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                setError(null);
                                setDeleteTarget(phone);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleting && deleteTarget?.id === phone.id}
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
            setEditingPhone(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{dictionary.phones.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.phones.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.phones.fields.fullName}</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Mario Rossi" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.phones.fields.password}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>{dictionary.phones.notices.passwordHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? dictionary.phones.buttons.updating : dictionary.phones.buttons.update}
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
            <AlertDialogTitle>{dictionary.phones.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? dictionary.phones.delete.description.replace(
                    '{name}',
                    deleteTarget.fullName && deleteTarget.fullName.length
                      ? deleteTarget.fullName
                      : deleteTarget.id,
                  )
                : dictionary.phones.delete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{dictionary.common.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? dictionary.phones.delete.processing : dictionary.phones.delete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
