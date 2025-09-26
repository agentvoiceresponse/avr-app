'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Play, Square, FileText } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DockerContainerDto {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  labels: Record<string, string>;
}

export default function DockersPage() {
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const [containers, setContainers] = useState<DockerContainerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMap, setActionMap] = useState<Record<string, boolean>>({});
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logsTarget, setLogsTarget] = useState<DockerContainerDto | null>(null);
  const [logsContent, setLogsContent] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const isViewer = user?.role === 'viewer';

  const loadContainers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DockerContainerDto[]>('/docker/containers');
      setContainers(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.dockers.errors.load);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.dockers.errors.load]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const handleStart = async (container: DockerContainerDto) => {
    setActionMap((prev) => ({ ...prev, [container.id]: true }));
    try {
      await apiFetch(`/docker/containers/${container.id}/start`, { method: 'POST' });
      await loadContainers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : dictionary.dockers.errors.start);
    } finally {
      setActionMap((prev) => ({ ...prev, [container.id]: false }));
    }
  };

  const handleStop = async (container: DockerContainerDto) => {
    setActionMap((prev) => ({ ...prev, [container.id]: true }));
    try {
      await apiFetch(`/docker/containers/${container.id}/stop`, { method: 'POST' });
      await loadContainers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : dictionary.dockers.errors.stop);
    } finally {
      setActionMap((prev) => ({ ...prev, [container.id]: false }));
    }
  };

  const openLogsDialog = async (container: DockerContainerDto) => {
    setLogsTarget(container);
    setLogsDialogOpen(true);
    setLogsLoading(true);
    try {
      const data = await apiFetch<{ logs: string }>(
        `/docker/containers/${container.id}/logs?tail=300`,
      );
      setLogsContent(data.logs);
    } catch (err) {
      setLogsContent('');
      setError(err instanceof ApiError ? err.message : dictionary.dockers.errors.logs);
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogsDialog = (open: boolean) => {
    setLogsDialogOpen(open);
    if (!open) {
      setLogsTarget(null);
      setLogsContent('');
    }
  };

  const statusVariant = useMemo(
    () => ({
      running: 'bg-emerald-500/10 text-emerald-600',
      exited: 'bg-rose-500/10 text-rose-600',
      paused: 'bg-amber-500/10 text-amber-700',
      created: 'bg-blue-500/10 text-blue-600',
    }),
    [],
  );

  const formatCreated = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.dockers.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.dockers.subtitle}</p>
        </div>
        <Button variant="outline" onClick={loadContainers} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" /> {dictionary.dockers.refresh}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.dockers.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : containers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.dockers.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.dockers.table.name}</TableHead>
                    <TableHead>{dictionary.dockers.table.image}</TableHead>
                    <TableHead>{dictionary.dockers.table.state}</TableHead>
                    <TableHead>{dictionary.dockers.table.status}</TableHead>
                    <TableHead>{dictionary.dockers.table.created}</TableHead>
                    <TableHead className="text-right">{dictionary.dockers.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((container) => {
                    const badgeClass = statusVariant[container.state as keyof typeof statusVariant] ??
                      'bg-muted text-foreground';
                    return (
                      <TableRow key={container.id}>
                        <TableCell className="font-medium">{container.name}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{container.image}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={badgeClass}>
                            {dictionary.dockers.status[container.state as keyof typeof dictionary.dockers.status] ??
                              container.state}
                          </Badge>
                        </TableCell>
                        <TableCell>{container.status}</TableCell>
                        <TableCell>{formatCreated(container.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openLogsDialog(container)}
                              aria-label={dictionary.dockers.buttons.logs}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleStart(container)}
                              disabled={isViewer || actionMap[container.id] || container.state === 'running'}
                              aria-label={dictionary.dockers.buttons.start}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleStop(container)}
                              disabled={isViewer || actionMap[container.id] || container.state !== 'running'}
                              aria-label={dictionary.dockers.buttons.stop}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={logsDialogOpen} onOpenChange={closeLogsDialog}>
        <DialogContent className="w-[1400px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{dictionary.dockers.logsTitle}</DialogTitle>
            <DialogDescription>{logsTarget?.name}</DialogDescription>
          </DialogHeader>
          {logsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <pre className="max-h-[65vh] overflow-auto rounded-md bg-muted p-4 text-xs font-mono whitespace-pre">
              {logsContent || dictionary.dockers.errors.logs}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}
