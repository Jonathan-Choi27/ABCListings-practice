export interface LogInArgs {
  input: { code: string } | null;
}

export interface ConnectStripeArgs {
  input: { code: string };
}

export interface EmptyObject {
  args: Record<string, never>;
}
