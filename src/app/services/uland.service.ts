import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as _ from 'lodash';
import { tap, catchError } from 'rxjs/operators';

import { RestClientService } from './rest-client.service';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class UlandService extends RestClientService {

  constructor(
    private http: HttpClient
  ) {
    super();
  }

  getSources(): Observable<any[]> {
    return this.http
      .get('http://api.uland.com.br/sources/', this.buildRequestOptions())
      .pipe(
        tap((response: any) => {
          let sources = this.extract<any[]>(response);
          return sources;
        }),
        catchError((error) => this.handleError(error))
      );
  }

}