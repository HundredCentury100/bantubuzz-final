import PolicyPage from '../components/PolicyPage';

const TermsOfService = () => (
  <PolicyPage
    title="Terms of Service"
    description="Read the BantuBuzz Terms of Service for creators, brands, agencies, enterprise users, campaigns, payments, AI-powered features, and marketplace conduct."
    keywords="BantuBuzz terms of service, creator marketplace terms, brand collaboration terms"
    intro={[
      'These Terms of Service govern your access to and use of the BantuBuzz platform, including all related websites, applications, creator marketplaces, campaign systems, collaboration tools, messaging systems, payment systems, analytics features, AI-powered systems, and related services.',
      'By accessing or using BantuBuzz, you agree to these Terms. If you do not agree, you may not use the platform.'
    ]}
    sections={[
      {
        heading: '1. About BantuBuzz',
        body: [
          'BantuBuzz is an AI-powered creator marketplace that helps creators, brands, agencies, and enterprises discover creators, manage campaigns, and scale creator collaborations.',
          'BantuBuzz facilitates creator discovery, campaign management, collaboration workflows, creator recommendations, creator matching, and marketplace transactions through platform tools and AI-powered systems. BantuBuzz facilitates connections and transactions between independent users but is not a direct party to collaborations unless explicitly stated otherwise.'
        ],
        items: [
          'Creators can showcase profiles, packages, and analytics.',
          'Brands can discover creators and manage campaigns.',
          'Agencies can manage creator collaborations on behalf of clients.',
          'Enterprises can manage multiple brands, teams, and campaigns under one plan.'
        ]
      },
      {
        heading: '2. Eligibility',
        body: ['To use BantuBuzz, you must:'],
        items: [
          'Be at least 18 years old or the age of majority in your jurisdiction.',
          'Have legal authority to enter binding agreements.',
          'Provide accurate account information.',
          'Comply with applicable laws and regulations.',
          'Not use BantuBuzz if your account has been suspended or terminated, you are prohibited from using marketplace or financial services, or you intend to use the platform for unlawful, deceptive, or fraudulent purposes.'
        ]
      },
      {
        heading: '3. User Accounts',
        body: ['Users may register as Creator, Brand, Agency, or Enterprise accounts. Users are responsible for maintaining account confidentiality, all activity under their account, and keeping information accurate and updated.'],
        items: [
          'BantuBuzz may verify identities, request documentation, suspend suspicious accounts, remove fraudulent accounts, and restrict platform features.',
          'Accounts may not be sold, transferred, shared, impersonated, or duplicated for deceptive purposes.'
        ]
      },
      {
        heading: '4. AI-Powered Features',
        body: ['BantuBuzz may provide AI-powered marketplace features including creator matching, creator recommendations, smart search, campaign recommendations, marketplace insights, and related recommendation systems.'],
        items: [
          'AI recommendations are informational tools and are not guarantees of performance or outcomes.',
          'Recommendation quality depends on available platform data.',
          'AI systems may produce inaccurate or incomplete results.',
          'Users remain responsible for their own business decisions and creator selections.',
          'BantuBuzz does not guarantee campaign success, creator performance, engagement outcomes, conversions, or return on investment from AI-powered recommendations.'
        ]
      },
      {
        heading: '5. Creator Accounts',
        body: ['Creators may create public profiles, upload portfolio content, create packages, apply to campaigns, submit proposals, connect social media accounts, and receive collaboration requests.'],
        items: [
          'Creators are responsible for truthful analytics and audience data, timely delivery, advertising disclosures, and ownership or rights to uploaded content.',
          'Creators may not manipulate analytics, purchase fake engagement, use bots or deceptive practices, upload infringing content, or misrepresent audience performance.',
          'BantuBuzz may suspend or remove creator accounts suspected of fraud or marketplace abuse.'
        ]
      },
      {
        heading: '6. Brand Accounts',
        body: ['Brands may browse creators and packages, create campaigns, review proposals, purchase creator services, manage collaborations, and approve deliverables.'],
        items: [
          'Brands are responsible for accurate campaign information, respecting creator rights, reviewing deliverables in good faith, and making payments through platform systems.',
          'Brands may not create misleading campaigns, request unpaid work outside agreed scope, misuse creator content, harass creators, or circumvent platform payment systems.'
        ]
      },
      {
        heading: '7. Agency and Enterprise Accounts',
        body: ['Agencies may manage creator collaborations and campaigns on behalf of clients. Enterprise accounts may manage multiple brands, teams, organization workspaces, and campaigns across departments or clients.'],
        items: [
          'Agency and enterprise users are responsible for authorization, internal users and permissions, campaign compliance, communication, approvals, and payments.',
          'BantuBuzz is not responsible for disputes between agencies, enterprise users, brands, or clients.'
        ]
      },
      {
        heading: '8. Creator Packages, Campaigns, and Collaborations',
        body: [
          'Creators may create predefined service packages with pricing, deliverables, timelines, platforms, revisions, and package-specific terms. Once purchased, packages become binding service agreements between users.',
          'Brands may create campaigns with objectives, deliverables, milestones, timelines, budgets, deadlines, and creator targeting criteria. A collaboration is formed when a package is purchased, a proposal is accepted, or a creator is formally selected for a campaign.'
        ],
        items: [
          'Agreed deliverables become binding once a collaboration begins.',
          'Milestone timelines apply and scope changes require agreement between the involved parties.',
          'BantuBuzz is not the employer, contractor, or representative of creators, brands, agencies, or enterprise users.'
        ]
      },
      {
        heading: '9. Payments, Escrow, and Platform Fees',
        body: ['BantuBuzz may facilitate payments, payouts, escrow services, and transaction processing between users. BantuBuzz may collect platform fees, deduct transaction fees, hold funds in escrow, delay payouts for safety or compliance, and process refunds and disputes.'],
        items: [
          'Funds related to completed collaborations may be held in escrow for up to 14 days after milestone approval, deliverable approval, or automatic approval.',
          'If a brand, agency, or enterprise user does not review submitted deliverables within the required review period, BantuBuzz may automatically approve the milestone or deliverable.',
          'Platform fees may vary by service, change over time, and may be non-refundable unless required by law.',
          'BantuBuzz may delay, restrict, or withhold payouts for fraud prevention, suspicious activity, disputes, chargebacks, identity verification, legal compliance, or policy violations.',
          'Fraudulent or abusive chargebacks may result in account suspension, frozen payouts, restricted access, recovery efforts, or termination.'
        ]
      },
      {
        heading: '10. Messaging, Conduct, and Content',
        body: ['BantuBuzz may provide messaging systems, collaboration communication tools, file sharing, and notifications. Users acknowledge that platform communications may be reviewed for fraud prevention and safety purposes and that off-platform communication may reduce platform protections.'],
        items: [
          'Harassment, spam, abuse, scams, and attempts to bypass platform systems or avoid fees are prohibited.',
          'Users retain ownership of original content but grant BantuBuzz a non-exclusive, worldwide, royalty-free license to display content, operate platform functionality, promote marketplace listings, generate previews and analytics, and market the platform.',
          'BantuBuzz may remove content, restrict visibility, suspend accounts, remove campaigns, limit proposals, or restrict platform access if content violates laws or platform policies.'
        ]
      },
      {
        heading: '11. Reviews, Analytics, and Third-Party Data',
        body: ['Users may leave reviews after completed collaborations. Reviews must reflect genuine experiences and avoid false or misleading claims. BantuBuzz may remove manipulative reviews, detect fraudulent activity, adjust trust indicators, modify ranking systems, and change recommendation systems.'],
        items: [
          'Platform rankings, creator recommendations, badges, and AI-powered suggestions are algorithmic and do not constitute endorsements or guarantees.',
          'BantuBuzz relies on third-party platform APIs for connected social data and cannot guarantee data accuracy, platform availability, real-time synchronization, or uninterrupted integrations.'
        ]
      },
      {
        heading: '12. Disputes, Suspension, and Termination',
        body: ['Users may raise disputes regarding deliverables, timelines, payments, intellectual property, or collaboration conduct. BantuBuzz may review messages and submissions, request evidence, freeze escrow, issue partial refunds, release funds, or suspend accounts. BantuBuzz dispute decisions are final unless otherwise required by law.'],
        items: [
          'BantuBuzz may suspend or terminate accounts for fraud, abuse, illegal activity, payment circumvention, repeated disputes, chargeback abuse, or policy violations.',
          'Termination does not remove outstanding obligations or ongoing dispute responsibilities.'
        ]
      },
      {
        heading: '13. Marketplace Independence and Availability',
        body: ['BantuBuzz is a technology platform that facilitates creator-brand collaborations. BantuBuzz is not an employer, talent agency, contracting party, legal representative, or guarantor of collaboration outcomes. BantuBuzz does not guarantee uninterrupted access, error-free operation, guaranteed earnings, campaign performance, creator success, or uninterrupted third-party integrations.']
      },
      {
        heading: '14. Limitation of Liability and Indemnification',
        body: ['To the maximum extent permitted by law, BantuBuzz shall not be liable for indirect damages, lost profits, collaboration failures, third-party actions, reputation damage, platform downtime, user-generated content, or missed business opportunities. Total liability shall not exceed the amount paid to BantuBuzz within the preceding 12 months. Users agree to indemnify and hold harmless BantuBuzz from claims arising from their platform use, collaborations, uploaded content, violations of these Terms, or violations of laws or third-party rights.']
      },
      {
        heading: '15. Privacy, Modifications, and Contact',
        body: ['Use of BantuBuzz is also governed by the Privacy Policy. BantuBuzz may update these Terms at any time. Material changes may be communicated through email, platform notifications, or website updates. Continued use after updates constitutes acceptance of revised Terms.'],
        items: ['For support, legal requests, or platform inquiries, contact BantuBuzz Support at support@bantubuzz.com or visit https://bantubuzz.com/.']
      }
    ]}
  />
);

export default TermsOfService;
