import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
          <p>
            Welcome to ShoeBudgeting. This Privacy Policy explains how Shoetinblanks LLC (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) 
            collects, uses, and discloses information about you when you use the ShoeBudgeting platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
          <p className="mb-2">We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (name, email address, password)</li>
            <li>Financial information you manually input (expenses, income sources)</li>
            <li>Check stub images uploaded for OCR processing (processed client-side, never stored on our servers)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. How We Handle Financial Data</h2>
          <p className="mb-2">
            ShoeBudgeting is designed to help you manage your personal finances. We take the privacy and security 
            of your financial data extremely seriously.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your financial data is stored securely using Supabase and is protected by Row Level Security (RLS), ensuring only your authenticated account can access your data.</li>
            <li><strong>Plaid Integration:</strong> We use Plaid Inc. (&quot;Plaid&quot;) to connect your ShoeBudgeting account with your bank account, credit card, or other financial accounts. By using our service, you grant Shoetinblanks LLC and Plaid the right, power, and authority to act on your behalf to access and transmit your personal and financial information from the relevant financial institution. You agree to your personal and financial information being transferred, stored, and processed by Plaid in accordance with the Plaid Privacy Policy.</li>
            <li><strong>OCR Check Stubs:</strong> Any check stubs or images you upload for automatic parsing are processed securely on your own device (client-side) using Tesseract.js. These images are <strong>never</strong> transmitted to or stored on our servers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Use of Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, including providing 
            personalized financial dashboards, tracking your budget, and syncing your bank transactions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Contact Us</h2>
          <p>
            ShoeBudgeting is a service provided by Shoetinblanks LLC. If you have any questions about this Privacy Policy, 
            please contact us at the appropriate support channels provided by Shoetinblanks LLC.
          </p>
        </section>
      </div>
    </div>
  );
}
