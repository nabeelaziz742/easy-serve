'use client';

import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted:', form);
    // Here you can integrate with backend or email service
  };

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-blue-700 mb-6">Contact Information</h2>
          <div className="space-y-5 text-gray-700">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-yellow-500 mt-1" />
              <p>
                Plot 45, Block C
                <br /> Gulshan-e-Iqbal
                <br /> Karachi, Sindh 75300
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-yellow-500" />
              <p>+92 21 3456 7890</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-yellow-500" />
              <p>aishashabbirdatasci207@gmail.com</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-500 mt-1" />
              <p>
                Monday - Thursday: 5:00 PM - 10:00 PM
                <br /> Friday - Saturday: 5:00 PM - 11:00 PM
                <br /> Sunday: 4:00 PM - 9:00 PM
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-blue-700 mb-2">Send us a Message</h2>

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your Name"
            className="w-full p-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Your Email"
            className="w-full p-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Subject"
            className="w-full p-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Your Message"
            rows="4"
            className="w-full p-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-green-900 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors"
          >
            Send Message
          </button>
        </motion.form>
      </div>
    </section>
  );
}
