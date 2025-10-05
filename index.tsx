import Head from 'next/head'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const email = 'premiervirtualsolutions4u@gmail.com'
const formspreeId = 'xqaykbel'
const formspreeEndpoint = `https://formspree.io/f/${formspreeId}`
const recaptchaSiteKey: string | undefined = undefined
const DRAFT_KEY = 'pvs-contact-draft-v5'

interface Errors { name?: string; email?: string; message?: string }
interface FormState { name: string; email: string; message: string }

export default function Home() {
  const nav = useMemo(() => [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'about', label: 'About' },
    { id: 'insights', label: 'Insights' },
    { id: 'contact', label: 'Contact' },
  ], [])

  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState({ name: false, email: false, message: false })
  const [toast, setToast] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitMsg, setSubmitMsg] = useState('')
  const [showThanks, setShowThanks] = useState(false)

  const modalRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email)
      } else if (typeof document !== 'undefined') {
        const tmp = document.createElement('input'); tmp.value = email; document.body.appendChild(tmp)
        tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp)
      }
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { setCopied(false) }
  }

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return
      const draft = JSON.parse(raw) as Partial<FormState>
      setForm(prev => ({ name: draft.name ?? prev.name, email: draft.email ?? prev.email, message: draft.message ?? prev.message }))
    } catch {}
  }, [])
  const persistDraft = (next: FormState) => { try { if (typeof window !== 'undefined') localStorage.setItem(DRAFT_KEY, JSON.stringify(next)) } catch {} }

  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  const validate = (fields: Partial<FormState>): Errors => {
    const e: Errors = {}
    if (fields.name !== undefined && !fields.name.trim()) e.name = 'Please enter your name.'
    if (fields.email !== undefined && !emailRe.test(fields.email || '')) e.email = 'Please enter a valid email address.'
    if (fields.message !== undefined && (fields.message || '').trim().length < 10) e.message = 'Please include at least 10 characters.'
    return e
  }

  const onInputChange = (field: keyof FormState) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = ev.currentTarget.value
    const next = { ...form, [field]: value }; setForm(next)
    setErrors(prev => ({ ...prev, [field]: validate({ [field]: value } as Partial<FormState>)[field] }))
    persistDraft(next)
  }
  const onFieldBlur = (field: keyof FormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: validate({ [field]: form[field] } as Partial<FormState>)[field] }))
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const v = validate(form); setErrors(v)
    if (Object.keys(v).length) { setTouched({ name: true, email: true, message: true }); setToast('Please fix the highlighted errors before submitting.'); return }

    setSubmitStatus('loading'); setSubmitMsg('')
    let recaptchaToken = ''
    try { if (recaptchaSiteKey && typeof window !== 'undefined') { const g = (window as any).grecaptcha; if (g?.execute) recaptchaToken = await g.execute(recaptchaSiteKey, { action: 'submit' }) } } catch {}

    try {
      const payload: Record<string,string> = { name: form.name, email: form.email, message: form.message }
      if (recaptchaToken) payload['g-recaptcha-response'] = recaptchaToken
      const resp = await fetch(formspreeEndpoint, { method:'POST', headers:{Accept:'application/json','Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const result = await resp.json().catch(() => ({}))
      if (resp.ok) {
        setSubmitStatus('success'); setSubmitMsg('Thank you—your message has been sent.'); setToast('Message sent successfully!'); setShowThanks(true)
        try { if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY) } catch {}
        setForm({ name:'', email:'', message:'' }); setErrors({}); setTouched({ name:false, email:false, message:false })
      } else { throw new Error((result as any)?.error || 'Submission failed') }
    } catch {
      setSubmitStatus('error'); setSubmitMsg('Sorry, something went wrong. Please email directly.'); setToast('Submission failed — please try again.')
    }
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2000); return () => clearTimeout(t) }, [toast])

  useEffect(() => {
    if (!showThanks) return
    const previouslyFocused = (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null)
    const dialog = modalRef.current
    const focusable = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const trap = (e: KeyboardEvent) => {
      if (e.key != 'Tab' || !dialog) return
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter(n => !n.hasAttribute('disabled'))
      if (!nodes.length) return
      const first = nodes[0]; const last = nodes[nodes.length-1]
      const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    const focusFirst = () => { const el = closeBtnRef.current || dialog; if (el && 'focus' in el) (el as HTMLElement).focus() }
    focusFirst()
    if (typeof document !== 'undefined') document.addEventListener('keydown', trap)
    return () => { if (typeof document !== 'undefined') document.removeEventListener('keydown', trap); previouslyFocused and previouslyFocused.focus and previouslyFocused.focus() }
  }, [showThanks])

  useEffect(() => {
    try {
      if (typeof document === 'undefined') return
      nav.forEach(({ id }) => console.assert(!!document.getElementById(id), `Missing section: #${id}`))
      console.assert(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'Email appears invalid')
      const ids = new Set<string>(); nav.forEach(({ id }) => { const s = ids.size; ids.add(id); console.assert(ids.size > s, `Duplicate id in nav: #${id}`) })
      console.assert(!!document.querySelector('section#contact form'), 'Contact form missing')
      console.assert(!!document.querySelector(`form[action="${formspreeEndpoint}"]`), 'Form action not pointing to Formspree endpoint')
    } catch (err) { console.warn('Diagnostics suppressed error:', err) }
  }, [nav])

  return (
    <>
      <Head>
        <title>Premier Virtual Solutions</title>
        <meta name="description" content="Executive Virtual Assistance for Leaders Who Value Time, Privacy & Efficiency" />
      </Head>

      <div className="min-h-screen bg-white text-slate-900">
        <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="#home" className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold shadow-md">PVS</span>
              <div className="leading-tight">
                <div className="font-semibold tracking-tight">Premier Virtual Solutions</div>
                <div className="text-xs text-slate-500">Professional Administrative Support</div>
              </div>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {nav.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="hover:text-violet-600 transition-colors">{item.label}</a>
              ))}
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow hover:shadow-lg transition-all">Schedule a Consultation</a>
            </nav>
          </div>
        </header>

        <section id="home" className="relative py-24 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(139,92,246,0.12),transparent_70%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">100% Virtual • Evenings & Weekends</span>
                <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">Executive Virtual Assistance for Leaders Who Value Time, Privacy & Efficiency</h1>
                <p className="mt-4 text-slate-600 max-w-2xl">Premier Virtual Solutions provides confidential, reliable, and efficient executive assistance — from calendars and inboxes to expenses and sensitive documents — so you gain back time and peace of mind.</p>
                <ul className="mt-6 space-y-2 text-slate-700 text-sm">
                  <li className="flex items-start gap-2"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-violet-600" /> Calendar & inbox managed end-to-end</li>
                  <li className="flex items-start gap-2"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-violet-600" /> Meetings coordinated; notes & reports prepared</li>
                  <li className="flex items-start gap-2"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-violet-600" /> Confidential docs & expenses handled with care</li>
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#contact" className="inline-flex items-center rounded-full px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg font-semibold">Book a Consultation</a>
                  <a href="#pricing" className="inline-flex items-center rounded-full px-6 py-3 border border-slate-300 hover:border-violet-500 hover:text-violet-600 font-semibold">See Pricing</a>
                </div>
                <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-slate-800">
                  <h3 className="text-sm font-semibold text-violet-800">Welcome</h3>
                  <p className="mt-1 text-sm">Welcome to <span className="font-medium">Premier Virtual Solutions</span>! We are excited to provide professional virtual assistant services designed to streamline your operations, enhance productivity, and support your business growth. Let us handle the details so you can focus on what matters most.</p>
                </div>
                <div className="mt-6 text-xs text-slate-500">Client Reviews (Coming Soon)</div>
              </div>
              <div className="relative">
                <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-2xl font-bold">PVS</div>
                    <div>
                      <div className="text-lg font-semibold">Executive Virtual Assistance</div>
                      <div className="text-slate-500 text-sm">Structure. Clarity. Trusted follow-through.</div>
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="text-sm text-slate-600 space-y-2">
                    <div className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"/> Inbox zero workflow</div>
                    <div className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"/> Priority scheduling</div>
                    <div className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500"/> Secure document handling</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="py-16 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
            <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-700 text-sm">
              <li className="rounded-xl border border-slate-200 bg-white p-4">Email & Calendar Management</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Appointment Scheduling</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Travel Coordination</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Meeting Notes & Detailed Reports</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Expense Report Management</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Research & Data Gathering</li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">Secure & Discreet Handling of Confidential Documents</li>
            </ul>
            <div className="mt-6">
              <a href="#contact" className="inline-flex items-center rounded-full px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg font-semibold">Let’s Work Together</a>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-200 p-4 flex flex-col">
                <div className="font-medium text-slate-800">Starter</div>
                <div className="text-2xl font-bold mt-1">$35<span className="text-xs text-slate-500">/hr</span></div>
                <ul className="mt-3 text-slate-700 space-y-1 list-disc list-inside">
                  <li>Calendar & Inbox Management</li>
                  <li>Appointment Scheduling</li>
                </ul>
                <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Book Now</a>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 flex flex-col">
                <div className="font-medium text-slate-800">Professional</div>
                <div className="text-2xl font-bold mt-1">$45<span className="text-xs text-slate-500">/hr</span></div>
                <ul className="mt-3 text-slate-700 space-y-1 list-disc list-inside">
                  <li>Everything in Starter</li>
                  <li>Expense Report Management</li>
                  <li>Confidential Document Preparation</li>
                </ul>
                <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Book Now</a>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 flex flex-col">
                <div className="font-medium text-slate-800">Premier</div>
                <div className="text-2xl font-bold mt-1">$60<span className="text-xs text-slate-500">/hr</span></div>
                <ul className="mt-3 text-slate-700 space-y-1 list-disc list-inside">
                  <li>Everything in Professional</li>
                  <li>Meeting Notes & Detailed Reports</li>
                  <li>Priority Turnaround</li>
                </ul>
                <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Book Now</a>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 flex flex-col">
                <div className="font-medium text-slate-800">On‑Demand</div>
                <div className="text-2xl font-bold mt-1">Pay‑As‑You‑Go</div>
                <p className="mt-3 text-slate-700">Flexible support across calendar/inbox, data entry, expenses, documents, and scheduling—only pay for the time you need.</p>
                <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Get Started</a>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-16 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">About Premier Virtual Solutions</h2>
            <div className="mt-6 grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4 text-slate-700">
                <p>Premier Virtual Solutions was founded to provide confidential, reliable, and efficient executive assistance for leaders who value time, privacy, and efficiency. We bridge the gap between busy leaders and the dependable support they need to operate at their best, handling calendars, inboxes, expenses, and sensitive documents so they can focus on growth and impact.</p>
                <p>As your Executive Virtual Assistant, I serve as the trusted right‑hand support ensuring nothing falls through the cracks. From managing a packed calendar and inbox to drafting meeting reports and safeguarding sensitive documents, my goal is simple: create the space for you to lead confidently while I handle the details.</p>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-medium text-slate-900">What clients feel the most:</p>
                  <p className="mt-1">Calendar and inbox management. It seems simple, but leaders consistently tell me it changes everything when they no longer have to dig through emails or juggle double‑booked meetings.</p>
                </div>
                <p>My personal motto — <span className="italic">“Set the standard, then stand on it.”</span> — guides how I show up for every client, every day.</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Business Information</h3>
                  <ul className="mt-2 text-sm space-y-1">
                    <li><span className="font-medium">Business Name:</span> Premier Virtual Solutions</li>
                    <li><span className="font-medium">Business Type:</span> Virtual Assistant Services</li>
                    <li><span className="font-medium">Founder/Owner:</span> Tracey Williams</li>
                    <li><span className="font-medium">Founded:</span> 2024</li>
                    <li><span className="font-medium">Location:</span> Remote/Virtual – Serving clients nationwide and globally</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Mission</h3>
                  <p className="mt-1 text-sm">Premier Virtual Solutions provides professional virtual assistant services designed to streamline operations, reduce stress, and increase productivity. We are dedicated to supporting business owners, entrepreneurs, and professionals by handling the details so they can focus on growth and impact.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Vision</h3>
                  <p className="mt-1 text-sm">To be recognized as a trusted partner for businesses worldwide, known for delivering reliable, efficient, and customized virtual solutions that help clients achieve their goals.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Core Values</h3>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li><span className="font-medium">Professionalism</span> – We uphold the highest standards in everything we do.</li>
                    <li><span className="font-medium">Reliability</span> – Clients can depend on us to deliver with excellence.</li>
                    <li><span className="font-medium">Confidentiality</span> – We safeguard sensitive business information at all times.</li>
                    <li><span className="font-medium">Client-Focused</span> – We create solutions tailored to each client’s unique needs.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Target Audience</h3>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li>Small to Medium-Sized Business Owners</li>
                    <li>Entrepreneurs & Startups</li>
                    <li>Busy Executives & Professionals</li>
                    <li>Nonprofit Leaders</li>
                    <li>Consultants & Freelancers</li>
                  </ul>
                </div>
                <a href="#contact" className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg w-full">Book a Consultation</a>
              </div>
            </div>
          </div>
        </section>

        <section id="insights" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
            <p className="mt-3 text-slate-700">Articles and perspectives will be shared here.</p>
          </div>
        </section>

        <section id="contact" className="py-20 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">Contact</h2>
            <div className="mt-8 grid lg:grid-cols-2 gap-10">
              {showThanks ? (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4 bg-white rounded-3xl border border-green-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-green-700">Thank you</h3>
                  <p className="text-slate-700">Your message has been received. I will reply as soon as possible.</p>
                  <div className="flex gap-3">
                    <a href={`mailto:${email}`} className="rounded-full px-6 py-3 font-semibold border border-slate-300 hover:border-violet-500 hover:text-violet-600">Email again</a>
                    <a href="#home" className="rounded-full px-6 py-3 text-white bg-violet-600 hover:bg-violet-700 font-semibold">Back to top</a>
                  </div>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence>
                    {Object.values(errors).filter(Boolean).length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.25 }} className="sticky top-20 sm:top-24 z-10">
                        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 shadow-sm">
                          <strong>Heads up:</strong> Please fix {Object.values(errors).filter(Boolean).length} {Object.values(errors).filter(Boolean).length === 1 ? 'error' : 'errors'} below.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleContactSubmit} action={formspreeEndpoint} method="POST" target="_top" className="space-y-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm" noValidate>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label htmlFor="name" className="text-sm font-medium">Name</label>
                        <input id="name" name="name" required aria-invalid={!!errors.name} aria-describedby="name-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.name ? 'border-rose-400' : 'border-slate-300'}`} placeholder="Your name" value={form.name} onChange={onInputChange('name')} onBlur={onFieldBlur('name')} />
                        {errors.name && <p id="name-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.name}</p>}
                      </div>
                      <div className="relative">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <input id="email" name="email" type="email" required aria-invalid={!!errors.email} aria-describedby="email-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.email ? 'border-rose-400' : 'border-slate-300'}`} placeholder="you@example.com" value={form.email} onChange={onInputChange('email')} onBlur={onFieldBlur('email')} />
                        {errors.email && <p id="email-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="hidden">
                      <label htmlFor="company">Company</label>
                      <input id="company" name="company" />
                    </div>

                    <div className="relative">
                      <label htmlFor="message" className="text-sm font-medium">Message</label>
                      <textarea id="message" name="message" rows={5} required minLength={10} aria-invalid={!!errors.message} aria-describedby="msg-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.message ? 'border-rose-400' : 'border-slate-300'}`} placeholder="Tell me about your administrative support needs…" value={form.message} onChange={onInputChange('message')} onBlur={onFieldBlur('message')} />
                      {errors.message and <p id="msg-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.message}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button type="submit" className={`rounded-full px-6 py-3 text-white font-semibold disabled:opacity-60 ${submitStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600 hover:bg-violet-700'}`} whileTap={{ scale: 0.98 }} animate={submitStatus === 'success' ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 0.35 }} disabled={submitStatus === 'loading'}>{submitStatus === 'loading' ? 'Sending…' : submitStatus === 'success' ? 'Sent!' : 'Send Message'}</motion.button>
                      <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1 text-sm px-3 py-2 rounded-full border hover:border-violet-500 hover:text-violet-600 ${copied ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}>{copied ? 'Copied!' : 'Copy Email'}</button>
                      {submitMsg && (<span className={`text-sm ${submitStatus === 'success' ? 'text-green-600' : submitStatus === 'error' ? 'text-rose-600' : 'text-slate-500'}`} aria-live="polite">{submitMsg}</span>)}
                    </div>

                    <p className="text-xs text-slate-500">This form submits securely to Formspree (Form ID: {formspreeId}).</p>
                  </form>
                </>
              )}
              <div className="space-y-3 text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Email:</span>
                  <span className="ml-2 text-violet-700 break-all">{email}</span>
                </div>
                <div><span className="font-medium">Hours:</span> Evenings and weekends</div>
                <div><span className="font-medium">Support Mode:</span> 100% Virtual</div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {toast && (
            <motion.div key="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.22 }} className={`fixed bottom-6 right-6 z-[70] rounded-xl text-white text-sm px-4 py-2 shadow-lg ${toast.includes('successfully') ? 'bg-green-600' : toast.includes('failed') ? 'bg-rose-600' : toast.includes('Please fix') ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600'}`} role="status" aria-live="polite">{toast}</motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showThanks && (
            <motion.div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40" />
              <motion.div ref={modalRef} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-[61] w-[90vw] max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Thank you for reaching out</h3>
                <p className="mt-2 text-slate-600">Your message was sent successfully. I typically respond during evenings and weekends.</p>
                <div className="mt-4 flex gap-3 justify-end">
                  <button ref={closeBtnRef} onClick={() => setShowThanks(false)} className="rounded-full px-5 py-2 font-medium text-white bg-violet-600 hover:bg-violet-700">Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="p-6 text-center text-sm text-slate-500 border-t border-slate-200">© {new Date().getFullYear()} Premier Virtual Solutions. All rights reserved.</footer>
      </div>
    </>
  )
}
