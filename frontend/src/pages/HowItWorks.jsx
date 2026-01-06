import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="How It Works - BantuBuzz"
        description="Learn how BantuBuzz connects creators with brands through our simple 4-step collaboration process."
        keywords="how bantubuzz works, creator collaboration, influencer marketing process"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">How BantuBuzz Works</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Simple, transparent collaboration in four easy steps
          </p>
        </div>
      </section>

      {/* For Creators Section */}
      <section className="section-padding">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">For Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-dark mb-2">Create Your Profile</h3>
              <p className="text-gray-600 text-sm">
                Sign up and build your profile showcasing your content, audience, and style. Upload your best work to your portfolio.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-dark mb-2">Set Your Packages</h3>
              <p className="text-gray-600 text-sm">
                Create service packages with your rates for different types of content - posts, stories, reels, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-dark mb-2">Get Booked</h3>
              <p className="text-gray-600 text-sm">
                Brands discover your profile and book your packages. Review requests, accept bookings, and start creating.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-semibold text-dark mb-2">Get Paid</h3>
              <p className="text-gray-600 text-sm">
                Complete the work, submit for review, and receive payment directly to your wallet. Fast, secure, and transparent.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/register/creator" className="btn btn-primary">
              Start as a Creator
            </Link>
          </div>
        </div>
      </section>

      {/* For Brands Section */}
      <section className="bg-white py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">For Brands</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-dark mb-2">Find Creators</h3>
              <p className="text-gray-600 text-sm">
                Browse our curated database of verified African creators. Filter by niche, audience size, location, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-dark mb-2">Book Packages</h3>
              <p className="text-gray-600 text-sm">
                Select the package that fits your campaign needs and book directly. Clear pricing with no hidden fees.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-dark mb-2">Collaborate</h3>
              <p className="text-gray-600 text-sm">
                Communicate directly with creators, share briefs, and review content before it goes live. Full transparency.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-semibold text-dark mb-2">Track Results</h3>
              <p className="text-gray-600 text-sm">
                Monitor campaign performance and ROI. Build long-term relationships with creators who deliver results.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/register/brand" className="btn btn-primary">
              Start as a Brand
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-light">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-dark mb-2">Secure Payments</h3>
              <p className="text-gray-600 text-sm">
                Escrow protection ensures creators get paid and brands get quality content. Payments held safely until work is approved.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-dark mb-2">Direct Messaging</h3>
              <p className="text-gray-600 text-sm">
                Built-in chat system for seamless communication. Discuss campaign details, share assets, and provide feedback.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-dark mb-2">Verified Profiles</h3>
              <p className="text-gray-600 text-sm">
                All creators and brands are verified to ensure authenticity. Work with confidence knowing everyone is who they say they are.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="container-custom max-w-3xl">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-dark mb-2">How much does BantuBuzz charge?</h3>
              <p className="text-gray-600 text-sm">
                BantuBuzz takes a small service fee from each transaction to maintain the platform. Creators set their own rates and keep the majority of their earnings.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-dark mb-2">How long does it take to get paid?</h3>
              <p className="text-gray-600 text-sm">
                Once a brand approves your completed work, funds are released to your wallet. You can then request a cashout, which is processed within 3-5 business days.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-dark mb-2">What if there's a dispute?</h3>
              <p className="text-gray-600 text-sm">
                Our support team is here to help resolve any issues between creators and brands. We review all evidence and work towards a fair resolution.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-dark mb-2">Can I work with international brands?</h3>
              <p className="text-gray-600 text-sm">
                Yes! While we're based in Africa, brands from anywhere in the world can work with our creators. All payments are processed in USD for simplicity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
