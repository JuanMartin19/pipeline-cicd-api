const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://18.218.203.69:5080/api/default';
const OTEL_AUTH = process.env.OTEL_EXPORTER_OTLP_HEADERS || 'Basic YWRtaW5AdXRlcS5lZHUubXg6T3Blbk9ic2VydmUxMjMq';

const headers = {
  Authorization: OTEL_AUTH,
};

const traceExporter = new OTLPTraceExporter({
  url: `${OTEL_ENDPOINT}/v1/traces`,
  headers,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
    headers,
  }),
  exportIntervalMillis: 10000,
});

const logExporter = new OTLPLogExporter({
  url: `${OTEL_ENDPOINT}/v1/logs`,
  headers,
});

const sdk = new NodeSDK({
  serviceName: 'gestion-proceso-desarrollo',
  traceExporter,
  metricReader,
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

if (process.env.NODE_ENV !== 'test') {
  try {
    sdk.start();
  } catch (err) {
    console.error('Advertencia al iniciar OpenTelemetry:', err.message);
  }
}

const otelLogger = logs.getLogger('gestion-proceso-desarrollo');

function emitOtelLog(body, attributes = {}, isError = false) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    otelLogger.emit({
      severityNumber: isError ? SeverityNumber.ERROR : SeverityNumber.INFO,
      severityText: isError ? 'ERROR' : 'INFO',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      attributes,
    });
  } catch (_) {
    // Evita interrumpir el flujo HTTP si el colector no responde
  }
}

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

module.exports = { sdk, emitOtelLog };