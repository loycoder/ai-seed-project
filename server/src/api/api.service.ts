/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { from, Observable, of } from 'rxjs';
import { defaultIfEmpty, filter, map, mergeMap, reduce } from 'rxjs/operators';

import { pipeline } from 'stream/promises';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';

import {
  RxFileUploadChunkData,
  RxFileUploadFileData,
} from '../types/upload.type';
import { deserialize } from 'src/utils/functions';

// 添加类型定义
interface FileUploadRequest {
  file: () => Promise<FileData>;
}

interface FileData {
  file: NodeJS.ReadableStream;
  fields: {
    [key: string]: {
      value: string;
    };
  };
}

interface WriteStreamConfig {
  path: string;
  options: {
    flags: 'r+' | 'w';
    encoding: 'binary';
    start?: number;
  };
}

interface UploadResponse {
  filePath: string;
  [key: string]: any;
}

@Injectable()
export class ApiService {
  /**
   * Function to save file on the disk then return data to the client
   *
   * @param req the request object containing the formData
   */
  uploadFile = (req: FileUploadRequest): Observable<UploadResponse> => {
    // TODO: 后面走配置中心
    const uploadDir = join(__dirname, '../../temp_upload');

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    return of(req).pipe(
      mergeMap((r: FileUploadRequest) => from(r.file())),
      mergeMap((data: FileData) =>
        of(data.fields.fileData).pipe(
          map(
            (fileData) => deserialize(fileData.value) as RxFileUploadFileData,
          ),
          mergeMap((fileData: RxFileUploadFileData) =>
            of(data.fields.chunkData).pipe(
              filter(
                (chunkData): chunkData is { value: string } =>
                  typeof chunkData === 'object',
              ),
              map(
                (chunkData) =>
                  deserialize(chunkData.value) as RxFileUploadChunkData,
              ),
              map(
                (chunkData: RxFileUploadChunkData): WriteStreamConfig => ({
                  path: join(uploadDir, fileData.name),
                  options: {
                    flags: chunkData.sequence > 1 ? 'r+' : 'w',
                    encoding: 'binary',
                    start: chunkData.startByte,
                  },
                }),
              ),
              defaultIfEmpty({
                path: join(uploadDir, fileData.name),
                options: {
                  flags: 'w',
                  encoding: 'binary',
                },
              } as WriteStreamConfig),
              mergeMap((config: WriteStreamConfig) =>
                from(
                  pipeline(
                    data.file,
                    createWriteStream(config.path, config.options),
                  ),
                ).pipe(
                  mergeMap(() =>
                    from(Object.keys(data.fields)).pipe(
                      filter((key: string) => key !== 'file'),
                      reduce<string, UploadResponse>(
                        (acc, curr) => ({
                          ...acc,
                          [curr]: deserialize(data.fields[curr].value),
                        }),
                        {
                          filePath: config.path,
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  };
}
