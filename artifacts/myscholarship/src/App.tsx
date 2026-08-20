import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock3,
  FileText, Globe2, GraduationCap, LayoutDashboard, LogIn, LogOut, Menu, Pencil,
  Plus, Search, ShieldCheck, Sparkles, Trash2, UserRound, X,
} from 'lucide-react';
import {
  getGetAdminDashboardQueryKey, getGetOpportunityQueryKey, getListOpportunitiesQueryKey,
  useCreateOpportunity, useDeleteOpportunity, useGetAdminDashboard, useGetCurrentUser,
  useGetOpportunity, useListAdminOpportunities, useListOpportunities, useLogin, useLogout,
  useUpdateOpportunity,
} from '@workspace/api-client-react';
import type { Opportunity, OpportunityInput, OpportunityType } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const countries = ['Any country', 'Pakistan', 'India', 'Bangladesh', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Arab Emirates', 'United States', 'United Kingdom', 'Canada', 'Global'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function daysLeft(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  return days < 0 ? 'Closed' : days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`;
}
function initials(name: string) { return name.slice(0, 2).toUpperCase(); }

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:brightness-105',
    quiet: 'bg-secondary text-secondary-foreground hover:bg-primary/10',
    outline: 'border border-border bg-card text-foreground hover:border-primary hover:text-primary',
    danger: 'border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10',
  };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="relative z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
      <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><GraduationCap size={21} /></span>
        <span className="font-display text-2xl font-semibold tracking-tight">MyScholarship</span>
      </Link>
      <button onClick={() => setOpen(!open)} className="rounded-lg p-2 lg:hidden" aria-label="Toggle navigation" data-testid="button-toggle-navigation"><Menu size={21} /></button>
      <nav className={`${open ? 'absolute left-0 right-0 top-full flex' : 'hidden'} flex-col gap-1 border-b border-border bg-background p-4 lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0`}>
        <Link href="/" className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="link-scholarships">Scholarships</Link>
        <Link href="/internships" className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" data-testid="link-internships">Internships</Link>
        <Link href="/admin/login" className="ml-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-primary hover:bg-secondary lg:ml-3" data-testid="link-admin-login"><ShieldCheck size={16} /> Admin desk</Link>
      </nav>
    </div>
  </header>;
}

