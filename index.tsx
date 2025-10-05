import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Site() {
  const email = "premiervirtualsolutions4u@gmail.com";
  const nav = [
    { id: "home", label: "Home" },
    { id: "services", label: "Services" },
    { id: "pricing", label: "Pricing" },
    { id: "about", label: "About" },
    { id: "insights", label: "Insights" },
    { id: "contact", label: "Contact" },
  ];

  // Optional reCAPTCHA (off by default)
  const recaptchaSiteKey = ""; // e.g., "6Lc..." when enabled

  // Toasts, modal, draft, validation
  type Errors = { name?: string; email?: string; message?: string };
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState({ name: false, email: false, message: false });
  const errorCount = Object.values(errors).filter(Boolean).length;

  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState("");
  const [showThanks, setShowThanks] = useState(false); // success modal
  const [toast, setToast] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const DRAFT_KEY = "pvs_contact_draft_v1";
  const saveDraft = () => {
    try {
      const nameEl = document.getElementById("name") as HTMLInputElement | null;
      const emailEl = document.getElementById("email") as HTMLInputElement | null;
      const msgEl = document.getElementById("message") as HTMLTextAreaElement | null;
      const draft = {
        name: nameEl?.value || "",
        email: emailEl?.value || "",
        message: msgEl?.value || "",
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  };

  // Hydrate saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw || "{}") || {};
      const nameEl = document.getElementById("name") as HTMLInputElement | null;
      const emailEl = document.getElementById("email") as HTMLInputElement | null;
      const msgEl = document.getElementById("message") as HTMLTextAreaElement | null;
      if (nameEl && typeof (d as any).name === "string") nameEl.value = (d as any).name;
      if (emailEl && typeof (d as any).email === "string") emailEl.value = (d as any).email;
      if (msgEl && typeof (d as any).message === "string") msgEl.value = (d as any).message;
    } catch {}
  }, []);

  // Load reCAPTCHA script if enabled
  useEffect(() => {
    if (!recaptchaSiteKey) return;
    const id = "grecaptcha-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    s.async = true;
    document.head.appendChild(s);
    return () => {
      s.parentNode?.removeChild(s);
    };
  }, [recaptchaSiteKey]);

  // Copy email micro-interaction
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Smoke tests (runtime assertions)
  useEffect(() => {
    nav.forEach(({ id }) => console.assert(!!document.getElementById(id), `Missing section: #${id}`));
    console.assert(/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email), "Email appears invalid");
    // ensure unique nav ids
    const ids = new Set<string>();
    nav.forEach(({ id }) => { const before = ids.size; ids.add(id); console.assert(ids.size > before, `Duplicate id in nav: #${id}`); });
    // NEW smoke tests
    console.assert(!!document.querySelector('section#contact form'), 'Contact form missing');
    console.assert(!!document.querySelector('a[href^="mailto:"]'), 'mailto link missing');
  }, []);

  // Validation helpers
  const emailRe = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;
  const validate = (fields: { name?: string; email?: string; message?: string }) => {
    const e: Errors = {};
    if (fields.name !== undefined && !fields.name.trim()) e.name = "Please enter your name.";
    if (fields.email !== undefined && !emailRe.test(fields.email || "")) e.email = "Please enter a valid email address.";
    if (fields.message !== undefined && (fields.message || "").trim().length < 10) e.message = "Please include at least 10 characters.";
    return e;
  };

  const handleFieldBlur = (field: "name" | "email" | "message") => (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.currentTarget.value;
    const v = validate({ [field]: value } as any);
    setErrors((prev) => ({ ...prev, [field]: (v as any)[field] }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFieldInput = (field: "name" | "email" | "message") => (
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.currentTarget.value;
    const v = validate({ [field]: value } as any);
    setErrors((prev) => ({ ...prev, [field]: (v as any)[field] }));
    saveDraft();
  };

  // Formspree config
  const formspreeId = "xqaykbel";
  const formspreeEndpoint = `https://formspree.io/f/${formspreeId}`;

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    if (data.get("company")) return; // honeypot

    const name = (data.get("name") || "").toString();
    const emailVal = (data.get("email") || "").toString();
    const message = (data.get("message") || "").toString();

    const v = validate({ name, email: emailVal, message });
    setErrors(v);
    if (Object.keys(v).length) {
      setTouched({ name: true, email: true, message: true });
      setToast("Please fix the highlighted errors before submitting.");
      return;
    }

    setSubmitStatus("loading");
    setSubmitMsg("");

    // Optional reCAPTCHA
    let recaptchaToken = "";
    try {
      // @ts-ignore
      if (recaptchaSiteKey && (window as any).grecaptcha?.execute) {
        // @ts-ignore
        recaptchaToken = await (window as any).grecaptcha.execute(recaptchaSiteKey, { action: "submit" });
      }
    } catch {}

    try {
      const payload: Record<string, string> = { name, email: emailVal, message };
      if (recaptchaToken) payload["g-recaptcha-response"] = recaptchaToken;

      const resp = await fetch(formspreeEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await resp.json().catch(() => ({}));

      if (resp.ok) {
        setSubmitStatus("success");
        setSubmitMsg("Thank you—your message has been sent.");
        setToast("Message sent successfully!");
        setShowThanks(true);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        form.reset();
      } else {
        throw new Error((result as any)?.error || "Submission failed");
      }
    } catch {
      setSubmitStatus("error");
      setSubmitMsg("Sorry, something went wrong. Please email directly.");
      setToast("Submission failed — please try again.");
    }
  };

  // Toast lifecycle
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // Success modal: focus trap, no Esc, no click-out to dismiss
  useEffect(() => {
    if (!showThanks) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
        return;
      }
      const nodes = dialog?.querySelectorAll<HTMLElement>(focusableSelector);
      if (nodes && nodes.length) nodes[0].focus();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && dialog) {
        const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((n) => !n.hasAttribute("disabled"));
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
      // Esc intentionally disabled
    };
    focusFirst();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [showThanks]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar */}
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
              <a key={item.id} href={`#${item.id}`} className="hover:text-violet-600 transition-colors">
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow hover:shadow-lg transition-all"
            >
              Schedule a Consultation
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
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
            {/* brand panel only */}
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

      {/* Services */}
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

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {/* Starter */}
            <div className="rounded-2xl border border-slate-200 p-4 flex flex-col">
              <div className="font-medium text-slate-800">Starter</div>
              <div className="text-2xl font-bold mt-1">$35<span className="text-xs text-slate-500">/hr</span></div>
              <ul className="mt-3 text-slate-700 space-y-1 list-disc list-inside">
                <li>Calendar & Inbox Management</li>
                <li>Appointment Scheduling</li>
              </ul>
              <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Book Now</a>
            </div>
            {/* Professional */}
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
            {/* Premier */}
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
            {/* On-Demand */}
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 flex flex-col">
              <div className="font-medium text-slate-800">On‑Demand</div>
              <div className="text-2xl font-bold mt-1">Pay‑As‑You‑Go</div>
              <p className="mt-3 text-slate-700">Flexible support across calendar/inbox, data entry, expenses, documents, and scheduling—only pay for the time you need.</p>
              <a href="#contact" className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700">Get Started</a>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">About Premier Virtual Solutions</h2>
          <div className="mt-6 grid lg:grid-cols-3 gap-8">
            {/* Narrative */}
            <div className="lg:col-span-2 space-y-4 text-slate-700">
              <p>
                Premier Virtual Solutions was founded to provide confidential, reliable, and efficient executive assistance for leaders who value time, privacy, and efficiency. We bridge the gap between busy leaders and the dependable support they need to operate at their best, handling calendars, inboxes, expenses, and sensitive documents so they can focus on growth and impact.
              </p>
              <p>
                As your Executive Virtual Assistant, I serve as the trusted right‑hand support ensuring nothing falls through the cracks. From managing a packed calendar and inbox to drafting meeting reports and safeguarding sensitive documents, my goal is simple: create the space for you to lead confidently while I handle the details.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">What clients feel the most:</p>
                <p className="mt-1">Calendar and inbox management. It seems simple, but leaders consistently tell me it changes everything when they no longer have to dig through emails or juggle double‑booked meetings.</p>
              </div>
              <p>
                My personal motto — <span className="italic">“Set the standard, then stand on it.”</span> — guides how I show up for every client, every day.
              </p>
            </div>

            {/* At‑a‑glance */}
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

      {/* Insights */}
      <section id="insights" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
          <p className="mt-3 text-slate-700">Articles and perspectives will be shared here.</p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">Contact</h2>

          <div className="mt-8 grid lg:grid-cols-2 gap-10">
            {/* Left: thanks card or form */}
            {showThanks ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 bg-white rounded-3xl border border-green-200 p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-green-700">Thank you</h3>
                <p className="text-slate-700">Your message has been received. I will reply as soon as possible.</p>
                <div className="flex gap-3">
                  <a href={`mailto:${email}`} className="rounded-full px-6 py-3 font-semibold border border-slate-300 hover:border-violet-500 hover:text-violet-600">Email again</a>
                  <a href="#home" className="rounded-full px-6 py-3 text-white bg-violet-600 hover:bg-violet-700 font-semibold">Back to top</a>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Sticky error banner */}
                <AnimatePresence>
                  {errorCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.25 }}
                      className="sticky top-20 sm:top-24 z-10"
                    >
                      <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 shadow-sm">
                        <strong>Heads up:</strong> Please fix {errorCount} {errorCount === 1 ? "error" : "errors"} below.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleContactSubmit} action={formspreeEndpoint} method="POST" target="_top" className="space-y-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm" noValidate>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label htmlFor="name" className="text-sm font-medium">Name</label>
                      <input id="name" name="name" required aria-invalid={!!errors.name} aria-describedby="name-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.name ? "border-rose-400" : "border-slate-300"}`} placeholder="Your name" onBlur={handleFieldBlur("name")} onInput={handleFieldInput("name")} onKeyUp={saveDraft} />
                      {errors.name && <p id="name-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.name}</p>}
                    </div>
                    <div className="relative">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <input id="email" name="email" type="email" required aria-invalid={!!errors.email} aria-describedby="email-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.email ? "border-rose-400" : "border-slate-300"}`} placeholder="you@example.com" onBlur={handleFieldBlur("email")} onInput={handleFieldInput("email")} onKeyUp={saveDraft} />
                      {errors.email && <p id="email-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Honeypot field */}
                  <div className="hidden">
                    <label htmlFor="company">Company</label>
                    <input id="company" name="company" />
                  </div>

                  <div className="relative">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <textarea id="message" name="message" rows={5} required minLength={10} aria-invalid={!!errors.message} aria-describedby="msg-err" className={`mt-1 w-full rounded-xl border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.message ? "border-rose-400" : "border-slate-300"}`} placeholder="Tell me about your administrative support needs…" onBlur={handleFieldBlur("message")} onInput={handleFieldInput("message")} onKeyUp={saveDraft} />
                    {errors.message && <p id="msg-err" className="mt-1 text-xs text-rose-600" role="alert" aria-live="polite">{errors.message}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <motion.button
                      type="submit"
                      className={`rounded-full px-6 py-3 text-white font-semibold disabled:opacity-60 ${submitStatus === "success" ? "bg-green-600 hover:bg-green-700" : "bg-violet-600 hover:bg-violet-700"}`}
                      whileTap={{ scale: 0.98 }}
                      animate={submitStatus === "success" ? { scale: [1, 1.06, 1] } : {}}
                      transition={{ duration: 0.35 }}
                      disabled={submitStatus === "loading"}
                    >
                      {submitStatus === "loading" ? "Sending…" : submitStatus === "success" ? "Sent!" : "Send Message"}
                    </motion.button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`inline-flex items-center gap-1 text-sm px-3 py-2 rounded-full border hover:border-violet-500 hover:text-violet-600 ${copied ? "border-green-300 bg-green-50" : "border-slate-300"}`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                          <motion.span
                            key="copied"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.18 }}
                            className="inline-flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-green-600"><path d="M16.5 7.5l-6.5 6.5-2.5-2.5L6 13l4 4 8-8-1.5-1.5z" /></svg>
                            <span>Copied!</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.18 }}
                            className="inline-flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0V3a1 1 0 011-1h2a1 1 0 011 1v2H9z" /></svg>
                            <span>Copy Email</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>

                    {submitMsg && (
                      <span className={`text-sm ${submitStatus === "success" ? "text-green-600" : submitStatus === "error" ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">{submitMsg}</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">This form submits securely to Formspree (Form ID: {formspreeId}).</p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem(DRAFT_KEY);
                        (document.getElementById("name") as HTMLInputElement).value = "";
                        (document.getElementById("email") as HTMLInputElement).value = "";
                        (document.getElementById("message") as HTMLTextAreaElement).value = "";
                        setErrors({});
                        setTouched({ name: false, email: false, message: false });
                        setToast("Draft cleared");
                        setSubmitStatus("idle");
                      } catch {}
                    }}
                    className="mt-2 text-xs text-rose-600 underline"
                  >
                    Clear draft
                  </button>

                  {recaptchaSiteKey && (
                    <p className="text-xs text-slate-500">
                      reCAPTCHA is enabled and protected by the Google <a className="underline" href="https://policies.google.com/privacy">Privacy Policy</a> and <a className="underline" href="https://policies.google.com/terms">Terms of Service</a>.
                    </p>
                  )}
                </form>
              </>
            )}

            {/* Right: contact info */}
            <div className="space-y-3 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Email:</span>
                <span className="ml-2 text-violet-700 break-all">{email}</span>
                <motion.button
                  onClick={handleCopy}
                  className={`ml-1 inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border hover:border-violet-500 hover:text-violet-600 ${copied ? "border-green-300 bg-green-50" : "border-slate-300"}`}
                  animate={copied ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ duration: 0.35 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span key="copied2" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }} className="inline-flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-green-600"><path d="M16.5 7.5l-6.5 6.5-2.5-2.5L6 13l4 4 8-8-1.5-1.5z" /></svg>
                        <span>Copied!</span>
                      </motion.span>
                    ) : (
                      <motion.span key="copy2" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }} className="inline-flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0V3a1 1 0 011-1h2a1 1 0 011 1v2H9z" /></svg>
                        <span>Copy</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
              <div>
                <span className="font-medium">Hours:</span> Evenings and weekends
              </div>
              <div>
                <span className="font-medium">Support Mode:</span> 100% Virtual
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiny Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            className={`fixed bottom-6 right-6 z-[70] rounded-xl text-white text-sm px-4 py-2 shadow-lg ${toast.includes("successfully") ? "bg-green-600" : toast.includes("failed") ? "bg-rose-600" : toast.includes("Please fix") ? "bg-amber-500" : "bg-gradient-to-r from-violet-600 to-fuchsia-600"}`}
            role="status"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2">{
              toast.includes("successfully") ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-white"><path d="M16.5 7.5l-6.5 6.5-2.5-2.5L6 13l4 4 8-8-1.5-1.5z" /></svg>
              ) : toast.includes("failed") ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-white"><path d="M6 18L18 6M6 6l12 12" /></svg>
              ) : toast.includes("Please fix") ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-white"><path d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-white"><circle cx="12" cy="12" r="10" /></svg>
              )
            }<span className="sr-only">{toast.includes("successfully") ? "Success:" : toast.includes("failed") ? "Error:" : toast.includes("Please fix") ? "Warning:" : "Info:"}</span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal (non-dismissable except Close button) */}
      <AnimatePresence>
        {showThanks && (
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-slate-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              ref={modalRef}
              aria-labelledby="thanks-title"
              className="relative w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-6"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <h3 id="thanks-title" className="text-xl font-semibold">Thank you</h3>
              <p className="mt-2 text-slate-700">Your message has been sent successfully. I’ll reply as soon as possible.</p>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center rounded-full px-5 py-2 text-sm font-medium border border-slate-300 hover:border-violet-500 hover:text-violet-600"
                >
                  Email again
                </a>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={() => setShowThanks(false)}
                  className="inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
