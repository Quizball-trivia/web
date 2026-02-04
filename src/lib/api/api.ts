import { API_BASE_URL } from "@/lib/config";
import type { paths } from "@/types/api.generated";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type PathsWithMethod<M extends HttpMethod> = {
  [P in keyof paths]: M extends keyof paths[P] ? P : never;
}[keyof paths];

type Operation<M extends HttpMethod, P extends keyof paths> = paths[P][M];

type JsonContent<T> = T extends { content: { "application/json": infer R } }
  ? R
  : T extends { content: { "application/*+json": infer R } }
    ? R
    : never;

type ResponseFrom<Op> = Op extends { responses: infer R }
  ? R extends { 200: infer R200 }
    ? JsonContent<R200>
    : R extends { 201: infer R201 }
      ? JsonContent<R201>
      : R extends { 202: infer R202 }
        ? JsonContent<R202>
        : R extends { 204: unknown }
          ? void
          : R extends { default: infer RDefault }
            ? JsonContent<RDefault>
            : unknown
  : unknown;

type RequestBodyFrom<Op> = Op extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : Op extends { requestBody?: { content: { "application/*+json": infer B } } }
    ? B
    : undefined;

type QueryParamsFrom<Op> = Op extends { parameters?: { query?: infer Q } }
  ? Q
  : undefined;

type PathParamsFrom<Op> = Op extends { parameters?: { path?: infer P } }
  ? P
  : undefined;

export type ApiRequestOptions<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
> = {
  params?: PathParamsFrom<Operation<M, P>>;
  query?: QueryParamsFrom<Operation<M, P>>;
  body?: RequestBodyFrom<Operation<M, P>> | BodyInit | null;
  headers?: HeadersInit;
  // TODO: Implement auth handling - when false, skip credentials/token injection for public endpoints
  auth?: boolean;
  signal?: AbortSignal;
};

export type ApiResponse<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
> = ResponseFrom<Operation<M, P>>;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;

    // Capture stack trace for cleaner debugging (V8 environments)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

function buildUrl(path: string, params?: Record<string, unknown>, query?: Record<string, unknown>) {
  let urlPath = path;
  if (params) {
    urlPath = urlPath.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = params[key];
      if (value === undefined || value === null) {
        return match;
      }
      return encodeURIComponent(String(value));
    });
  }

  const url = new URL(
    path.startsWith("http") ? urlPath : `${API_BASE_URL}${urlPath}`,
  );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            url.searchParams.append(key, String(item));
          }
        });
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return undefined;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request<M extends HttpMethod, P extends PathsWithMethod<M>>(
  method: M,
  path: P,
  options: ApiRequestOptions<M, P> = {},
): Promise<ApiResponse<M, P>> {
  const headers = new Headers(options.headers);

  let body = options.body as
    | BodyInit
    | Record<string, unknown>
    | null
    | undefined;

  // Only JSON-stringify plain objects, not BodyInit types like FormData, Blob, etc.
  const isPlainObject =
    body !== null &&
    typeof body === "object" &&
    body.constructor === Object;

  if (isPlainObject) {
    body = JSON.stringify(body) as BodyInit;
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(buildUrl(String(path), options.params as Record<string, unknown> | undefined, options.query as Record<string, unknown> | undefined), {
    method: method.toUpperCase(),
    headers,
    body: body as BodyInit | null | undefined,
    signal: options.signal,
    credentials: "include",
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError("Request failed", response.status, data);
  }

  return data as ApiResponse<M, P>;
}

export const api = {
  request,
  GET: <P extends PathsWithMethod<"get">>(
    path: P,
    options?: ApiRequestOptions<"get", P>,
  ) => request("get", path, options),
  POST: <P extends PathsWithMethod<"post">>(
    path: P,
    options?: ApiRequestOptions<"post", P>,
  ) => request("post", path, options),
  PUT: <P extends PathsWithMethod<"put">>(
    path: P,
    options?: ApiRequestOptions<"put", P>,
  ) => request("put", path, options),
  PATCH: <P extends PathsWithMethod<"patch">>(
    path: P,
    options?: ApiRequestOptions<"patch", P>,
  ) => request("patch", path, options),
  DELETE: <P extends PathsWithMethod<"delete">>(
    path: P,
    options?: ApiRequestOptions<"delete", P>,
  ) => request("delete", path, options),
};
