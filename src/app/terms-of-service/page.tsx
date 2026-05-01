import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using the ShoeBudgeting platform, you agree to be bound by these Terms of Service. 
            ShoeBudgeting is a service provided by Shoetinblanks LLC (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). If you disagree with 
            any part of the terms, you may not access the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
          <p>
            ShoeBudgeting provides personal finance management tools, including budget tracking, expense categorization, 
            paycheck analytics, and bank account synchronization via third-party providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Third-Party Services (Plaid)</h2>
          <p>
            To use the bank synchronization features of our service, you must connect your bank accounts via Plaid Inc. 
            By doing so, you acknowledge and agree that such services are governed by Plaid&apos;s terms and conditions. 
            Shoetinblanks LLC is not responsible for any errors, delays, or issues arising from Plaid&apos;s services or your 
            financial institution.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept 
            responsibility for any and all activities or actions that occur under your account. You must notify us 
            immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Disclaimer of Financial Advice</h2>
          <p>
            ShoeBudgeting and Shoetinblanks LLC do not provide professional financial, legal, or tax advice. The platform 
            is intended for informational and organizational purposes only. You should consult with a licensed professional 
            for specific financial advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
          <p>
            In no event shall Shoetinblanks LLC, nor its directors, employees, partners, agents, suppliers, or affiliates, 
            be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, 
            loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or 
            inability to access or use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact Shoetinblanks LLC.
          </p>
        </section>
      </div>
    </div>
  );
}
