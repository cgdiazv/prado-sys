import Link from 'next/link';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import { getHowToPlaybooks, HowToPlaybook } from '@/lib/helpdeskHowTo';

export default async function ManagementHowToIndexPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const playbooks = getHowToPlaybooks(locale);

  await requirePradoManagementUser(locale);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{isEs ? 'Biblioteca de guias paso a paso' : 'How-To Screens Library'}</h1>
            <p className="text-sm text-slate-500 mt-2">
              {isEs
                ? 'Playbooks listos para que el equipo de gestion y soporte responda preguntas operativas rapidamente.'
                : 'Ready playbooks your management/helpdesk team can use to answer subscriber how-to questions quickly.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <form action={`/${locale}/auth/signout`} method="POST">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-1.5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                {isEs ? 'Cerrar sesión' : 'Sign Out'}
              </button>
            </form>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.map((playbook: HowToPlaybook) => (
            <article key={playbook.slug} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{playbook.audience}</p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">{playbook.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{playbook.summary}</p>
              <Link
                href={`/management/how-to/${playbook.slug}`}
                className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-600"
              >
                {isEs ? 'Abrir guia' : 'Open how-to screen'}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
