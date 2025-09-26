'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCcw } from 'lucide-react';
import { apiFetch, type PaginatedResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CallSummaryDto {
  id: string;
  uuid: string;
  agentId?: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

interface CallEventDto {
  id: string;
  type: 'call_started' | 'call_ended' | 'interruption' | 'transcription' | 'dtmf_digit';
  timestamp: string;
  payload?: Record<string, unknown> | null;
}

interface CallDetailDto extends CallSummaryDto {
  events: CallEventDto[];
}

export default function CallsPage() {
  const { dictionary } = useI18n();
  const [calls, setCalls] = useState<CallSummaryDto[]>([]);
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallDetailDto | null>(null);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<CallSummaryDto>>('/webhooks/calls', {
        query: { page: pagination.page, limit: pagination.limit },
        paginated: true,
      });
      setCalls(data.data);
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
        setError(dictionary.calls.errors.loadCalls);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.calls.errors.loadCalls, pagination.limit, pagination.page]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const openDetails = async (callId: string) => {
    setDetailDialogOpen(true);
    setDetailLoading(true);
    try {
      const data = await apiFetch<CallDetailDto>(`/webhooks/calls/${callId}`);
      setSelectedCall({
        ...data,
        events: [...(data.events ?? [])].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
      });
    } catch (err) {
      setSelectedCall(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.calls.errors.loadEvents);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailDialogOpen(false);
    setSelectedCall(null);
  };

  const formatDateTime = useCallback((value: string | null) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }, []);

  const formatDuration = useCallback(
    (start: string | null, end: string | null) => {
      if (!start || !end) {
        return dictionary.calls.durationUnknown;
      }
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return dictionary.calls.durationUnknown;
      }
      const totalSeconds = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    },
    [dictionary.calls.durationUnknown],
  );

  const isCompleted = (call: CallSummaryDto) => Boolean(call.startedAt) && Boolean(call.endedAt);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.calls.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.calls.subtitle}</p>
        </div>
        <Button variant="outline" onClick={loadCalls} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" /> {dictionary.calls.buttons.refresh}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.calls.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.calls.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.calls.table.uuid}</TableHead>
                    <TableHead>{dictionary.calls.table.startedAt}</TableHead>
                    <TableHead>{dictionary.calls.table.agentId}</TableHead>
                    <TableHead>{dictionary.calls.table.endedAt}</TableHead>
                    <TableHead>{dictionary.calls.table.duration}</TableHead>
                    <TableHead>{dictionary.calls.table.status}</TableHead>
                    <TableHead className="text-right">{dictionary.calls.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {call.uuid}
                      </TableCell>
                      <TableCell>{formatDateTime(call.startedAt)}</TableCell>
                      <TableCell>
                        {call.agentId ? (
                          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {call.agentId}
                          </code>
                        ) : (
                          dictionary.common.none
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(call.endedAt)}</TableCell>
                      <TableCell>{formatDuration(call.startedAt, call.endedAt)}</TableCell>
                      <TableCell>
                        {isCompleted(call)
                          ? dictionary.calls.events.call_ended
                          : dictionary.calls.events.call_started}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openDetails(call.id)}
                          aria-label={dictionary.calls.buttons.view}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={closeDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dictionary.calls.title}</DialogTitle>
            <DialogDescription>{selectedCall?.uuid}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <DetailSkeleton />
          ) : selectedCall ? (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.startedAt}:
                  </span>{' '}
                  {formatDateTime(selectedCall.startedAt)}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.endedAt}:
                  </span>{' '}
                  {formatDateTime(selectedCall.endedAt)}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.duration}:
                  </span>{' '}
                  {formatDuration(selectedCall.startedAt, selectedCall.endedAt)}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.agentId}:
                  </span>{' '}
                  {selectedCall.agentId ?? dictionary.common.none}
                </div>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-auto rounded-md border border-border/60 bg-muted/40 p-4">
                {selectedCall.events.map((event) => (
                  <EventRow key={event.id} event={event} dictionary={dictionary} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{dictionary.calls.errors.loadEvents}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDetails}>
              {dictionary.calls.buttons.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function DetailSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={idx} className="h-5 w-full" />
      ))}
    </div>
  );
}

interface EventRowProps {
  event: CallEventDto;
  dictionary: ReturnType<typeof useI18n>['dictionary'];
}

function EventRow({ event, dictionary }: EventRowProps) {
  const timestamp = useMemo(() => {
    const date = new Date(event.timestamp);
    return Number.isNaN(date.getTime())
      ? event.timestamp
      : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }, [event.timestamp]);

  const renderPayload = () => {
    if (!event.payload) {
      return null;
    }
    if (event.type === 'transcription') {
      const roleRaw = String(event.payload.role ?? 'user');
      const text = String(event.payload.text ?? '');
      const roleLabel =
        roleRaw === 'agent'
          ? dictionary.calls.transcript.agent
          : roleRaw === 'user'
            ? dictionary.calls.transcript.user
            : roleRaw;
      return (
        <div className="space-y-1">
          <div className="text-xs uppercase text-muted-foreground">{roleLabel}</div>
          <p className="rounded bg-background/60 p-3 text-sm">{text}</p>
        </div>
      );
    }
    if (event.type === 'dtmf_digit') {
      return (
        <div className="text-sm text-muted-foreground">
          Digit:{' '}
          <span className="font-mono">{String(event.payload.digit ?? '')}</span>
        </div>
      );
    }
    if (Object.keys(event.payload).length === 0) {
      return null;
    }
    return (
      <pre className="whitespace-pre-wrap rounded bg-background/60 p-2 text-xs text-muted-foreground">
        {JSON.stringify(event.payload, null, 2)}
      </pre>
    );
  };

  const label = dictionary.calls.events[event.type];

  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{timestamp}</span>
      </div>
      {renderPayload()}
    </div>
  );
}
