export type ServiceResult<TData, TCode extends string = string> =
  | { ok: true; data: TData }
  | { ok: false; code: TCode };
