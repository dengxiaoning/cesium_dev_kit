
import type { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';
import type { CreateAxiosOptions } from './axiosTransform';
import { isFunction } from '@/utils/is';

import axios from 'axios';

export class Axios {
  private axiosInstance: AxiosInstance;
  private readonly options: CreateAxiosOptions;

  constructor(options: CreateAxiosOptions) {
    this.options = options;
    this.axiosInstance = axios.create(options);
    this.setupInterceptors();
  }

  private getTransform() {
    const { transform } = this.options;
    return transform;
  }

  private setupInterceptors(){
    const transform = this.getTransform();

    if (!transform) {
      return;
    }

    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch,
    } = transform;

    this.axiosInstance.interceptors.request.use((config: AxiosRequestConfig) => {
      // If cancel repeat request is turned on, then cancel repeat request is prohibited
      const {
        headers: { ignoreCancelToken },
      } = config;

      const ignoreCancel =
      ignoreCancelToken !== undefined
        ? ignoreCancelToken
        : this.options.requestOptions?.ignoreCancelToken;
      
      if (requestInterceptors && isFunction(requestInterceptors)) {
        config = requestInterceptors(config);
      }
 
      return config;
    },undefined)
  }

}