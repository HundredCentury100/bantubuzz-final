import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Privacy Policy - BantuBuzz"
        description="Read BantuBuzz's privacy policy to understand how we collect, use, and protect your personal information."
        keywords="privacy policy, data protection, user privacy, bantubuzz"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container-custom">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg opacity-90">Last updated: January 6, 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12 space-y-8">
            {/* Introduction */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                At BantuBuzz, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully to understand our practices regarding your personal data.
              </p>
            </div>

            {/* Information We Collect */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Information We Collect</h2>
              <h3 className="text-xl font-semibold text-dark mb-3">Personal Information</h3>
              <p className="text-gray-700 mb-3">When you register on BantuBuzz, we collect:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Name and username</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Profile information (bio, location, social media links)</li>
                <li>Payment information (for processing transactions)</li>
                <li>Portfolio content and media files</li>
              </ul>

              <h3 className="text-xl font-semibold text-dark mb-3 mt-6">Automatically Collected Information</h3>
              <p className="text-gray-700 mb-3">We automatically collect certain information when you use our platform:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-3">We use the collected information for:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Providing and maintaining our services</li>
                <li>Processing transactions and payments</li>
                <li>Communicating with you about bookings and platform updates</li>
                <li>Improving and personalizing your experience</li>
                <li>Preventing fraud and ensuring platform security</li>
                <li>Complying with legal obligations</li>
                <li>Sending marketing communications (with your consent)</li>
              </ul>
            </div>

            {/* Information Sharing */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-3">We may share your information with:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Other Users:</strong> Your profile information is visible to brands/creators when you interact on the platform</li>
                <li><strong>Service Providers:</strong> Third-party companies that help us provide our services (payment processors, hosting providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We do not sell your personal information to third parties for their marketing purposes.
              </p>
            </div>

            {/* Data Security */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-3">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your personal data</li>
                <li>Object to or restrict certain processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-700 mt-3">
                To exercise these rights, please contact us at support@bantubuzz.com.
              </p>
            </div>

            {/* Cookies */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent. However, some features of our platform may not function properly without cookies.
              </p>
            </div>

            {/* Third-Party Links */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Third-Party Links</h2>
              <p className="text-gray-700 leading-relaxed">
                Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites and encourage you to review their privacy policies.
              </p>
            </div>

            {/* Children's Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </div>

            {/* Changes to Policy */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-primary/10 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-dark mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-3">
                If you have any questions about this Privacy Policy, please contact us:
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

export default PrivacyPolicy;
