import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

const SuccessStories = () => {
  const stories = [
    {
      name: "Tadiwa M.",
      role: "Fashion & Lifestyle Creator",
      location: "Harare, Zimbabwe",
      achievement: "From 5K to 50K followers in 6 months",
      story: "BantuBuzz helped me turn my passion for fashion into a full-time career. I've worked with over 20 local and international brands, and my income has grown by 400%. The platform's professional tools and fair payment system gave me the confidence to pursue content creation seriously.",
      earnings: "$12,000+",
      collaborations: "25+",
      avatar: "T"
    },
    {
      name: "Chipo K.",
      role: "Beauty & Skincare Influencer",
      location: "Bulawayo, Zimbabwe",
      achievement: "Built a sustainable creator business",
      story: "As a mother of two, I needed flexibility. BantuBuzz allowed me to work with brands on my own schedule while providing for my family. The platform's messaging system makes communication so easy, and I love that payments are secure and on time.",
      earnings: "$8,500+",
      collaborations: "18+",
      avatar: "C"
    },
    {
      name: "Tendai R.",
      role: "Tech & Gaming Content Creator",
      location: "Harare, Zimbabwe",
      achievement: "Landed dream brand partnerships",
      story: "BantuBuzz connected me with tech brands I never thought would notice me. The platform's professional presentation of my portfolio helped me stand out. Now I have ongoing partnerships with major tech companies and a growing audience.",
      earnings: "$15,000+",
      collaborations: "30+",
      avatar: "T"
    }
  ];

  const brandStories = [
    {
      company: "AfriStyle Boutique",
      industry: "Fashion Retail",
      challenge: "Needed to reach younger audiences authentically",
      solution: "Partnered with 5 fashion creators through BantuBuzz for a summer campaign",
      results: [
        "150% increase in Instagram followers",
        "45% boost in online sales",
        "Generated over 500,000 impressions"
      ]
    },
    {
      company: "TechHub Zimbabwe",
      industry: "Technology",
      challenge: "Launch new product line to local market",
      solution: "Collaborated with tech and lifestyle creators for product reviews",
      results: [
        "Sold out first batch in 2 weeks",
        "300+ qualified leads",
        "Established brand presence with Gen Z"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Success Stories - BantuBuzz"
        description="Read inspiring success stories from creators and brands who found success through BantuBuzz collaborations."
        keywords="creator success stories, influencer marketing results, brand collaborations africa"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Success Stories</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Real creators, real brands, real results
          </p>
        </div>
      </section>

      {/* Creator Stories */}
      <section className="section-padding">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark mb-4">Creator Spotlights</h2>
          <p className="text-gray-600 mb-12 max-w-2xl">
            Discover how African creators are building successful careers and making an impact through BantuBuzz.
          </p>

          <div className="space-y-8">
            {stories.map((story, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold">
                      {story.avatar}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-dark mb-1">{story.name}</h3>
                      <p className="text-primary font-medium">{story.role}</p>
                      <p className="text-gray-500 text-sm">{story.location}</p>
                    </div>

                    <div className="bg-primary/10 p-4 rounded-lg mb-4 inline-block">
                      <p className="text-primary font-semibold">{story.achievement}</p>
                    </div>

                    <p className="text-gray-700 mb-6 leading-relaxed">"{story.story}"</p>

                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-primary">{story.earnings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Collaborations</p>
                        <p className="text-2xl font-bold text-primary">{story.collaborations}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/register/creator" className="btn btn-primary">
              Start Your Success Story
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Success Stories */}
      <section className="bg-white py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark mb-4">Brand Success Stories</h2>
          <p className="text-gray-600 mb-12 max-w-2xl">
            See how brands achieved their marketing goals through authentic creator partnerships.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {brandStories.map((brand, index) => (
              <div key={index} className="bg-light p-8 rounded-lg">
                <h3 className="text-2xl font-bold text-dark mb-2">{brand.company}</h3>
                <p className="text-primary font-medium mb-4">{brand.industry}</p>

                <div className="mb-4">
                  <h4 className="font-semibold text-dark mb-2">Challenge:</h4>
                  <p className="text-gray-600 text-sm">{brand.challenge}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-dark mb-2">Solution:</h4>
                  <p className="text-gray-600 text-sm">{brand.solution}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-dark mb-2">Results:</h4>
                  <ul className="space-y-2">
                    {brand.results.map((result, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/register/brand" className="btn btn-primary">
              Grow Your Brand with Creators
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-light">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Platform Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$500K+</div>
              <div className="text-gray-600">Paid to Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1,000+</div>
              <div className="text-gray-600">Successful Collaborations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10M+</div>
              <div className="text-gray-600">Total Reach</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Write Your Success Story?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join hundreds of creators and brands who are achieving their goals with BantuBuzz
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register/creator" className="btn bg-white text-primary hover:bg-gray-100">
              Join as Creator
            </Link>
            <Link to="/register/brand" className="btn bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
              Join as Brand
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SuccessStories;
