/**
 * @module interface
 */

import { createReadStream, Stats as FileStats } from 'fs';
import { Compiler, MultiCompiler, Watching } from 'webpack';
import { ICompiler, ILogger, IStats, IStatsOptions } from '/server/interface';

interface Headers {
  [key: string]: string | string[];
}

interface HeaderFunction {
  (path: string, stats: FileStats): Headers | void;
}

type IOutputFileSystem = NonNullable<Compiler['outputFileSystem']>;

export interface OutputFileSystem extends IOutputFileSystem {
  createReadStream: typeof createReadStream;
}

export interface FilesOptions {
  etag?: boolean;
  fs: OutputFileSystem;
  acceptRanges?: boolean;
  lastModified?: boolean;
  headers?: Headers | HeaderFunction;
}

export interface Callback {
  (stats: IStats): void;
}

export interface Context {
  stats: IStats;
  state: boolean;
  logger: ILogger;
  options: Options;
  compiler: ICompiler;
  callbacks: Callback[];
  outputFileSystem: OutputFileSystem;
  watching: Watching | ReturnType<MultiCompiler['watch']>;
}

export interface Options extends Omit<FilesOptions, 'fs'> {
  stats?: IStatsOptions;
  outputFileSystem?: OutputFileSystem;
  writeToDisk?: boolean | ((targetPath: string) => boolean);
}

export interface AdditionalMethods {
  logger: ILogger;
  isReady(): boolean;
  ready(callback: Callback): void;
  invalidate(callback: Callback): void;
  close(callback: (error?: Error | null) => void): void;
}

export type InitialContext = Optional<Context, 'stats' | 'watching' | 'outputFileSystem'>;
