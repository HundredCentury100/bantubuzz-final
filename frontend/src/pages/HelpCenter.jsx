import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  BriefcaseIcon,
  UserCircleIcon,
  InformationCircleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

const HelpCenter = () => {
  const categories = [
    {
      value: 'technical',
      label: 'Technical Issue',
      description: 'Website bugs, login problems, or technical errors',
      icon: QuestionMarkCircleIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      value: 'campaign',
      label: 'Campaign/Collaboration',
      description: 'Questions about collaborations, campaigns, or bookings',
      icon: BriefcaseIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      value: 'payment',
      label: 'Payment Issue',
      description: 'Payment processing, refunds, or transaction issues',
      icon: CreditCardIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      value: 'messaging',
      label: 'Messaging',
      description: 'Chat issues, blocked users, or message problems',
      icon: ChatBubbleLeftRightIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      value: 'account',
      label: 'Account Support',
      description: 'Profile settings, account verification, or security',
      icon: UserCircleIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      value: 'inquiry',
      label: 'General Inquiry',
      description: 'General questions about BantuBuzz platform',
      icon: InformationCircleIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <QuestionMarkCircleIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Get support from our team. We're here to help with any questions or issues.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="pb-8 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Submit New Ticket */}
            <Link
              to="/help-center/submit"
              className="bg-primary rounded-3xl shadow-sm hover:shadow-md transition-shadow p-8"
            >
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <PlusCircleIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark">Submit a Ticket</h3>
                    <p className="text-sm text-gray-600">Get help from our support team</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Have a question or issue? Submit a support ticket and our team will get back to you as soon as possible.
                </p>
                <div className="flex items-center gap-2 text-dark font-medium">
                  <span>Create new ticket</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* View My Tickets */}
            <Link
              to="/my-tickets"
              className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow p-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-dark">My Tickets</h3>
                  <p className="text-sm text-gray-600">View your support history</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Check the status of your existing tickets and continue conversations with our support team.
              </p>
              <div className="flex items-center gap-2 text-dark font-medium">
                <span>View my tickets</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-dark mb-8">What do you need help with?</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.value}
                  to={`/help-center/submit?category=${category.value}`}
                  className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className={`w-12 h-12 ${category.bgColor} rounded-full flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-2">{category.label}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-6 lg:px-12 xl:px-20 bg-white">
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-dark mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {/* FAQ Items */}
            <details className="bg-light rounded-2xl p-6 group">
              <summary className="font-bold text-dark cursor-pointer list-none flex items-center justify-between">
                <span>How do I book a creator?</span>
                <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700">
                Browse our creator marketplace, select a creator you'd like to work with, choose one of their packages, and complete the booking. You can also send them a custom package request for tailored collaborations.
              </p>
            </details>

            <details className="bg-light rounded-2xl p-6 group">
              <summary className="font-bold text-dark cursor-pointer list-none flex items-center justify-between">
                <span>How does payment protection work?</span>
                <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700">
                When you book a creator, your payment is held securely by BantuBuzz. The creator only receives payment after you approve the completed work, ensuring you get what you paid for.
              </p>
            </details>

            <details className="bg-light rounded-2xl p-6 group">
              <summary className="font-bold text-dark cursor-pointer list-none flex items-center justify-between">
                <span>Can I request a refund?</span>
                <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700">
                If there's an issue with your collaboration, you can open a dispute through your collaboration page. Our team will review the case and determine if a refund is appropriate.
              </p>
            </details>

            <details className="bg-light rounded-2xl p-6 group">
              <summary className="font-bold text-dark cursor-pointer list-none flex items-center justify-between">
                <span>How do I become a verified creator?</span>
                <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700">
                Verified creator status is available through a subscription. Visit your dashboard and navigate to Subscriptions to apply for verification. Benefits include a verified badge, priority support, and enhanced visibility.
              </p>
            </details>

            <details className="bg-light rounded-2xl p-6 group">
              <summary className="font-bold text-dark cursor-pointer list-none flex items-center justify-between">
                <span>What if I need to report inappropriate behavior?</span>
                <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700">
                You can report messages, users, or content directly through the platform. We take all reports seriously and will investigate promptly. Use the report button in messages or contact support for other concerns.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Still Need Help CTA */}
      <section className="py-16 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-dark rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Still need help?</h2>
            <p className="text-gray-300 mb-8">
              Can't find what you're looking for? Our support team is ready to assist you.
            </p>
            <Link
              to="/help-center/submit"
              className="inline-block px-8 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Submit a Support Ticket
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HelpCenter;
