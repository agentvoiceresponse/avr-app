import { AlertTriangle, CheckCircle2, RotateCcw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopFailure } from '@/lib/voiceops-cockpit/types';

interface CockpitBannerProps {
  isReadOnly: boolean;
  topFailure: TopFailure | null;
  failureTitle: string;
  failureGuidance: string;
  actionLabel: string | null;
  actionStatus: 'idle' | 'pending' | 'success' | 'error';
  actionMessage: string | null;
  readOnlyLabel: string;
  alertTitle: string;
  healthyTitle: string;
  noFailuresLabel: string;
  healthyGuidance: string;
  onAction: () => void;
}

export function CockpitBanner(props: CockpitBannerProps) {
  const hasFailure = Boolean(props.topFailure);
  return (
    <Card className={`border ${hasFailure ? 'border-amber-500/40' : 'border-emerald-500/40'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {hasFailure ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          {hasFailure ? props.alertTitle : props.healthyTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{hasFailure ? props.failureTitle : props.noFailuresLabel}</p>
        <p className="text-sm text-muted-foreground">{hasFailure ? props.failureGuidance : props.healthyGuidance}</p>
        <div className="flex flex-wrap items-center gap-3">
          {props.isReadOnly ? (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              {props.readOnlyLabel}
            </div>
          ) : hasFailure && props.actionLabel ? (
            <Button onClick={props.onAction} disabled={props.actionStatus === 'pending'}>
              <RotateCcw className="mr-2 h-4 w-4" /> {props.actionLabel}
            </Button>
          ) : null}
          {props.actionStatus !== 'idle' && props.actionMessage ? (
            <p className={`text-sm ${props.actionStatus === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
              {props.actionMessage}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
