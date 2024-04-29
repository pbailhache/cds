import { ErrorHandler, Injectable } from '@angular/core';
import { faro } from '@grafana/faro-web-sdk';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any) {
    if (error instanceof Error) {
      faro.api.pushError(error);
    }
    console.error(error);
  }
}