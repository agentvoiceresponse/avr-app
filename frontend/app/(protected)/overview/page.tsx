'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, RefreshCcw } from 'lucide-react';
import { ApiError, apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CockpitBanner } from '@/components/voiceops/cockpit-banner';
import { fetchCockpitSnapshot } from '@/lib/voiceops-cockpit/transport';
import { getExitedContainers, getFailingComponentsCount, getStoppedAgents, getTopFailure } from '@/lib/voiceops-cockpit/view-model';
import type { AgentDto, CallSummaryDto, CallSummaryResponse, DockerContainerDto, TrunkDto } from '@/lib/voiceops-cockpit/types';

type CockpitActionStatus = 'idle' | 'pending' | 'success' | 'error';

const timeRangeOptions = ['1', '3', '6', '12'] as const;
type TimeRange = (typeof timeRangeOptions)[number];

export default function DashboardPage() {
  const { dictionary } = useI18n();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'viewer';

  const [runningAgents, setRunningAgents] = useState(0);
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [trunks, setTrunks] = useState<TrunkDto[]>([]);
  const [containers, setContainers] = useState<DockerContainerDto[]>([]);
  const [calls, setCalls] = useState<CallSummaryDto[]>([]);
  const [callErrorCount, setCallErrorCount] = useState(0);
  const [summary, setSummary] = useState<CallSummaryResponse>({
    totalCalls: 0,
    averageDurationSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('1');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const [actionStatus, setActionStatus] = useState<CockpitActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await fetchCockpitSnapshot(range, agentFilter);
      setAgents(snapshot.agents);
      setRunningAgents(snapshot.agents.filter((agent) => agent.status === 'running').length);
      setSummary(snapshot.summary);
      setCalls(snapshot.calls);
      setTrunks(snapshot.trunks);
      setContainers(snapshot.containers);
      setCallErrorCount(snapshot.callErrorCount);
    } catch (err) {
      console.error(err);
      setError(dictionary.dashboard.errors.load);
    } finally {
      setLoading(false);
    }
  }, [agentFilter, dictionary.dashboard.errors.load, range]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const stoppedAgents = useMemo(() => getStoppedAgents(agents), [agents]);
  const exitedContainers = useMemo(() => getExitedContainers(containers), [containers]);

  const topFailure = useMemo(
    () =>
      getTopFailure({
        stoppedAgentsCount: stoppedAgents.length,
        exitedContainersCount: exitedContainers.length,
        callErrorCount,
        trunksCount: trunks.length,
      }),
    [callErrorCount, exitedContainers.length, stoppedAgents.length, trunks.length],
  );

  const failureTitle = useMemo(() => {
    if (!topFailure) {
      return dictionary.dashboard.cockpit.noFailures;
    }
    switch (topFailure.key) {
      case 'agents':
        return dictionary.dashboard.cockpit.topFailures.agents(topFailure.count);
      case 'containers':
        return dictionary.dashboard.cockpit.topFailures.containers(topFailure.count);
      case 'calls':
        return dictionary.dashboard.cockpit.topFailures.calls(topFailure.count);
      case 'trunks':
        return dictionary.dashboard.cockpit.topFailures.noTrunks;
      default:
        return dictionary.dashboard.cockpit.noFailures;
    }
  }, [dictionary.dashboard.cockpit, topFailure]);

  const failureGuidance = useMemo(() => {
    if (!topFailure) {
      return dictionary.dashboard.cockpit.healthyGuidance;
    }
    switch (topFailure.key) {
      case 'agents':
        return dictionary.dashboard.cockpit.guidance.restartAgent;
      case 'containers':
        return dictionary.dashboard.cockpit.guidance.retryContainer;
      case 'calls':
        return dictionary.dashboard.cockpit.guidance.inspectCallErrors;
      case 'trunks':
        return dictionary.dashboard.cockpit.guidance.configureTrunk;
      default:
        return dictionary.dashboard.cockpit.healthyGuidance;
    }
  }, [dictionary.dashboard.cockpit, topFailure]);

  const actionLabel = useMemo(() => {
    if (!topFailure) {
      return null;
    }
    if (topFailure.key === 'agents') {
      return dictionary.dashboard.cockpit.actions.restart;
    }
    if (topFailure.key === 'containers') {
      return dictionary.dashboard.cockpit.actions.retry;
    }
    return dictionary.dashboard.cockpit.actions.refresh;
  }, [dictionary.dashboard.cockpit.actions, topFailure]);

  const runTopFailureAction = useCallback(async () => {
    if (!topFailure) {
      return;
    }
    setActionStatus('pending');
    setActionMessage(null);
    try {
      if (topFailure.key === 'agents' && stoppedAgents[0]) {
        await apiFetch(`/agents/${stoppedAgents[0].id}/run`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
      } else if (topFailure.key === 'containers' && exitedContainers[0]) {
        await apiFetch(`/docker/containers/${exitedContainers[0].id}/pull`, {
          method: 'POST',
        });
      }
      await fetchData();
      setActionStatus('success');
      setActionMessage(dictionary.dashboard.cockpit.actionState.success);
    } catch (err) {
      setActionStatus('error');
      setActionMessage(
        err instanceof ApiError ? err.message : dictionary.dashboard.cockpit.actionState.error,
      );
    }
  }, [dictionary.dashboard.cockpit.actionState.error, dictionary.dashboard.cockpit.actionState.success, exitedContainers, fetchData, stoppedAgents, topFailure]);

  const stats = useMemo(
    () => [
      {
        title: dictionary.dashboard.stats.totalCalls,
        value: summary.totalCalls,
      },
      {
        title: dictionary.dashboard.stats.avgDuration,
        value: formatDurationFromSeconds(summary.averageDurationSeconds),
      },
      {
        title: dictionary.dashboard.stats.runningAgents,
        value: runningAgents,
      },
      {
        title: dictionary.dashboard.cockpit.metrics.failingComponents,
        value: getFailingComponentsCount({
          stoppedAgentsCount: stoppedAgents.length,
          exitedContainersCount: exitedContainers.length,
          callErrorCount,
        }),
      },
    ],
    [callErrorCount, dictionary.dashboard.cockpit.metrics.failingComponents, dictionary.dashboard.stats, exitedContainers.length, runningAgents, stoppedAgents.length, summary.averageDurationSeconds, summary.totalCalls],
  );

  const agentOptions = useMemo(() => {
    const set = new Map<string, string>();
    agents.forEach((agent) => set.set(agent.id, agent.name));
    calls.forEach((call) => {
      if (call.agentId && !set.has(call.agentId)) {
        set.set(call.agentId, call.agentId);
      }
    });
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [agents, calls]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    calls.forEach((call) => {
      const dateStr = call.startedAt ?? call.endedAt;
      if (!dateStr) {
        return;
      }
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [calls]);

  const maxChartValue = useMemo(() => {
    return chartData.reduce((max, item) => Math.max(max, item.value), 0);
  }, [chartData]);

  const recentCalls = useMemo(() => calls.slice(0, 5), [calls]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.dashboard.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <Select value={range} onValueChange={(value) => setRange(value as TimeRange)}>
              <SelectTrigger>
                <SelectValue placeholder={dictionary.dashboard.filters.timeRange} />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {dictionary.dashboard.filters.ranges[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder={dictionary.dashboard.filters.agent} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dictionary.dashboard.filters.allAgents}</SelectItem>
                {agentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" /> {dictionary.dashboard.filters.refresh}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <CockpitBanner
        isReadOnly={isReadOnly}
        topFailure={topFailure}
        failureTitle={failureTitle}
        failureGuidance={failureGuidance}
        actionLabel={actionLabel}
        actionStatus={actionStatus}
        actionMessage={actionMessage}
        readOnlyLabel={dictionary.dashboard.cockpit.readOnly}
        alertTitle={dictionary.dashboard.cockpit.alertTitle}
        healthyTitle={dictionary.dashboard.cockpit.healthyTitle}
        noFailuresLabel={dictionary.dashboard.cockpit.noFailures}
        healthyGuidance={dictionary.dashboard.cockpit.healthyGuidance}
        onAction={runTopFailureAction}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-10 w-32 rounded" />
              ) : (
                <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-border/60 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{dictionary.dashboard.charts.callsPerMonth}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {dictionary.dashboard.filters.ranges[range]}
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full rounded" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dictionary.dashboard.charts.empty}
              </p>
            ) : (
              <div className="flex h-48 items-end gap-2">
                {chartData.map((item) => {
                  const height = maxChartValue > 0 ? (item.value / maxChartValue) * 100 : 0;
                  return (
                    <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <div className="text-xs font-medium text-muted-foreground">{item.value}</div>
                      <div
                        className="w-6 rounded-t-md bg-primary/70"
                        style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '2px' }}
                      />
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-4">
          <CardHeader>
            <CardTitle>{dictionary.calls.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <DetailSkeleton />
            ) : recentCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dictionary.calls.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.calls.table.uuid}</TableHead>
                    <TableHead>{dictionary.calls.table.startedAt}</TableHead>
                    <TableHead>{dictionary.calls.table.duration}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                        {call.uuid}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(call.startedAt)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDurationFromRange(call.startedAt, call.endedAt, dictionary.calls.durationUnknown)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function formatDurationFromSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatDurationFromRange(
  start: string | null,
  end: string | null,
  fallback: string,
): string {
  if (!start || !end) {
    return fallback;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return fallback;
  }
  const seconds = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
}

function DetailSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Skeleton key={idx} className="h-4 w-full" />
      ))}
    </div>
  );
}
