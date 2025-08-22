export default function Contact() {
  return (
    <section className="section">
      <div className="container-outer max-w-3xl">
        <h1 className="h1 mb-6">Contact Us</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="font-medium mb-2">Location</div>
            <p>Arborfield Rd, Barkham, Wokingham (example)</p>
            <div className="mt-4 h-48 bg-bull-green/10 rounded-lg" />
          </div>
          <form className="card p-6 grid gap-4">
            <div>
              <label className="block text-sm mb-1">Your name</label>
              <input className="w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" className="w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Message</label>
              <textarea rows="4" className="w-full rounded-md border px-3 py-2" />
            </div>
            <button type="button" className="btn btn-primary">Send</button>
            <p className="text-xs text-black/60">Phase 1 placeholder form.</p>
          </form>
        </div>
      </div>
    </section>
  )
}
