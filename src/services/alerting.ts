import { db } from '../db.js';

export interface AlertCheckResult {
  ruleId: string;
  ruleName: string;
  metric: string;
  threshold: number;
  actualValue: number;
  triggered: boolean;
  message: string;
}

export async function checkAlerts(): Promise<AlertCheckResult[]> {
  const rules = await db.alertRule.findMany({ where: { enabled: true } });
  const results: AlertCheckResult[] = [];

  for (const rule of rules) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - rule.windowMin * 60 * 1000);

    const where: any = { timestamp: { gte: windowStart } };
    if (rule.projectId) {
      where.projectId = rule.projectId;
    }

    const metrics = await db.apiMetrics.findMany({ where });

    if (metrics.length === 0) continue;

    let actualValue = 0;
    let triggered = false;
    let message = '';

    switch (rule.metric) {
      case 'error_rate': {
        const errors = metrics.filter(m => m.statusCode >= 400).length;
        actualValue = (errors / metrics.length) * 100;
        triggered = actualValue > rule.threshold;
        message = `Error rate: ${actualValue.toFixed(1)}% (threshold: ${rule.threshold}%)`;
        break;
      }
      case 'response_time': {
        const avg = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
        actualValue = avg;
        triggered = actualValue > rule.threshold;
        message = `Avg response time: ${actualValue.toFixed(0)}ms (threshold: ${rule.threshold}ms)`;
        break;
      }
      case 'quota': {
        actualValue = metrics.length;
        triggered = actualValue > rule.threshold;
        message = `API calls: ${actualValue} (threshold: ${rule.threshold})`;
        break;
      }
    }

    if (triggered) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
        actualValue,
        triggered: true,
        message,
      });

      await sendNotification(rule, message, actualValue);

      await db.alertEvent.create({
        data: {
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          threshold: rule.threshold,
          actualValue,
          message,
        },
      }).catch(err => console.error('Alert event create error:', err));
    }
  }

  return results;
}

async function sendNotification(rule: any, message: string, actualValue: number) {
  if (rule.notifyWebhook) {
    try {
      await fetch(rule.notifyWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: rule.name,
          metric: rule.metric,
          threshold: rule.threshold,
          actualValue,
          message,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Webhook notification error:', err);
    }
  }

  if (rule.notifyEmail) {
    console.log(`[ALERT EMAIL] To: ${rule.notifyEmail}, ${message}`);
  }
}
