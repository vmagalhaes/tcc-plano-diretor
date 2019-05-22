import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as _ from 'lodash';
import { map, catchError } from 'rxjs/operators';

import { RestClientService } from './rest-client.service';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class UlandService extends RestClientService {

  constructor(
    private http: HttpClient
  ) {
    super();
  }

  getFeatures(): Observable<any[]> {
    return this.http
      .get('https://api.uland.com.br/projects/7/layers/88/features', this.buildRequestOptions())
      .pipe(
        map((response: any) => {
          let sources: any = this.extract<any[]>(response);
          const features = this.unmarshalFeatures(sources.features);
          return features;
        }),
        catchError((error) => this.handleError(error))
      );
  }

  getLayers(): Observable<any[]> {
    return this.http
      .get('https://api.uland.com.br/projects/7/layers/88', this.buildRequestOptions())
      .pipe(
        map((response: any) => {
          return response;
        }),
        catchError((error) => this.handleError(error))
      );
  }

  unmarshalFeatures(sources: any[]) {
    return _.map(sources, (source) => {
      return source.geometry.geometries[0].properties;
    });
  }

}