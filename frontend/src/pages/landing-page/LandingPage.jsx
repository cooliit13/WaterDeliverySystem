import React, { useState } from "react";
import { Link } from "react-router-dom";

// images imported from src (not public)
import bannerImg from "../../assets/pictures/banners/more a banner of watter refilling.jpg";
// product images (front/back)
import bottleFront from "../../assets/pictures/BOTTLES/590500769_1626201502081765_2531155977572808270_n.png";
import bottleBack from "../../assets/pictures/BOTTLES/590182432_1378158400632197_3293300031910595920_n.png";
// about image
import truckImg from "../../assets/pictures/banners/a (1).png";
// logo
import logoImg from "../../assets/pictures/LOGO/AcquaLogo.png";

export default function LandingPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [chars, setChars] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    if (name === "message") setChars(value.length);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Message sent (stub). Replace with API call");
  };

  // smooth scrolling for nav
  const scrollTo = (id) => (e) => {
    e && e.preventDefault();
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="font-sans text-gray-800">
      {/* NAV (Login/Register present in header only) */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="Water Refill Logo" className="w-10 h-10 object-contain" />
              <div className="text-blue-600 font-bold text-lg">Water Refill</div>
            </div>

            {/* Nav with smooth scroll */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" onClick={scrollTo("#home")} className="hover:text-blue-600 transition-colors">Home</a>
              <a href="#about" onClick={scrollTo("#about")} className="hover:text-blue-600 transition-colors">About</a>
              <a href="#services" onClick={scrollTo("#services")} className="hover:text-blue-600 transition-colors">Services</a>
              <a href="#contact" onClick={scrollTo("#contact")} className="hover:text-blue-600 transition-colors">Contact</a>
            </nav>

            {/* Right side: Login/Register in header */}
            <div className="flex items-center space-x-4">
              <Link to="/auth/login" className="text-sm">
                <button className="text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-50 transition">Login</button>
              </Link>
              <Link to="/auth/register" className="hidden md:inline-block">
                <button className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:bg-blue-600 transition">Register</button>
              </Link>

              {/* Mobile menu placeholder */}
              <div className="md:hidden"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* HERO */}
        <section id="home" className="relative overflow-hidden">
          {/* background image behind everything (including header) */}
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bannerImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              height: "520px",
            }}
          />

          {/* overlay to highlight content (tweak opacity) */}
          <div className="absolute inset-0 -z-10 bg-white/30" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <span className="inline-block bg-white/80 text-blue-600 px-4 py-1 rounded-full text-sm mb-4">Local Water Delivery Startup</span>

                <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mt-4">
                  Fresh Water Delivered
                  <br />
                  <span className="text-blue-600">To Your Door</span>
                </h1>

                <p className="text-slate-700 mt-6 max-w-xl text-lg">
                  Premium mineral, alkaline, and purified drinking water delivered fast to your local area. Enjoy the best water delivery service in town.
                </p>

                {/* NOTE: View Services removed from hero; Login present in header */}
                <p className="text-sm text-slate-600 mt-6">Serving your community with clean water — fast, safe, and always reliable.</p>
              </div>

              {/* Product card on right with layered hover effect (Product badge, small badge removed) */}
              <div className="lg:col-span-5 flex justify-end">
                <div className="relative w-72 lg:w-80 mt-6 lg:mt-0">
                  <div className="absolute -top-6 -left-6 bg-white rounded-full px-4 py-2 shadow-md text-xs font-semibold text-blue-600">
                    Product
                  </div>

                  {/* container providing perspective for a 3D-like hover */}
                  <div className="relative group w-full h-[320px] lg:h-[360px]">

                    {/* BACK IMAGE (slightly offset & moves on hover) */}
                    <div
                      className="absolute left-0 top-8 w-56 lg:w-64 h-[220px] lg:h-[260px] overflow-hidden
                                 transform transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                      aria-hidden="true"
                    >
                      <img
                        src={bottleFront}
                        alt="Water jug back layer"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* FRONT IMAGE */}
                    <div
                      className="absolute left-4 top-0 w-60 lg:w-64 h-[240px] lg:h-[300px] overflow-hidden transition-all duration-500
                                 group-hover:-translate-y-3 group-hover:scale-[1.03] group-hover:rotate-[1deg]"
                      role="img"
                      aria-label="Water jug front view"
                    >
                      <img
                        src={bottleBack}
                        alt="Water jug front view"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* (small badges removed) */}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm text-blue-600">Our Services</p>
              <h2 className="text-3xl font-bold">Premium Water Types & <span className="text-blue-600">Local Delivery</span></h2>
              <p className="text-gray-500 mt-3 max-w-2xl mx-auto">Choose from our selection of premium water types and enjoy the convenience of local delivery. We make it easy to get the best water delivered to your door.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Mineral Water', desc: 'Natural mineral water rich in essential nutrients for your health and wellness.', bullets: ['Natural minerals','Health benefits','Great taste'] },
                { title: 'Alkaline Water', desc: "pH balanced alkaline water to help maintain your body's natural balance.", bullets: ['pH 8.5-9.5','Antioxidant properties','Better hydration'] },
                { title: 'Purified Water', desc: 'Ultra-pure water filtered through advanced purification systems.', bullets: ['99.9% pure','No contaminants','Crisp clean taste'] },
                { title: 'Local Delivery', desc: 'Fast and reliable delivery service right to your neighborhood.', bullets: ['Same-day delivery','Local coverage','Flexible scheduling'] },
                { title: 'Easy Ordering', desc: 'Simple online platform to order your favorite water with just a few clicks.', bullets: ['User-friendly app','Quick checkout','Order tracking'] },
                { title: 'Customer Support', desc: '24/7 customer support to help you with orders and delivery questions.', bullets: ['24/7 support','Live chat','Quick response'] },
              ].map((s, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl bg-white/75 border border-white/30 shadow-sm transition-transform duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 7 7 7 11.5C7 15.9853 10.5817 19 12 19C13.4183 19 17 15.9853 17 11.5C17 7 12 2 12 2Z" stroke="#3182CE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{s.desc}</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {s.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 text-blue-600">✔</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-gradient-to-r from-blue-500 to-cyan-400 p-10 rounded-xl text-white text-center shadow-lg">
              <h3 className="text-xl font-bold">Ready to Start Your Water Delivery?</h3>
              <p className="mt-2 text-sm max-w-xl mx-auto">Join thousands of local customers who trust Water Refill for their daily hydration needs. Order now and experience the difference.</p>
              <div className="mt-6">
                <div className="text-white font-semibold text-base mt-4">Place Your First Order</div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6">
                <p className="text-sm text-blue-600">About Water Refill</p>
                <h2 className="text-3xl font-bold mt-2">Your Local Water <span className="text-blue-600">Delivery Startup</span></h2>
                <p className="mt-4 text-slate-600">Water Refill is a local e-commerce startup dedicated to bringing you the finest drinking water. We specialize in mineral, alkaline, and purified water delivery right to your doorstep. Our mission is simple: provide the best water delivery service in your local area with unmatched convenience and quality.</p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">💧</div>
                    <div>
                      <div className="font-semibold">Premium Quality</div>
                      <div className="text-sm text-slate-500">Mineral, alkaline, and purified water options</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">🚚</div>
                    <div>
                      <div className="font-semibold">Fast Local Delivery</div>
                      <div className="text-sm text-slate-500">Quick delivery service in your neighborhood</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">🛒</div>
                    <div>
                      <div className="font-semibold">Easy Online Ordering</div>
                      <div className="text-sm text-slate-500">Order through our simple e-commerce platform</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden shadow-xl bg-white">
                  <img src={truckImg} alt="delivery truck" className="w-full h-80 object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm text-blue-600">Contact Us</p>
              <h2 className="text-2xl font-bold">Get In Touch <span className="text-blue-600">For Water Delivery</span></h2>
              <p className="text-sm text-slate-500 mt-2">Ready to start your water delivery service? Contact us today for a free quote and experience the difference of pure, clean water.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold">Contact Information</h4>
                    <p className="text-sm text-slate-500 mt-3">Reach us at the details below or send a message using the form.</p>
                  </div>

                  <ul className="space-y-4 mt-4">
                    <li className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">📍</div>
                      <div>
                        <div className="font-semibold text-sm">Address</div>
                        <div className="text-sm text-slate-500">123 Water Street, Clean City, CC 12345</div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">📞</div>
                      <div>
                        <div className="font-semibold text-sm">Phone</div>
                        <div className="text-sm text-slate-500">+1 (555) 123-4567</div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">✉️</div>
                      <div>
                        <div className="font-semibold text-sm">Email</div>
                        <div className="text-sm text-slate-500">info@waterrefill.com</div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">⏰</div>
                      <div>
                        <div className="font-semibold text-sm">Business Hours</div>
                        <div className="text-sm text-slate-500">Mon - Fri: 8:00 AM - 6:00 PM<br/>Sat - Sun: 9:00 AM - 4:00 PM</div>
                      </div>
                    </li>
                  </ul>

                  <div className="mt-6">
                    <div className="rounded-lg overflow-hidden shadow-md">
                      <iframe title="map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1973.6845201669053!2d125.09494805861134!3d8.163920993915811!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32ffdd4c41df0677%3A0xe78f7e08adbcbb40!2sSan%20Jose%2C%20Malaybalay%20City%2C%20Bukidnon!5e0!3m2!1sen!2sph!4v1731600000000!5m2!1sen!2sph" width="100%" height="220" style={{ border: 0 }} loading="lazy" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="font-semibold text-lg mb-4">Send us a Message</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input name="name" value={form.name} onChange={handleChange} required placeholder="Enter your full name" className="border border-slate-200 rounded-md px-4 py-2" />
                      <input name="email" value={form.email} onChange={handleChange} required placeholder="Enter your email address" className="border border-slate-200 rounded-md px-4 py-2" />
                    </div>

                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Enter your phone number" className="border border-slate-200 rounded-md px-4 py-2 w-full" />

                    <div>
                      <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your water delivery needs..." rows={5} className="border border-slate-200 rounded-md px-4 py-2 w-full" maxLength={500} />
                      <div className="text-right text-xs text-slate-400 mt-1">{chars}/500 characters</div>
                    </div>

                    <div>
                      <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-full shadow hover:bg-blue-700">✈ Send Message</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-900 text-slate-300 py-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center">💧</div>
                  <div className="text-white font-semibold">Water Refill</div>
                </div>
                <p className="text-sm text-slate-400">Providing premium quality water delivery services with a commitment to purity, reliability, and customer satisfaction.</p>
                <div className="flex space-x-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">f</div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">t</div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">i</div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>Home</li>
                  <li>About Us</li>
                  <li>Services</li>
                  <li>Contact</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">Our Services</h4>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>Water Delivery</li>
                  <li>Bottle Refill</li>
                  <li>Quality Testing</li>
                  <li>24/7 Support</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">Contact Info</h4>
                <p className="text-sm text-slate-400">123 Water Street, Clean City, CC 12345</p>
                <p className="text-sm text-slate-400 mt-2">+1 (555) 123-4567</p>
                <p className="text-sm text-slate-400 mt-2">info@waterrefill.com</p>
              </div>
            </div>

            <div className="border-t border-slate-800 mt-8 pt-6 text-sm text-slate-500 flex items-center justify-between">
              <div>© 2024 Water Refill. All rights reserved.</div>
              <div className="space-x-4">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
