'use client';

import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }
    toast.success("Thank you! Your message has been sent to our concierge team.");
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800">
            <Sparkles className="h-3.5 w-3.5 text-yellow-600" /> Concierge & Inquiries
          </span>
          <h2 className="text-4xl font-black tracking-tight text-green-950 md:text-5xl">
            Get in Touch
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Have a question about a reservation, private event or menu item? We are here to help.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Contact Info Card */}
          <motion.div
            className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="mb-6 text-2xl font-extrabold text-green-950">
              Restaurant Information
            </h3>
            <div className="space-y-6 text-sm text-gray-700">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200/60">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Headquarters</p>
                  <p className="text-gray-500">
                    Plot 45, Block C, Gulshan-e-Iqbal, Karachi, Sindh 75300
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200/60">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Direct Line</p>
                  <p className="text-gray-500">+92 21 3456 7890</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200/60">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Support Email</p>
                  <p className="text-gray-500">support@easyserve.pk</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200/60">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Operating Hours</p>
                  <p className="text-gray-500">
                    Mon – Thu: 5:00 PM – 10:00 PM<br />
                    Fri – Sat: 5:00 PM – 11:00 PM<br />
                    Sun: 4:00 PM – 9:00 PM
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-gray-200/80 bg-white p-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h3 className="mb-2 text-2xl font-extrabold text-green-950">
              Send us a Message
            </h3>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20"
              required
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20"
              required
            />
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Subject (Optional)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Your Message"
              rows="4"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20"
              required
            />

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-950 py-3.5 text-sm font-bold text-yellow-400 shadow-lg transition-all hover:bg-green-900 active:scale-[0.98]"
            >
              <Send size={16} />
              Send Message
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
