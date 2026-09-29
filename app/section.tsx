export default function Section({ title, sub, action, children }: { title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="h2">{title}</h2>
          <p className="meta mt-0.5 text-[13px]">{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
