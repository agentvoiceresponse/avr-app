'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Shield, Pencil, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type PaginatedResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
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

interface UserDto {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'viewer';
}

const createUserSchema = (dict: ReturnType<typeof useI18n>['dictionary']) =>
  z.object({
    username: z
      .string()
      .min(3, dict.users.validation.usernameMin)
      .max(32, dict.users.validation.usernameMax),
    password: z
      .string()
      .min(6, dict.users.validation.passwordMin)
      .max(64, dict.users.validation.passwordMax),
    role: z.enum(['admin', 'manager', 'viewer']),
  });

const updateUserSchema = (dict: ReturnType<typeof useI18n>['dictionary']) =>
  z.object({
    username: z
      .string()
      .min(3, dict.users.validation.usernameMin)
      .max(32, dict.users.validation.usernameMax),
    password: z.union([
      z
        .string()
        .min(6, dict.users.validation.passwordMin)
        .max(64, dict.users.validation.passwordMax),
      z.literal(''),
    ]),
    role: z.enum(['admin', 'manager', 'viewer']),
  });

export default function UsersPage() {
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
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
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const createSchema = useMemo(() => createUserSchema(dictionary), [dictionary]);
  const updateSchema = useMemo(() => updateUserSchema(dictionary), [dictionary]);

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'viewer',
    },
  });

  const editForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'viewer',
    },
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<PaginatedResponse<UserDto>>('/users', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setUsers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        hasNextPage: response.hasNextPage,
        hasPreviousPage: response.hasPreviousPage,
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.users.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.users.errors.load, pagination.limit, pagination.page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onSubmit = async (values: z.infer<typeof createUserSchema>) => {
    setSubmitting(true);
    try {
      await apiFetch<UserDto>('/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setDialogOpen(false);
      form.reset();
      await loadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        form.setError('username', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.users.errors.create);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (target: UserDto) => {
    setError(null);
    setEditingUser(target);
    editForm.reset({
      username: target.username,
      password: '',
      role: target.role,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (values: z.infer<typeof updateSchema>) => {
    if (!editingUser) {
      return;
    }

    setUpdating(true);
    try {
      const payload: Record<string, string> = {
        username: values.username.trim(),
        role: values.role,
      };

      const trimmedPassword = values.password.trim();
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      await apiFetch<UserDto>(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset({ username: '', password: '', role: 'viewer' });
      await loadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        editForm.setError('username', { message: err.message });
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.users.errors.update);
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
      await apiFetch(`/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await loadUsers();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
      setError(dictionary.users.errors.delete);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.users.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.users.subtitle}</p>
        </div>
        {isAdmin ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> {dictionary.users.new}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{dictionary.users.createTitle}</DialogTitle>
                <DialogDescription>{dictionary.users.createDescription}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.users.fields.username}</FormLabel>
                        <FormControl>
                          <Input placeholder={dictionary.users.placeholders.username} {...field} />
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
                        <FormLabel>{dictionary.users.fields.password}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={dictionary.users.placeholders.password} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary.users.fields.role}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={dictionary.users.placeholders.role} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? dictionary.users.buttons.creating
                        : dictionary.users.buttons.create}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" /> {dictionary.users.notices.adminOnly}
          </div>
        )}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.users.tableTitle}</CardTitle>
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
                    <TableHead>{dictionary.users.table.id}</TableHead>
                    <TableHead>{dictionary.users.table.username}</TableHead>
                    <TableHead>{dictionary.users.table.role}</TableHead>
                    {isAdmin ? (
                      <TableHead className="text-right">{dictionary.users.table.actions}</TableHead>
                    ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-medium">{item.username}</TableCell>
                    <TableCell className="capitalize">
                      {dictionary.users.roles[item.role]}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                setError(null);
                setDeleteTarget(item);
                setDeleteDialogOpen(true);
              }}
              disabled={user?.id === item.id}
            >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
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
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
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
            setEditingUser(null);
            editForm.reset({ username: '', password: '', role: 'viewer' });
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{dictionary.users.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.users.editDescription}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.users.fields.username}</FormLabel>
                    <FormControl>
                      <Input placeholder={dictionary.users.placeholders.username} {...field} />
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
                    <FormLabel>{dictionary.users.fields.password}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={dictionary.users.placeholders.passwordEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary.users.fields.role}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={dictionary.users.placeholders.role} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updating}>
                  {updating
                    ? dictionary.users.buttons.updating
                    : dictionary.users.buttons.update}
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
            <AlertDialogTitle>{dictionary.users.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dictionary.users.delete.description.replace(
                '{name}',
                deleteTarget ? ` ${deleteTarget.username}` : '',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{dictionary.common.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? dictionary.users.delete.processing : dictionary.users.delete.confirm}
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
      {Array.from({ length: 5 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}
