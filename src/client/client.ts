/**
 * @module client
 */

import { emit } from './events';
import Overlay from './ui/overlay';
import * as Message from './message';
import Progress from './ui/progress';
import { StatsError } from 'webpack';
import { applyUpdate, setHash } from './hot';

export interface Options {
  readonly hmr: boolean;
  readonly name: string;
  readonly path: string;
  readonly origin: string;
  readonly reload: boolean;
  readonly overlay: boolean;
  readonly progress: boolean;
}

export default function createClient(options: Options): void {
  let updateTimer: number;

  const UPDATE_DELAY = 128;
  const RETRY_INTERVAL = 3000;

  const progress = new Progress();
  const overlay = new Overlay(options.name);

  const fallback = (): void => {
    if (options.reload) {
      self.location.reload();
    } else {
      console.warn('Use fallback update but you turn off live reload, please reload by yourself.');
    }
  };

  const applyUpdateAsync = (): void => {
    updateTimer = self.setTimeout(() => {
      applyUpdate(options.hmr, fallback);
    }, UPDATE_DELAY);
  };

  const onInvalid = (): void => {
    clearTimeout(updateTimer);

    if (options.progress) {
      progress.update(0);
      progress.show();
    }
  };

  const onProgress = ({ value }: Message.Progress['payload']): void => {
    if (options.progress) {
      progress.update(value);
    }
  };

  const onHash = ({ hash }: Message.Hash['payload']): void => {
    setHash(hash);
  };

  const setIssues = (type: 'errors' | 'warnings', issues: StatsError[]): void => {
    if (options.overlay) {
      overlay.setIssues(type, issues);
    }

    const maps: Record<string, [name: string, method: 'error' | 'warn']> = {
      errors: ['\x1b[38;2;100;30;22m\x1b[48;2;255;95;88m ERROR \x1b[0m', 'error'],
      warnings: ['\x1b[38;2;32;39;35m\x1b[48;2;255;189;46m WARNING \x1b[0m', 'warn']
    };
    const [name, method] = maps[type];
    const debug = console[method];

    for (const { moduleName, chunkName, message } of issues) {
      const filename = moduleName || chunkName || 'unknown';

      debug(`${name} in ${filename}\n${message}`);
    }
  };

  const onIssues = ({ errors, warnings }: Message.Issues['payload']): void => {
    progress.hide();

    setIssues('errors', errors);
    setIssues('warnings', warnings);

    if (options.overlay) {
      overlay.show();
    }

    if (errors.length <= 0) {
      applyUpdateAsync();
    }
  };

  const onOk = (): void => {
    overlay.hide();
    progress.hide();

    applyUpdateAsync();
  };

  const parseMessage = (
    message: MessageEvent<string>
  ): Message.Invalid | Message.Progress | Message.Hash | Message.Issues | Message.OK | null => {
    try {
      return JSON.parse(message.data);
    } catch {
      return null;
    }
  };

  const createWebSocket = (url: string): void => {
    const ws = new WebSocket(url);

    ws.onmessage = (message: MessageEvent<string>): void => {
      const parsed = parseMessage(message);

      if (parsed) {
        const { action, payload } = parsed;

        switch (action) {
          case 'invalid':
            onInvalid();
            break;
          case 'progress':
            onProgress(payload);
            break;
          case 'hash':
            onHash(payload);
            break;
          case 'issues':
            onIssues(payload);
            break;
          case 'ok':
            onOk();
            break;
        }

        emit(action, payload, options);
      }
    };

    ws.onclose = (): void => {
      overlay.hide();
      progress.hide();

      setTimeout((): void => {
        createWebSocket(url);
      }, RETRY_INTERVAL);
    };
  };

  createWebSocket(`${options.origin}${options.path}`);
}
