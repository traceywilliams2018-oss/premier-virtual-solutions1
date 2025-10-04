export default function Terms() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-slate-700 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-6 space-y-4 text-slate-700">
          <p>By using this website and our services, you agree to these Terms. Services include executive assistance such as calendar & inbox management, scheduling, documentation, and expenses.</p>
          <p>Payment terms are agreed in writing. Confidentiality is maintained. Liability is limited to the maximum extent permitted by law. Governed by Illinois, USA.</p>
          <p>Contact: <a className="text-violet-700 underline" href="mailto:premiervirtualsolutions4u@gmail.com">premiervirtualsolutions4u@gmail.com</a></p>
        </div>
      </section>
    </main>
  );
}
