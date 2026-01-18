'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Download, Eye, Play, RefreshCcw } from 'lucide-react';
import { apiFetch, ApiError, getApiUrl, getStoredToken, type PaginatedResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
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
  type:
    | 'call_initiated'
    | 'call_started'
    | 'call_ended'
    | 'interruption'
    | 'transcription'
    | 'dtmf_digit';
  timestamp: string;
  payload?: Record<string, unknown> | null;
}

interface CallDetailDto extends CallSummaryDto {
  events: CallEventDto[];
}

interface CallInitiatedPayload {
  from?: string;
  to?: string;
  uniqueid?: string;
  channel?: string;
  recording?: boolean;
}

export default function CallsPage() {
  const { dictionary } = useI18n();
  const [calls, setCalls] = useState<CallSummaryDto[]>([]);
  const [callInitiatedMap, setCallInitiatedMap] = useState<
    Record<string, CallInitiatedPayload | null>
  >({});
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
  const [audioMap, setAudioMap] = useState<Record<string, string>>({});
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    uuid: '',
    startedFrom: '',
    startedTo: '',
  });
  const [sort, setSort] = useState<{ field: 'startedAt' | 'endedAt'; direction: 'asc' | 'desc' }>({
    field: 'startedAt',
    direction: 'desc',
  });
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const extractInitiatedPayload = useCallback((events: CallEventDto[]) => {
    const initiated = events.find((event) => event.type === 'call_initiated');
    if (!initiated?.payload || typeof initiated.payload !== 'object') {
      return null;
    }
    const payload = initiated.payload as Record<string, unknown>;
    const normalized: CallInitiatedPayload = {};
    if (payload.from) {
      normalized.from = String(payload.from);
    }
    if (payload.to) {
      normalized.to = String(payload.to);
    }
    if (payload.uniqueid) {
      normalized.uniqueid = String(payload.uniqueid);
    }
    if (payload.channel) {
      normalized.channel = String(payload.channel);
    }
    if (payload.recording !== undefined) {
      normalized.recording =
        typeof payload.recording === 'boolean'
          ? payload.recording
          : String(payload.recording).toLowerCase() === 'true';
    }
    return Object.keys(normalized).length > 0 ? normalized : null;
  }, []);

  const loadCalls = useCallback(async (overrideFilters?: typeof filters) => {
    setLoading(true);
    try {
      const activeFilters = overrideFilters ?? filtersRef.current;
      const data = await apiFetch<PaginatedResponse<CallSummaryDto>>('/webhooks/calls', {
        query: {
          page: pagination.page,
          limit: pagination.limit,
          uuid: activeFilters.uuid || undefined,
          startedFrom: activeFilters.startedFrom || undefined,
          startedTo: activeFilters.startedTo || undefined,
          sortField: sort.field,
          sortDirection: sort.direction,
        },
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
  }, [dictionary.calls.errors.loadCalls, pagination.limit, pagination.page, sort]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    if (calls.length === 0) {
      return;
    }
    const pendingIds = calls
      .map((call) => call.id)
      .filter((id) => !(id in callInitiatedMap));
    if (pendingIds.length === 0) {
      return;
    }
    let active = true;
    const loadInitiated = async () => {
      const results = await Promise.allSettled(
        pendingIds.map(async (id) => {
          const detail = await apiFetch<CallDetailDto>(`/webhooks/calls/${id}`);
          return { id, payload: extractInitiatedPayload(detail.events ?? []) };
        }),
      );
      if (!active) {
        return;
      }
      setCallInitiatedMap((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            next[result.value.id] = result.value.payload;
          }
        });
        return next;
      });
    };
    loadInitiated();
    return () => {
      active = false;
    };
  }, [calls, callInitiatedMap, extractInitiatedPayload]);

  const openDetails = async (callId: string) => {
    setDetailDialogOpen(true);
    setDetailLoading(true);
    try {
      const data = await apiFetch<CallDetailDto>(`/webhooks/calls/${callId}`);
      const next = {
        ...data,
        events: [...(data.events ?? [])].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
      };
      setSelectedCall(next);
      setCallInitiatedMap((prev) => ({
        ...prev,
        [callId]: extractInitiatedPayload(next.events ?? []),
      }));
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
  const selectedInitiatedPayload = useMemo(
    () => (selectedCall ? extractInitiatedPayload(selectedCall.events ?? []) : null),
    [extractInitiatedPayload, selectedCall],
  );
  const toggleSort = useCallback((field: 'startedAt' | 'endedAt') => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'desc' };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);
  const recordingAvailableById = useMemo(() => {
    const map: Record<string, boolean> = {};
    calls.forEach((call) => {
      map[call.id] = Boolean(callInitiatedMap[call.id]?.recording);
    });
    return map;
  }, [callInitiatedMap, calls]);

  const handleDownload = useCallback(
    async (call: CallSummaryDto) => {
      setDownloadingId(call.id);
      try {
        const token = getStoredToken();
        if (!token) {
          throw new ApiError(dictionary.calls.errors.authRequired, 401);
        }
        const response = await fetch(`${getApiUrl()}/recordings/${call.uuid}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new ApiError(await response.text(), response.status);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${call.uuid}.wav`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(dictionary.calls.errors.download);
        }
      } finally {
        setDownloadingId(null);
      }
    },
    [dictionary.calls.errors.authRequired, dictionary.calls.errors.download],
  );

  const handlePlay = useCallback(
    async (call: CallSummaryDto) => {
      if (audioMap[call.id]) {
        return;
      }
      setLoadingAudioId(call.id);
      try {
        const token = getStoredToken();
        if (!token) {
          throw new ApiError(dictionary.calls.errors.authRequired, 401);
        }
        const response = await fetch(`${getApiUrl()}/recordings/${call.uuid}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new ApiError(await response.text(), response.status);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioMap((prev) => ({ ...prev, [call.id]: url }));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(dictionary.calls.errors.play);
        }
      } finally {
        setLoadingAudioId(null);
      }
    },
    [audioMap, dictionary.calls.errors.authRequired, dictionary.calls.errors.play],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.calls.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.calls.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadCalls()}
          disabled={loading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> {dictionary.calls.buttons.refresh}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{dictionary.calls.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder={dictionary.calls.filters.uuid}
              value={filters.uuid}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, uuid: event.target.value }))
              }
            />
            <Input
              type="date"
              value={filters.startedFrom}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, startedFrom: event.target.value }))
              }
            />
            <Input
              type="date"
              value={filters.startedTo}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, startedTo: event.target.value }))
              }
            />
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                loadCalls();
              }}
              disabled={loading}
            >
              {dictionary.calls.filters.apply}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const cleared = {
                  uuid: '',
                  startedFrom: '',
                  startedTo: '',
                };
                setFilters(cleared);
                setPagination((prev) => ({ ...prev, page: 1 }));
                loadCalls(cleared);
              }}
              disabled={loading}
            >
              {dictionary.calls.filters.clear}
            </Button>
          </div>
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
                    <TableHead>{dictionary.calls.table.from}</TableHead>
                    <TableHead>{dictionary.calls.table.to}</TableHead>
                    <TableHead>{dictionary.calls.table.recording}</TableHead>
                    <TableHead>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSort('startedAt')}
                        className="h-7 px-2"
                      >
                        {dictionary.calls.table.startedAt}
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSort('endedAt')}
                        className="h-7 px-2"
                      >
                        {dictionary.calls.table.endedAt}
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>{dictionary.calls.table.duration}</TableHead>
                    <TableHead>{dictionary.calls.table.status}</TableHead>
                    <TableHead className="text-right">{dictionary.calls.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell
                        className="max-w-[140px] truncate font-mono text-xs text-muted-foreground"
                        title={call.uuid}
                      >
                        {call.uuid}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span
                          className="block max-w-[120px] truncate"
                          title={callInitiatedMap[call.id]?.from ?? '—'}
                        >
                          {callInitiatedMap[call.id]?.from ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span
                          className="block max-w-[120px] truncate"
                          title={callInitiatedMap[call.id]?.to ?? '—'}
                        >
                          {callInitiatedMap[call.id]?.to ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {recordingAvailableById[call.id] ? (
                          audioMap[call.id] ? (
                            <audio controls src={audioMap[call.id]} className="h-8 w-full" />
                          ) : (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handlePlay(call)}
                              disabled={loadingAudioId === call.id}
                              aria-label={dictionary.calls.buttons.listen}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(call.startedAt)}</TableCell>
                      <TableCell>{formatDateTime(call.endedAt)}</TableCell>
                      <TableCell>{formatDuration(call.startedAt, call.endedAt)}</TableCell>
                      <TableCell>
                        {isCompleted(call)
                          ? dictionary.calls.events.call_ended
                          : dictionary.calls.events.call_started}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDetails(call.id)}
                            aria-label={dictionary.calls.buttons.view}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {recordingAvailableById[call.id] ? (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(call)}
                              disabled={downloadingId === call.id}
                              aria-label={dictionary.calls.buttons.download}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : null}
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
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.from}:
                  </span>{' '}
                  {selectedInitiatedPayload?.from ?? dictionary.common.none}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.to}:
                  </span>{' '}
                  {selectedInitiatedPayload?.to ?? dictionary.common.none}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.uniqueid}:
                  </span>{' '}
                  {selectedInitiatedPayload?.uniqueid ?? dictionary.common.none}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {dictionary.calls.table.channel}:
                  </span>{' '}
                  {selectedInitiatedPayload?.channel ?? dictionary.common.none}
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
    if (event.type === 'call_initiated') {
      const payload = event.payload as Record<string, unknown>;
      const recordingValue =
        payload.recording === undefined
          ? undefined
          : typeof payload.recording === 'boolean'
            ? payload.recording
            : String(payload.recording).toLowerCase() === 'true';
      return (
        <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">
              {dictionary.calls.table.from}:
            </span>{' '}
            <span className="font-mono">{String(payload.from ?? '')}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {dictionary.calls.table.to}:
            </span>{' '}
            <span className="font-mono">{String(payload.to ?? '')}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {dictionary.calls.table.uniqueid}:
            </span>{' '}
            <span className="font-mono">{String(payload.uniqueid ?? '')}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {dictionary.calls.table.channel}:
            </span>{' '}
            <span className="font-mono">{String(payload.channel ?? '')}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {dictionary.calls.table.recording}:
            </span>{' '}
            <span className="font-mono">
              {recordingValue === undefined
                ? '—'
                : recordingValue
                  ? dictionary.common.enabled
                  : dictionary.common.disabled}
            </span>
          </div>
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
