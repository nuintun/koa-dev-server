/**
 * @module middleware
 */

import Files from './Files';
import { Middleware } from 'koa';
import { Context } from './interface';
import { getPaths } from './utils/getPaths';

interface FilesInstance {
  files: Files;
  publicPath: string;
}

async function getFilesInstances(context: Context): Promise<FilesInstance[]> {
  const { options } = context;
  const paths = await getPaths(context);
  const instances: FilesInstance[] = [];

  for (const { outputPath, publicPath } of paths) {
    instances.push({
      publicPath,
      files: new Files(outputPath, {
        etag: options.etag,
        fs: context.outputFileSystem,
        acceptRanges: options.acceptRanges,
        cacheControl: options.cacheControl,
        lastModified: options.lastModified
      })
    });
  }

  return instances;
}

export function middleware(ctx: Context): Middleware {
  return async (context, next) => {
    let found = false;

    const { path } = context;
    const instances = await getFilesInstances(ctx);

    for (const { files, publicPath } of instances) {
      if (path.startsWith(publicPath)) {
        context.path = path.slice(publicPath.length);

        found = await files.response(context);

        if (found) {
          return;
        } else {
          context.path = path;
        }
      }
    }

    if (!found) {
      await next();
    }
  };
}
