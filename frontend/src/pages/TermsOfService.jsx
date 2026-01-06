import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Terms of Service - BantuBuzz"
        description="Read BantuBuzz's terms of service to understand the rules and guidelines for using our platform."
        keywords="terms of service, user agreement, terms and conditions, bantubuzz"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container-custom">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-lg opacity-90">Last updated: January 6, 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12 space-y-8">
            {/* Introduction */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using BantuBuzz, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </div>

            {/* Eligibility */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">2. Eligibility</h2>
              <p className="text-gray-700 mb-3">To use BantuBuzz, you must:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </div>

            {/* User Accounts */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-dark mb-3">Account Types</h3>
              <p className="text-gray-700 mb-3">BantuBuzz offers two types of accounts:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Creator Accounts:</strong> For content creators offering services</li>
                <li><strong>Brand Accounts:</strong> For businesses seeking creator partnerships</li>
              </ul>

              <h3 className="text-xl font-semibold text-dark mb-3 mt-6">Account Responsibilities</h3>
              <p className="text-gray-700 mb-3">You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Maintaining the confidentiality of your account</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your profile information is accurate and up-to-date</li>
              </ul>
            </div>

            {/* Creator Obligations */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">4. Creator Obligations</h2>
              <p className="text-gray-700 mb-3">As a creator, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Provide services as described in your packages</li>
                <li>Deliver work on time and to the agreed specifications</li>
                <li>Communicate professionally with brands</li>
                <li>Only showcase content you have the rights to display</li>
                <li>Disclose sponsored content in accordance with applicable laws</li>
                <li>Maintain accurate follower counts and engagement metrics</li>
              </ul>
            </div>

            {/* Brand Obligations */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">5. Brand Obligations</h2>
              <p className="text-gray-700 mb-3">As a brand, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Provide clear and accurate campaign briefs</li>
                <li>Make timely payments for completed work</li>
                <li>Respect intellectual property rights of creators</li>
                <li>Communicate professionally and respectfully</li>
                <li>Honor agreed-upon terms in booking agreements</li>
                <li>Not request services outside the scope of booked packages</li>
              </ul>
            </div>

            {/* Payments and Fees */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">6. Payments and Fees</h2>
              <h3 className="text-xl font-semibold text-dark mb-3">Service Fees</h3>
              <p className="text-gray-700 mb-3">
                BantuBuzz charges a service fee on all transactions. The current fee structure is available on our platform and may be updated with notice to users.
              </p>

              <h3 className="text-xl font-semibold text-dark mb-3 mt-4">Payment Processing</h3>
              <p className="text-gray-700 mb-3">
                Payments are held in escrow until work is completed and approved. Funds are released to creators according to our payment schedule, typically within 30 days of completion for quality assurance.
              </p>

              <h3 className="text-xl font-semibold text-dark mb-3 mt-4">Refunds</h3>
              <p className="text-gray-700">
                Refunds are handled on a case-by-case basis. If work is not delivered as described or disputes arise, contact our support team for resolution.
              </p>
            </div>

            {/* Content and Intellectual Property */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">7. Content and Intellectual Property</h2>
              <h3 className="text-xl font-semibold text-dark mb-3">Your Content</h3>
              <p className="text-gray-700 mb-3">
                You retain ownership of all content you upload to BantuBuzz. By uploading content, you grant us a worldwide, non-exclusive license to use, display, and distribute your content for the purpose of operating the platform.
              </p>

              <h3 className="text-xl font-semibold text-dark mb-3 mt-4">Prohibited Content</h3>
              <p className="text-gray-700 mb-3">You may not upload content that:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Infringes on intellectual property rights</li>
                <li>Contains hate speech, harassment, or discrimination</li>
                <li>Is sexually explicit or promotes illegal activities</li>
                <li>Violates any applicable laws or regulations</li>
              </ul>
            </div>

            {/* Prohibited Activities */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">8. Prohibited Activities</h2>
              <p className="text-gray-700 mb-3">Users may not:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Use the platform for fraudulent purposes</li>
                <li>Manipulate metrics or engagement numbers</li>
                <li>Circumvent platform fees by conducting transactions off-platform</li>
                <li>Share account credentials with others</li>
                <li>Use automated bots or scripts</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Attempt to gain unauthorized access to the platform</li>
              </ul>
            </div>

            {/* Termination */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violations of these Terms of Service. You may also terminate your account at any time through your account settings. Upon termination, pending transactions will be completed according to our policies.
              </p>
            </div>

            {/* Disclaimers */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">10. Disclaimers and Limitation of Liability</h2>
              <p className="text-gray-700 mb-3">
                BantuBuzz is provided "as is" without warranties of any kind. We do not guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Uninterrupted or error-free service</li>
                <li>Specific results from using the platform</li>
                <li>The quality or outcomes of creator-brand collaborations</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
              </p>
            </div>

            {/* Dispute Resolution */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">11. Dispute Resolution</h2>
              <p className="text-gray-700 leading-relaxed">
                If disputes arise between users, we encourage resolution through our platform's messaging system and support team. For unresolved disputes, parties agree to seek resolution through mediation before pursuing legal action.
              </p>
            </div>

            {/* Governing Law */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service are governed by the laws of Zimbabwe. Any legal actions or proceedings shall be brought exclusively in the courts of Zimbabwe.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-primary/10 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-dark mb-4">13. Contact Information</h2>
              <p className="text-gray-700 mb-3">
                For questions about these Terms of Service, contact us:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Email:</strong> support@bantubuzz.com</li>
                <li><strong>Location:</strong> Harare, Zimbabwe</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfService;
