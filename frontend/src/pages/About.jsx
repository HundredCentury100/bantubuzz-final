import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const About = () => {
  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="About Us - BantuBuzz"
        description="Learn about BantuBuzz, Africa's premier creator-brand collaboration platform connecting talent with opportunity."
        keywords="about bantubuzz, african creators, influencer marketing, brand collaborations"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="container-custom">
          <h1 className="text-5xl font-bold mb-4">About BantuBuzz</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            Empowering African creators and connecting them with brands that value their unique voice.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-dark mb-4">Our Mission</h2>
              <p className="text-gray-600 mb-4">
                BantuBuzz was founded with a simple yet powerful mission: to bridge the gap between African content creators and brands seeking authentic connections with their audiences.
              </p>
              <p className="text-gray-600 mb-4">
                We believe that every creator deserves fair opportunities and every brand deserves genuine partnerships. Our platform makes collaboration seamless, transparent, and rewarding for all parties.
              </p>
              <p className="text-gray-600">
                From Zimbabwe to the rest of Africa and beyond, we're building a community where creativity meets opportunity.
              </p>
            </div>
            <div className="bg-primary/10 p-8 rounded-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark mb-2">Creator-First</h3>
                    <p className="text-gray-600 text-sm">We put creators at the heart of everything we do, ensuring fair compensation and transparent processes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark mb-2">Trusted Platform</h3>
                    <p className="text-gray-600 text-sm">Secure payments, verified profiles, and dispute resolution to protect both creators and brands.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark mb-2">Growth Focused</h3>
                    <p className="text-gray-600 text-sm">Tools and analytics to help creators grow their brand and brands measure their impact.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-white py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="font-semibold text-dark mb-2">Authenticity</h3>
              <p className="text-gray-600 text-sm">We value genuine connections and real stories over manufactured content.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="font-semibold text-dark mb-2">Empowerment</h3>
              <p className="text-gray-600 text-sm">Giving creators the tools and opportunities to build sustainable careers.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="font-semibold text-dark mb-2">Community</h3>
              <p className="text-gray-600 text-sm">Building a supportive ecosystem where everyone can thrive together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-light">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-gray-600">Active Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100+</div>
              <div className="text-gray-600">Brand Partners</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-gray-600">Collaborations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5+</div>
              <div className="text-gray-600">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Join the BantuBuzz Community</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Whether you're a creator looking for opportunities or a brand seeking authentic partnerships, we're here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register/creator"
              className="btn bg-white text-primary hover:bg-gray-100"
            >
              Sign Up as Creator
            </a>
            <a
              href="/register/brand"
              className="btn bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary"
            >
              Sign Up as Brand
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
