import { HttpHeaders } from '@angular/common/http';
import { throwError } from 'rxjs';

export abstract class RestClientService {

  authToken: string;

  constructor(
  ) { }

  extract<T>(response: any): T {
    return <T>response;
  }

  buildRequestOptions(queryParams: any = {}) {
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('Accept', 'application/json');
    headers = headers.append('Content-Type', 'application/json; charset=UTF-8');
    headers = headers.append('token-type', 'Bearer');
    headers = headers.append('uid', 'viictorg1@gmail.com');
    headers = headers.append('access-token', 'cH4kHsuWxFUfEh5Ze0XS-w');
    headers = headers.append('expiry', '1575481594');
    headers = headers.append('client', '_QmvP_EirnG6pE2KthgLjQ');

    const params = this.buildSearchParams(queryParams);

    return { headers, params };
  }

  handleError(error: any): any {
    const message = error.message || 'Server error';
    return throwError({ error: error, message: message });
  }

  getParameterByName(name) {
    const match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  private buildSearchParams(queryParams: { [key: string]: any }) {
    const params = {};

    for (const key of Object.keys(queryParams)) {
      const value = queryParams[key];

      if (Array.isArray(value)) {
        value.forEach((v: string) => {
          params[`${key}[]`] = v;
        });
      } else {
        params[`${key}`] = value;
      }
    }

    return params;
  }

}
