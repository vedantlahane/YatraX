import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

export const validate =
    <T>(schema: ZodType<T>, source: Source = "body") =>
    (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            next(result.error);
            return;
        }

        // req.query is a getter-only property — cannot reassign directly.
        // For body and params we can assign; for query we attach to req as parsed data.
        if (source === 'query') {
            (req as Record<string, unknown>)['parsedQuery'] = result.data;
        } else {
            (req as unknown as Record<Source, T>)[source] = result.data;
        }
        next();
    }