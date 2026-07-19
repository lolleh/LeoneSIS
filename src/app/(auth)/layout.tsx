export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-90" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative z-10 flex w-full items-center justify-center px-4">{children}</div>
    </div>
  );
}
