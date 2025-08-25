// client/src/pages/Contact.jsx
export default function Contact() {
  return (
    <section className="section">
      <div className="container-outer max-w-3xl">
        <h1 className="h1 mb-6">Contact Us</h1>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Address */}
          <div className="card p-5">
            <h2 className="font-serif text-lg mb-2">Visit Us</h2>
            <p className="text-black/80">
              The Bull Barkham <br />
              Barkham Rd <br />
              Wokingham <br />
              RG41 4TL
            </p>
          </div>

          {/* Phone / Email */}
          <div className="card p-5">
            <h2 className="font-serif text-lg mb-2">Call or Email</h2>
            <p className="text-black/80">📞 <a href="tel:+01183049428" className="link">+01183049428</a></p>
            <p className="text-black/80">📧 <a href="mailto:bull@thebullbarkham.co.uk" className="link">bull@thebullbarkham.co.uk</a></p>
          </div>
        </div>

        {/* Opening hours */}
        <div className="card p-5 mt-6">
          <h2 className="font-serif text-lg mb-2">Opening Hours</h2>
          <ul className="text-black/80 space-y-1">
            <li>Mon – Thu: 12:00 – 10:00 PM</li>
            <li>Fri – Sat: 12:00 – 11:00 PM</li>
            <li>Sunday: 12:00 – 9:00 PM</li>
          </ul>
        </div>

        {/* Map */}
        <div className="mt-8">
          <iframe
            title="The Bull Barkham location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2252.762800476834!2d-0.8833703238796078!3d51.39599991883607!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487683b074238991%3A0xa68f2d317ffe601e!2sThe%20Bull!5e1!3m2!1sen!2suk!4v1756142070685!5m2!1sen!2suk"
            className="w-full h-64 rounded-lg border border-black/10"
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </section>
  )
}