function PageFrame({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  return <div className="grain min-h-[100dvh] bg-background">{admin ? <AdminShell>{children}</AdminShell> : <><SiteHeader />{children}</>}</div>;
}

function SkeletonCards() {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-80 animate-pulse-soft rounded-2xl border border-border bg-card p-4"><div className="h-36 rounded-xl bg-muted" /><div className="mt-5 h-4 w-2/3 rounded bg-muted" /><div className="mt-3 h-7 w-5/6 rounded bg-muted" /><div className="mt-6 h-3 w-1/3 rounded bg-muted" /></div>)}</div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center"><p className="font-display text-2xl">We could not load the desk.</p><p className="mt-2 text-sm text-muted-foreground">The connection may be taking a pause. Try again in a moment.</p><Button variant="outline" className="mt-5" onClick={retry} data-testid="button-retry">Try again</Button></div>;
}

function OpportunityCard({ opportunity, index = 0 }: { opportunity: Opportunity; index?: number }) {
  return <Link href={`/opportunities/${opportunity.id}`} className="group animate-rise flex min-h-[365px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-opportunity-${opportunity.id}`}>
    <div className="relative h-44 overflow-hidden bg-secondary">
      {opportunity.imageUrl ? <img src={opportunity.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="paper-grid flex h-full items-end p-5"><Sparkles className="text-primary/70" size={38} /></div>}
      <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 font-mono-app text-[10px] font-medium uppercase tracking-[.14em] text-primary">{opportunity.type}</span>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Clock3 size={14} className="text-accent" /> {daysLeft(opportunity.deadline)}</div>
      <h3 className="mt-3 font-display text-[1.55rem] leading-[1.05] text-foreground group-hover:text-primary">{opportunity.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{opportunity.headline || opportunity.description}</p>
      <div className="mt-auto flex items-center justify-between pt-5 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1.5"><Globe2 size={14} /> {opportunity.eligibleCountries.slice(0, 2).join(', ')}</span><ArrowUpRight size={17} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
    </div>
  </Link>;
}

function FilterSurface({ type }: { type?: OpportunityType }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [deadlineWindow, setDeadlineWindow] = useState('');
  const apply = (event: React.FormEvent) => { event.preventDefault(); const params = new URLSearchParams(); if (search) params.set('search', search); if (country) params.set('country', country); if (deadlineWindow) params.set('deadline', deadlineWindow); setLocation(`${type === 'internship' ? '/internships' : '/'}${params.toString() ? `?${params}` : ''}`); };
  return <form onSubmit={apply} className="relative z-10 mx-auto mt-8 grid max-w-5xl gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-md)] md:grid-cols-[1.7fr_1fr_1fr_1fr_auto]">
    <label className="flex items-center gap-3 rounded-xl px-3 py-2.5 focus-within:bg-secondary"><Search size={18} className="text-primary" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, field, or host" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="input-search-opportunities" /></label>
    <label className="flex items-center gap-2 rounded-xl border-l border-border px-3 py-2.5"><Globe2 size={16} className="shrink-0 text-muted-foreground" /><select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-transparent text-sm outline-none" data-testid="select-country"><option value="">Any country</option>{countries.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="flex items-center gap-2 rounded-xl border-l border-border px-3 py-2.5"><CalendarDays size={16} className="shrink-0 text-muted-foreground" /><select value={deadlineWindow} onChange={(e) => setDeadlineWindow(e.target.value)} className="w-full bg-transparent text-sm outline-none" data-testid="select-deadline"><option value="">Any deadline</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="90">Next 90 days</option></select></label>
    <label className="flex items-center gap-2 rounded-xl border-l border-border px-3 py-2.5"><Clock3 size={16} className="shrink-0 text-muted-foreground" /><select value={new URLSearchParams(globalThis.location.search).get('posted') ?? ''} onChange={(e) => { const params = new URLSearchParams(globalThis.location.search); e.target.value ? params.set('posted', e.target.value) : params.delete('posted'); setLocation(`${type === 'internship' ? '/internships' : '/'}?${params}`); }} className="w-full bg-transparent text-sm outline-none" data-testid="select-posted"><option value="">Any age</option><option value="24">Last 24 hours</option><option value="72">Last 3 days</option></select></label>
    <Button type="submit" className="px-6" data-testid="button-search">Find opportunities</Button>
  </form>;
}

function ExplorePage({ type }: { type?: OpportunityType }) {
  const params = new URLSearchParams(window.location.search);
  const apiParams = useMemo(() => ({ ...(type ? { type } : {}), ...(params.get('country') ? { country: params.get('country')! } : {}), ...(params.get('search') ? { search: params.get('search')! } : {}), ...(params.get('deadline') ? { deadlineWithinDays: Number(params.get('deadline')) } : {}), ...(params.get('posted') ? { postedWithinHours: Number(params.get('posted')) } : {}) }), [type, params.toString()]);
  const query = useListOpportunities(apiParams, { query: { queryKey: getListOpportunitiesQueryKey(apiParams) } });
  const items = query.data ?? [];
  return <PageFrame><main>
    <section className="paper-grid relative overflow-hidden border-b border-border px-5 pb-14 pt-14 lg:px-8 lg:pb-20 lg:pt-20">
      <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <p className="font-mono-app text-[11px] font-medium uppercase tracking-[.2em] text-primary">{type === 'internship' ? 'Field notes / internships' : 'The opportunity desk'}</p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[.92] tracking-tight sm:text-7xl lg:text-[6.5rem]">{type === 'internship' ? <>Work that <em className="text-primary">moves</em> you.</> : <>The next chapter<br /><em className="text-primary">starts here.</em></>}</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">{type === 'internship' ? 'Practical experience, thoughtfully gathered. Find a placement that gives your curiosity somewhere to go.' : 'A quieter way to find scholarships that fit your story, your place, and your deadline.'}</p>
        <FilterSurface type={type} />
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> Every listing is reviewed before it reaches the desk.</div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-muted-foreground">Freshly posted</p><h2 className="mt-2 font-display text-4xl">{type === 'internship' ? 'Internships worth a closer look' : 'Open doors, not dead ends'}</h2></div><span className="text-sm font-semibold text-muted-foreground">{query.isLoading ? 'Gathering listings…' : `${items.length} opportunities`}</span></div>
      {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : items.length === 0 ? <div className="paper-grid rounded-2xl border border-dashed border-border p-16 text-center"><Search size={27} className="mx-auto text-primary" /><h3 className="mt-4 font-display text-2xl">Nothing matches just yet</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Try a wider search, or check back soon. Good opportunities arrive quietly.</p></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <OpportunityCard key={item.id} opportunity={item} index={index} />)}</div>}
    </section>
  </main></PageFrame>;
}

function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const opportunityId = Number(id);
  const query = useGetOpportunity(opportunityId, { query: { queryKey: getGetOpportunityQueryKey(opportunityId) } });
  if (query.isLoading) return <PageFrame><div className="mx-auto max-w-4xl px-5 py-20"><div className="h-12 w-2/3 animate-pulse-soft rounded bg-muted" /><div className="mt-5 h-6 w-1/2 animate-pulse-soft rounded bg-muted" /></div></PageFrame>;
  if (query.isError || !query.data) return <PageFrame><div className="mx-auto max-w-3xl px-5 py-24"><ErrorState retry={() => query.refetch()} /></div></PageFrame>;
  const item = query.data;
  return <PageFrame><main className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-16">
    <Link href={item.type === 'internship' ? '/internships' : '/'} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary" data-testid="link-back-opportunities"><ArrowLeft size={16} /> Back to opportunities</Link>
    <div className="mt-10 grid gap-12 lg:grid-cols-[1.45fr_.75fr]">
      <article>
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-secondary px-3 py-1 font-mono-app text-[10px] uppercase tracking-[.15em] text-primary">{item.type}</span><span className="text-sm text-muted-foreground">Posted {formatDate(item.createdAt)}</span></div>
        <h1 className="mt-5 font-display text-5xl leading-[.94] sm:text-7xl">{item.title}</h1>
        {item.headline && <p className="mt-6 max-w-2xl text-xl leading-8 text-muted-foreground">{item.headline}</p>}
        {item.imageUrl && <img src={item.imageUrl} alt="" className="mt-10 aspect-[16/8] w-full rounded-2xl object-cover" />}
        <DetailBlock title="About this opportunity" text={item.description} />
        <DetailBlock title="Who can apply" text={item.eligibilityCriteria} />
        <DetailBlock title="What it covers" text={item.financialBenefits} />
        <DetailBlock title="Documents to prepare" text={item.requiredDocuments} />
      </article>
      <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] lg:sticky lg:top-6">
        <p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-muted-foreground">Opportunity brief</p>
        <div className="mt-6 border-b border-border pb-5"><p className="text-xs font-semibold text-muted-foreground">Application deadline</p><p className="mt-1 font-display text-3xl">{formatDate(item.deadline)}</p><p className="mt-1 text-sm font-bold text-accent">{daysLeft(item.deadline)}</p></div>
        <div className="border-b border-border py-5"><p className="text-xs font-semibold text-muted-foreground">Eligible from</p><div className="mt-2 flex flex-wrap gap-2">{item.eligibleCountries.map((country) => <span key={country} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{country}</span>)}</div></div>
        {item.applicationUrl ? <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:brightness-105" data-testid="link-apply">Visit application page <ArrowUpRight size={17} /></a> : <div className="mt-6 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">Application instructions will be added soon.</div>}
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground"><ShieldCheck size={14} className="mr-1 inline text-primary" /> Listing details are provided by the publishing organization.</p>
      </aside>
    </div>
  </main></PageFrame>;
}
function DetailBlock({ title, text }: { title: string; text: string }) { return <section className="mt-12 border-t border-border pt-6"><h2 className="font-display text-3xl">{title}</h2><p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-muted-foreground">{text}</p></section>; }

function AdminShell({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const user = useGetCurrentUser();
  const logout = useLogout();
  useEffect(() => { if (!user.isLoading && user.isError) setLocation('/admin/login'); }, [user.isLoading, user.isError, setLocation]);
  if (user.isLoading) return <div className="min-h-[100dvh] bg-primary p-8"><div className="h-8 w-36 animate-pulse-soft rounded bg-primary-foreground/20" /></div>;
  return <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[250px_1fr]">
    <aside className="hidden border-r border-border bg-primary p-6 text-primary-foreground lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3" data-testid="link-admin-brand"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><GraduationCap size={20} /></span><span className="font-display text-xl">MyScholarship</span></Link>
      <p className="mt-14 font-mono-app text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Publishing desk</p>
      <nav className="mt-4 space-y-1"><AdminNav href="/admin" icon={<LayoutDashboard size={17} />} label="Overview" /><AdminNav href="/admin/opportunities" icon={<BriefcaseBusiness size={17} />} label="Opportunities" /></nav>
      <div className="mt-auto border-t border-primary-foreground/15 pt-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 font-mono-app text-xs">{initials(user.data?.username || 'AD')}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{user.data?.username}</p><p className="text-xs text-primary-foreground/55">Administrator</p></div></div><button onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/admin/login') })} className="mt-5 flex items-center gap-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground" data-testid="button-logout"><LogOut size={15} /> Sign out</button></div>
    </aside>
    <div><div className="flex items-center justify-between border-b border-border bg-card px-5 py-4 lg:hidden"><Link href="/" className="font-display text-xl" data-testid="link-mobile-brand">MyScholarship</Link><button onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/admin/login') })} aria-label="Sign out" data-testid="button-mobile-logout"><LogOut size={18} /></button></div><header className="hidden items-center justify-between border-b border-border bg-card px-8 py-5 lg:flex"><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-muted-foreground">MyScholarship / publisher</p><span className="text-sm font-semibold text-muted-foreground">{user.data?.username}</span></header><main className="p-5 lg:p-8">{children}</main></div>
  </div>;
}
function AdminNav({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) { return <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" data-testid={`link-admin-${label.toLowerCase()}`}>{icon}{label}</Link>; }

function AdminDashboard() {
  const query = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });
  if (query.isLoading) return <AdminLoading />;
  if (query.isError || !query.data) return <ErrorState retry={() => query.refetch()} />;
  const data = query.data;
  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-primary">Good morning, publisher</p><h1 className="mt-2 font-display text-5xl">Your desk, at a glance.</h1></div><Link href="/admin/opportunities/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-new-opportunity"><Plus size={17} /> Publish opportunity</Link></div>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Total opportunities', data.total, 'All entries'], ['Published', data.published, 'Live now'], ['Drafts', data.drafts, 'Need a final look'], ['Internships', data.internships, 'Across all statuses']].map(([label, value, note], index) => <div key={String(label)} className={`rounded-2xl border border-border bg-card p-5 ${index === 1 ? 'border-primary/30 bg-primary text-primary-foreground' : ''}`}><p className={`text-xs font-semibold ${index === 1 ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{label}</p><p className="mt-4 font-display text-5xl">{value}</p><p className={`mt-3 text-xs ${index === 1 ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{note}</p></div>)}</div>
    <section className="mt-10 rounded-2xl border border-border bg-card p-5 lg:p-7"><div className="flex items-center justify-between"><div><p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-muted-foreground">Recent activity</p><h2 className="mt-2 font-display text-3xl">Latest entries</h2></div><Link href="/admin/opportunities" className="text-sm font-bold text-primary hover:underline" data-testid="link-view-all-opportunities">View all</Link></div><div className="mt-6 divide-y divide-border">{data.recent.length ? data.recent.map((item) => <AdminRecentRow key={item.id} opportunity={item} />) : <p className="py-8 text-center text-sm text-muted-foreground">Your publishing history will appear here.</p>}</div></section>
  </div>;
}
function AdminRecentRow({ opportunity }: { opportunity: Opportunity }) { return <Link href={`/admin/opportunities/${opportunity.id}/edit`} className="flex items-center justify-between gap-4 py-4 hover:bg-secondary/40" data-testid={`link-recent-${opportunity.id}`}><div className="min-w-0"><p className="truncate font-bold">{opportunity.title}</p><p className="mt-1 text-xs text-muted-foreground">{opportunity.type} · updated {formatDate(opportunity.updatedAt)}</p></div><StatusPill status={opportunity.status} /></Link>; }
function StatusPill({ status }: { status: string }) { return <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono-app text-[10px] uppercase tracking-wider ${status === 'published' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>{status}</span>; }
function AdminLoading() { return <div className="space-y-5"><div className="h-12 w-80 animate-pulse-soft rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((x) => <div key={x} className="h-36 animate-pulse-soft rounded-2xl bg-muted" />)}</div><div className="h-72 animate-pulse-soft rounded-2xl bg-muted" /></div>; }

function AdminOpportunities() {
  const query = useListAdminOpportunities();
  const deleteMutation = useDeleteOpportunity();
  const client = useQueryClient();
  const [filter, setFilter] = useState('all');
  const items = (query.data ?? []).filter((item) => filter === 'all' || item.status === filter);
  const remove = (id: number) => { if (window.confirm('Delete this opportunity permanently?')) deleteMutation.mutate({ id }, { onSuccess: () => { client.invalidateQueries({ queryKey: query.queryKey }); client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); } }); };
  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <ErrorState retry={() => query.refetch()} />;
  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-primary">Publishing desk</p><h1 className="mt-2 font-display text-5xl">Opportunities</h1></div><Link href="/admin/opportunities/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-admin-new"><Plus size={17} /> New opportunity</Link></div>
    <div className="mt-9 flex gap-2 border-b border-border pb-3">{['all', 'published', 'draft'].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${filter === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`} data-testid={`button-filter-${value}`}>{value} {value === 'all' ? items.length : (query.data ?? []).filter((item) => item.status === value).length}</button>)}</div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">{items.length ? <div className="divide-y divide-border">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="hidden h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary sm:block">{item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusPill status={item.status} /><span className="font-mono-app text-[10px] uppercase tracking-wider text-muted-foreground">{item.type}</span></div><p className="mt-1 truncate font-bold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">Deadline {formatDate(item.deadline)} · {item.eligibleCountries.join(', ')}</p></div></div><div className="flex gap-2 sm:shrink-0"><Link href={`/admin/opportunities/${item.id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary hover:text-primary" data-testid={`link-edit-opportunity-${item.id}`}><Pencil size={14} /> Edit</Link><Button variant="danger" className="px-3 py-2" onClick={() => remove(item.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-opportunity-${item.id}`}><Trash2 size={14} /> Delete</Button></div></div>)}</div> : <div className="p-16 text-center"><BriefcaseBusiness size={28} className="mx-auto text-primary" /><p className="mt-4 font-display text-2xl">No opportunities here</p><p className="mt-2 text-sm text-muted-foreground">Publish your first listing to start building the desk.</p></div>}</div>
  </div>;
}

const blankForm: OpportunityInput = { title: '', headline: '', type: 'scholarship', status: 'draft', imageUrl: '', description: '', deadline: '', eligibleCountries: [], eligibilityCriteria: '', financialBenefits: '', requiredDocuments: '', applicationUrl: null };
function OpportunityFormPage({ editing = false }: { editing?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const opportunityId = Number(id);
  const existing = useGetOpportunity(opportunityId, { query: { enabled: editing && !!id, queryKey: getGetOpportunityQueryKey(opportunityId) } });
  const [form, setForm] = useState<OpportunityInput>(blankForm);
  const [countriesText, setCountriesText] = useState('');
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const create = useCreateOpportunity();
  const update = useUpdateOpportunity();
  useEffect(() => { if (existing.data) { const item = existing.data; setForm({ title: item.title, headline: item.headline || '', type: item.type, status: item.status, imageUrl: item.imageUrl, description: item.description, deadline: item.deadline.slice(0, 10), eligibleCountries: item.eligibleCountries, eligibilityCriteria: item.eligibilityCriteria, financialBenefits: item.financialBenefits, requiredDocuments: item.requiredDocuments, applicationUrl: item.applicationUrl || null }); setCountriesText(item.eligibleCountries.join(', ')); } }, [existing.data]);
  const set = (key: keyof OpportunityInput, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('imageUrl', String(reader.result));
    reader.readAsDataURL(file);
  };
  const save = (status: 'draft' | 'published') => {
    const eligibleCountries = countriesText.split(',').map((item) => item.trim()).filter(Boolean);
    if (!form.title || form.description.length < 10 || !form.deadline || !eligibleCountries.length) { window.alert('Please complete the title, description, deadline, and at least one country.'); return; }
    const data = { ...form, status, eligibleCountries, deadline: new Date(`${form.deadline}T23:59:00`).toISOString(), applicationUrl: form.applicationUrl || null };
    const onSuccess = () => { client.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() }); client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); client.invalidateQueries({ queryKey: ['/api/admin/opportunities'] }); setLocation('/admin/opportunities'); };
    if (editing) update.mutate({ id: opportunityId, data }, { onSuccess });
    else create.mutate({ data }, { onSuccess });
  };
  const pending = create.isPending || update.isPending;
  if (editing && existing.isLoading) return <AdminLoading />;
  return <div className="mx-auto max-w-4xl animate-rise"><Link href="/admin/opportunities" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary" data-testid="link-back-admin"><ArrowLeft size={16} /> Back to opportunities</Link><div className="mt-8"><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-primary">{editing ? 'Edit entry' : 'New entry'}</p><h1 className="mt-2 font-display text-5xl">{editing ? 'Refine the details.' : 'Publish an opportunity.'}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Give students the context they need to decide quickly. Clear details make a better desk.</p></div>
    <div className="mt-9 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] sm:p-8"><div className="grid gap-6 md:grid-cols-2"><Field label="Title" required><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Mastercard Foundation Scholars Program" data-testid="input-opportunity-title" /></Field><Field label="Short headline"><input value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="One clear line that earns attention" data-testid="input-opportunity-headline" /></Field><Field label="Type"><select value={form.type} onChange={(e) => set('type', e.target.value as OpportunityType)} data-testid="select-opportunity-type"><option value="scholarship">Scholarship</option><option value="internship">Internship</option></select></Field><Field label="Deadline" required><input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} data-testid="input-opportunity-deadline" /></Field><Field label="Eligible countries" required hint="Separate countries with commas"><input value={countriesText} onChange={(e) => setCountriesText(e.target.value)} placeholder="Ghana, Nigeria, Global" data-testid="input-opportunity-countries" /></Field><Field label="Opportunity image"><div className="space-y-2"><input type="file" accept="image/*" onChange={(e) => handleImageFile(e.target.files?.[0])} className="w-full rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm font-normal" data-testid="input-opportunity-image-file" /><input value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="Or paste an image URL" data-testid="input-opportunity-image" />{form.imageUrl && <img src={form.imageUrl} alt="Selected opportunity preview" className="h-24 w-full rounded-lg object-cover" />}</div></Field><div className="md:col-span-2"><Field label="Description" required><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} placeholder="Tell the opportunity story in plain language." data-testid="textarea-opportunity-description" /></Field></div><div className="md:col-span-2"><Field label="Eligibility criteria"><textarea value={form.eligibilityCriteria} onChange={(e) => set('eligibilityCriteria', e.target.value)} rows={4} placeholder="Who is this for? Include study level, academic requirements, or experience." data-testid="textarea-opportunity-eligibility" /></Field></div><Field label="Financial benefits"><textarea value={form.financialBenefits} onChange={(e) => set('financialBenefits', e.target.value)} rows={4} placeholder="Tuition, stipend, travel, mentorship…" data-testid="textarea-opportunity-benefits" /></Field><Field label="Required documents"><textarea value={form.requiredDocuments} onChange={(e) => set('requiredDocuments', e.target.value)} rows={4} placeholder="CV, transcripts, references…" data-testid="textarea-opportunity-documents" /></Field><div className="md:col-span-2"><Field label="Application URL"><input value={form.applicationUrl || ''} onChange={(e) => set('applicationUrl', e.target.value)} placeholder="https://application.example.org" data-testid="input-opportunity-url" /></Field></div></div><div className="mt-8 flex flex-col-reverse justify-end gap-3 border-t border-border pt-6 sm:flex-row"><Link href="/admin/opportunities" className="inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary" data-testid="link-cancel-form">Cancel</Link><Button variant="quiet" onClick={() => save('draft')} disabled={pending} data-testid="button-save-draft">Save as draft</Button><Button onClick={() => save('published')} disabled={pending} data-testid="button-publish-opportunity">{pending ? 'Saving…' : editing ? 'Update & publish' : 'Publish opportunity'} <ArrowUpRight size={16} /></Button></div></div>
  </div>;
}
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-bold"><span>{label} {required && <span className="text-accent">*</span>} {hint && <small className="font-normal text-muted-foreground">({hint})</small>}</span><div className="[&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-input [&>input]:bg-background [&>input]:px-3 [&>input]:py-3 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none [&>input]:focus:border-primary [&>textarea]:w-full [&>textarea]:resize-y [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-input [&>textarea]:bg-background [&>textarea]:px-3 [&>textarea]:py-3 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:outline-none [&>textarea]:focus:border-primary [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-input [&>select]:bg-background [&>select]:px-3 [&>select]:py-3 [&>select]:text-sm [&>select]:font-normal [&>select]:outline-none">{children}</div></label>; }

function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useLogin();
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(''); login.mutate({ data: { username, password } }, { onSuccess: () => setLocation('/admin'), onError: () => setError('Those details did not open the desk. Check your username and password.') }); };
  return <div className="grain grid min-h-[100dvh] bg-primary lg:grid-cols-[1.1fr_.9fr]"><div className="paper-grid hidden flex-col justify-between p-10 text-primary-foreground lg:flex"><Link href="/" className="flex items-center gap-3" data-testid="link-login-brand"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><GraduationCap size={21} /></span><span className="font-display text-2xl">MyScholarship</span></Link><div className="max-w-xl"><p className="font-mono-app text-[10px] uppercase tracking-[.2em] text-primary-foreground/60">For the people behind the opportunities</p><h1 className="mt-6 font-display text-7xl leading-[.88]">Make the<br /><em className="text-accent">right door</em><br />easier to find.</h1><p className="mt-7 max-w-md text-base leading-7 text-primary-foreground/70">A focused publishing space for the programs, fellowships, and placements students are waiting for.</p></div><p className="text-xs text-primary-foreground/45">MyScholarship publishing desk · 2025</p></div><div className="flex items-center justify-center bg-background p-5 sm:p-10"><div className="w-full max-w-md"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary lg:hidden" data-testid="link-login-back"><ArrowLeft size={16} /> Back to MyScholarship</Link><div className="mb-8"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><LogIn size={20} /></span><p className="mt-8 font-mono-app text-[10px] uppercase tracking-[.18em] text-primary">Private area</p><h2 className="mt-2 font-display text-5xl">Welcome back.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to manage what students see on the desk.</p></div><form onSubmit={submit} className="space-y-5"><Field label="Username" required><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" data-testid="input-login-username" /></Field><Field label="Password" required><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" data-testid="input-login-password" /></Field>{error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-login-error">{error}</p>}<Button type="submit" className="w-full py-3.5" disabled={login.isPending} data-testid="button-login">{login.isPending ? 'Opening desk…' : 'Sign in'} <ArrowUpRight size={16} /></Button></form><p className="mt-8 text-center text-xs leading-5 text-muted-foreground"><ShieldCheck size={14} className="mr-1 inline text-primary" /> This is a secure publisher area.</p></div></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={() => <ExplorePage />} />
    <Route path="/internships" component={() => <ExplorePage type="internship" />} />
    <Route path="/opportunities/:id" component={OpportunityDetail} />
    <Route path="/admin/login" component={AdminLogin} />
    <Route path="/admin" component={() => <PageFrame admin><AdminDashboard /></PageFrame>} />
    <Route path="/admin/opportunities" component={() => <PageFrame admin><AdminOpportunities /></PageFrame>} />
    <Route path="/admin/opportunities/new" component={() => <PageFrame admin><OpportunityFormPage /></PageFrame>} />
    <Route path="/admin/opportunities/:id/edit" component={() => <PageFrame admin><OpportunityFormPage editing /></PageFrame>} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;