export function PageHeading({ title, description }: { title: string; description?: string }) {
  return <header className="mb-8 border-b border-slate-200 pb-6"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-3xl text-slate-600">{description}</p>}</header>;
}
