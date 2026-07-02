import PolicyPage from '../components/PolicyPage';

const SpamPolicy = () => (
  <PolicyPage
    title="Spam & Unwanted Solicitation Policy"
    description="BantuBuzz policy preventing spam, unsolicited promotions, platform misuse for lead generation, and repeated unwanted contact."
    keywords="BantuBuzz spam policy, unwanted solicitation, platform misuse, messaging rules"
    intro={[
      'BantuBuzz is designed to support professional collaboration between brands and creators. Spam, unsolicited promotions, and excessive or irrelevant messaging can disrupt the platform experience and reduce trust between users.',
      'This policy exists to prevent misuse of messaging and collaboration features for spam or promotional activity unrelated to legitimate collaborations.'
    ]}
    sections={[
      {
        heading: '1. Scope',
        body: ['This policy applies to all BantuBuzz users, including creators, brands, and team members representing brands. It applies across direct messages, campaign communication, brief responses, proposals, profile content, and any user-generated communication or outreach conducted through BantuBuzz.']
      },
      {
        heading: '2. Prohibited Behavior',
        body: ['Users may not use BantuBuzz to send spam or engage in unsolicited promotional behavior.'],
        subsections: [
          {
            heading: 'Mass Messaging',
            body: ['Users may not send the same or similar message repeatedly to multiple users where the message is not related to a legitimate collaboration opportunity.'],
            items: ['Sending identical promotional messages to multiple creators or brands', 'Repeatedly contacting users with generic offers unrelated to their profile or activity', 'Automated or bot-generated outreach']
          },
          {
            heading: 'Unsolicited Promotions',
            body: ['Users may not use messaging to promote unrelated products, services, or opportunities.'],
            items: ['Promoting external businesses unrelated to BantuBuzz collaborations', 'Sending affiliate links or marketing messages', 'Advertising services outside the scope of BantuBuzz collaborations']
          },
          {
            heading: 'Platform Misuse for Lead Generation',
            body: ['BantuBuzz may not be used solely as a tool to collect leads or redirect users to external platforms.'],
            items: ['Asking users to move immediately to external platforms for unrelated business', 'Attempting to build external contact lists through messaging', 'Using the platform to recruit users for unrelated opportunities']
          },
          {
            heading: 'Repeated Unwanted Contact',
            body: ['Users may not repeatedly contact other users who have not responded or have declined communication.'],
            items: ['Sending multiple follow-ups after no response', 'Continuing outreach after rejection', 'Persistently requesting collaboration after a user declines']
          }
        ]
      },
      {
        heading: '3. Acceptable Communication',
        body: ['Messaging on BantuBuzz should be used for legitimate collaboration discussions, including campaign discussions, package or service inquiries, collaboration negotiations, and content coordination during active collaborations. Messages should remain relevant, professional, and respectful of user boundaries.']
      },
      {
        heading: '4. Reporting Spam',
        body: ['Users who receive spam or unwanted solicitation may report the message or the user directly through the platform. Reports may be submitted by reporting a specific message or reporting the user through Support. Reports help BantuBuzz identify and address misuse of platform messaging.']
      },
      {
        heading: '5. Enforcement Actions',
        body: ['If spam or unsolicited promotional behavior is confirmed, BantuBuzz may take enforcement actions based on the severity and frequency of the behavior.'],
        items: ['Warning the user', 'Restricting messaging privileges', 'Limiting account functionality', 'Temporarily suspending the account', 'Permanently removing the account from the platform']
      },
      {
        heading: '6. Protection of Platform Integrity',
        body: ['BantuBuzz may monitor patterns of messaging behavior to identify spam or platform misuse. Users who attempt to bypass messaging safeguards, create multiple accounts to send spam, or otherwise manipulate platform communication tools may face immediate enforcement action.']
      }
    ]}
  />
);

export default SpamPolicy;
