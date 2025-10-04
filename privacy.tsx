export default function Privacy() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-slate-700 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-6 space-y-4 text-slate-700">
          <p>Premier Virtual Solutions values your privacy. We collect name, email, and message details to respond to inquiries and deliver services.</p>
          <p>We retain personal data for up to <strong>3 years</strong>. We use Formspree (forms) and Vercel (hosting). This policy is governed by the laws of the State of Illinois, United States.</p>
          <p>Contact: <a className="text-violet-700 underline" href="mailto:premiervirtualsolutions4u@gmail.com">premiervirtualsolutions4u@gmail.com</a></p>
        </div>
      </section>
    </main>
  );
}
