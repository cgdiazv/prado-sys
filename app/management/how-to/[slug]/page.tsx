import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import { getHowToPlaybooks, HowToPlaybook } from '@/lib/helpdeskHowTo';
import { logoutConsoleUser } from '@/app/actions/auth-actions';

export default async function ManagementHowToDetailPage({
  params,
}: {
  params: Promise<{ lng?: string; slug?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const slug = resolvedParams.slug || '';

  await requirePradoManagementUser(locale);

  const playbook = getHowToPlaybooks(locale).find((item: HowToPlaybook) => item.slug === slug);
  if (!playbook) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{playbook.audience}</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{playbook.title}</h1>
            </div>
            <form action={logoutConsoleUser}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-1.5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                {isEs ? 'Cerrar sesión' : 'Sign Out'}
              </button>
            </form>
          </div>
          <p className="text-sm text-slate-600">{playbook.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {isEs ? 'Volver al panel principal' : 'Back to Main Dashboard'}
            </Link>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEs ? 'Flujo paso a paso' : 'Step-by-step workflow'}</h2>
          <ol className="space-y-2">
            {playbook.steps.map((step: string, index: number) => (
              <li key={`${playbook.slug}-step-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{isEs ? `Paso ${index + 1}:` : `Step ${index + 1}:`}</span> {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{isEs ? 'Respuesta de soporte lista para enviar' : 'Ready-to-send helpdesk reply'}</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{playbook.quickReply}</p>
        </section>
      </div>
    </main>
  );
}
