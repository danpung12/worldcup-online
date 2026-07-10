import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('worldcup-api');

export async function traceSpan(name: string, work: () => Promise<any>) {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await work();
    } finally {
      span.end();
    }
  });
}
