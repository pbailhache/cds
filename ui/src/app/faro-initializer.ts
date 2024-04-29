import {
  ConsoleInstrumentation,
  ConsoleTransport,
  ErrorsInstrumentation,
  FetchTransport,
  initializeFaro,
  ViewInstrumentation,
  LogLevel,
  SessionInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';

import { trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone-peer-dep';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FaroSessionSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';
import { faro } from '@grafana/faro-web-sdk';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

import {
  WebTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';

import {
    TracingInstrumentation,
} from '@grafana/faro-web-tracing';

export function faroInitializer(): Function {
  return async () => {
    initializeFaro({
        instrumentations: [
          new ErrorsInstrumentation(),
          new WebVitalsInstrumentation(),
          new ConsoleInstrumentation({
            disabledLevels: [LogLevel.TRACE, LogLevel.ERROR], // console.log will be captured
          }),
          new SessionInstrumentation(),
          new ViewInstrumentation(),
          // new TracingInstrumentation(),
        ],
        transports: [
          new FetchTransport({
            url: 'collector_url',
            apiKey: 'api_key',
          }),
          // new ConsoleTransport(),
        ],
        app: {
          name: 'frontend',
          version: '1.0.0',
        },
    });



    // set up otel
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "frontend",
        [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
      })
    );

    const provider = new WebTracerProvider({ resource });

    provider.addSpanProcessor(new FaroSessionSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ ...faro })), 
    // The Faro metas object which for example contains the Session Meta with the configured sessionId.
    faro.metas));

    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

    provider.register({
      propagator: new W3CTraceContextPropagator(),
      contextManager: new ZoneContextManager(),
    });

    const ignoreUrls = ["COLLECTOR_URL"];

    // Please be aware that this instrumentation originates from OpenTelemetry
    // and cannot be used directly in the initializeFaro instrumentations options.
    // If you wish to configure these instrumentations using the initializeFaro function,
    // please utilize the instrumentations options within the TracingInstrumentation class.
    registerInstrumentations({
    instrumentations: [
      new UserInteractionInstrumentation({
        // you can register 
        eventNames: ['submit', 'click', 'load', 'cancel'],
      }),
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({ ignoreUrls }),
      new XMLHttpRequestInstrumentation({ ignoreUrls })
    ],
    });

    faro.api.initOTEL(trace, context);
  };
}