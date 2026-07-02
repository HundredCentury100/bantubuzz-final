import PolicyPage from '../components/PolicyPage';

const SupportPolicy = () => (
  <PolicyPage
    title="Support & Customer Assistance Policy"
    description="BantuBuzz support policy covering help requests, collaboration disputes, misconduct reports, response targets, emergency safety escalation, and support abuse."
    keywords="BantuBuzz support policy, customer assistance, collaboration disputes, support tickets"
    intro={[
      'The BantuBuzz Support & Customer Assistance system helps creators and brands access assistance for campaigns, payments, messaging, platform functionality, disputes, and safety concerns.',
      'BantuBuzz is committed to maintaining a fair, transparent, and safe marketplace. Support processes are handled in accordance with platform policies and operational procedures.'
    ]}
    sections={[
      {
        heading: '1. Accessing Support',
        body: ['Creators and brands can access assistance through the Help or Support section within BantuBuzz. Users are expected to provide accurate and sufficient information so the support team can review and resolve issues efficiently.'],
        items: ['Describe the issue clearly', 'Attach screenshots or supporting files', 'Select the type of issue being reported', 'Provide relevant campaign, collaboration, payment, or message context where applicable']
      },
      {
        heading: '2. Collaboration Disputes',
        body: ['A dispute occurs when a creator and brand disagree about aspects of a collaboration, such as deliverables, scope of work, content approval, payment, or timelines. When a dispute is submitted, BantuBuzz may review collaboration details, deliverables, milestones, message history, and evidence submitted by both parties.'],
        items: ['Possible outcomes may include requesting revisions, clarifying expectations, releasing or withholding payment depending on evidence, or canceling the collaboration if required.']
      },
      {
        heading: '3. Reporting Misconduct',
        body: ['Users may report misconduct through Support or directly from messaging conversations. Misconduct includes harassment, abusive communication, hate speech, scams, spam, unsolicited promotional messages, and attempts to bypass platform protections or payments.'],
        items: ['Reports record the reporting user, reported user, reported message or interaction, and supporting evidence where provided.', 'Actions may include warnings, messaging restrictions, temporary suspension, or permanent account removal.']
      },
      {
        heading: '4. Support Request Processing',
        subsections: [
          { heading: 'Step 1: Request Submission', body: ['The user submits a support request with account information, issue category, description, and attachments or evidence.'] },
          { heading: 'Step 2: Initial Review', body: ['The support team reviews and categorizes the issue. Additional details may be requested before proceeding.'] },
          { heading: 'Step 3: Investigation', body: ['Where necessary, BantuBuzz investigates by reviewing relevant platform data such as campaigns, collaborations, payment transactions, escrow status, message history, user reports, or previous incidents.'] },
          { heading: 'Step 4: Resolution', body: ['BantuBuzz determines an appropriate resolution, which may include guidance, technical resolution, facilitating communication, or policy enforcement. Users are notified through platform notifications or email.'] }
        ]
      },
      {
        heading: '5. Support Response Policy',
        body: ['BantuBuzz aims to respond within reasonable timeframes depending on issue type and complexity.'],
        items: ['General inquiries: within 24-48 hours', 'Technical issues: within 24 hours', 'Campaign or payment disputes: within 48-72 hours', 'Safety or harassment reports: prioritized and reviewed as soon as possible']
      },
      {
        heading: '6. Scope of Support',
        body: ['BantuBuzz support assists with platform functionality, campaign and collaboration management, messaging safety concerns, payment and escrow processes, account access, and verification issues. Support does not intervene in subjective creative disagreements unless they violate platform policies or agreed deliverables.']
      },
      {
        heading: '7. Emergency Safety Escalation',
        body: ['Emergency safety situations may include threats of violence, severe harassment, hate speech targeting protected groups, fraud or scams involving financial harm, and repeated abusive behavior affecting multiple users. BantuBuzz may temporarily restrict messaging, suspend accounts during investigation, or permanently remove accounts in severe cases. Where required by law, BantuBuzz may cooperate with relevant authorities.']
      },
      {
        heading: '8. Support Abuse and Off-Platform Risk',
        body: ['Users must interact with support in good faith. False reports, repeated illegitimate disputes, harassment of support staff, duplicate requests, or spam support requests may lead to warnings, limits on support access, feature restrictions, or account suspension. BantuBuzz encourages users to communicate and transact within the platform because off-platform activity may reduce support, dispute resolution, and payment protection.']
      }
    ]}
  />
);

export default SupportPolicy;
