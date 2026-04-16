export type ActionWithHandler<TInput, TContext, TResult> = {
  handler: (input: TInput, context: TContext) => Promise<TResult>;
};

export function withHandler<TAction, TInput, TContext, TResult>(
  action: TAction,
): TAction & ActionWithHandler<TInput, TContext, TResult> {
  return action as TAction & ActionWithHandler<TInput, TContext, TResult>;
}
