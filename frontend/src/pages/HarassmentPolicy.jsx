import PolicyPage from '../components/PolicyPage';

const HarassmentPolicy = () => (
  <PolicyPage
    title="Harassment & Abuse Policy"
    description="BantuBuzz policy on harassment, abuse, intimidation, hate speech, sexual harassment, threats, privacy violations, and professional conduct."
    keywords="BantuBuzz harassment policy, abuse policy, marketplace safety, creator safety"
    intro={[
      'BantuBuzz is committed to providing a safe, respectful, and professional environment for all users. Harassment, intimidation, abuse, or any behavior that makes other users feel unsafe or unwelcome is not allowed on the platform.',
      'This policy protects creators and brands and helps ensure that communication and collaboration on BantuBuzz remains professional, fair, and respectful.'
    ]}
    sections={[
      {
        heading: '1. Scope',
        body: ['This policy applies to creators, brands, and any team members using BantuBuzz on behalf of a brand. It applies to all platform activity, including direct messages, collaboration discussions, campaigns, briefs and proposals, profile content, support interactions, and any other user-generated communication. Off-platform behavior directly connected to BantuBuzz activity may also be reviewed where it creates a safety risk.']
      },
      {
        heading: '2. Prohibited Conduct',
        body: ['Users may not engage in conduct that is abusive, threatening, hostile, discriminatory, coercive, or intended to make another user feel unsafe or degraded.'],
        subsections: [
          {
            heading: 'Harassment and Bullying',
            items: ['Repeated unwanted messages', 'Personal insults or attacks', 'Mocking, degrading, or humiliating language', 'Intimidating or hostile communication', 'Repeated pressure after refusal']
          },
          {
            heading: 'Hate Speech and Discriminatory Abuse',
            body: ['Users may not attack, demean, or exclude a person or group based on protected characteristics including race, ethnicity, tribal affiliation, nationality, religion, gender, sexual orientation, disability, age, or other protected characteristics.']
          },
          {
            heading: 'Sexual Harassment',
            items: ['Sexual comments unrelated to collaboration', 'Repeated flirting after lack of interest or refusal', 'Requests for explicit content', 'Explicit or suggestive messages', 'Sexual advances in professional conversations']
          },
          {
            heading: 'Threats, Intimidation, and Privacy Violations',
            items: ['Threats of physical harm or reputational damage', 'Threats to expose personal information', 'Coercive language designed to force compliance', 'Sharing or threatening to share private details without consent']
          },
          {
            heading: 'Harassment Through Collaboration Demands',
            items: ['Pressuring creators into unpaid extra work', 'Using aggressive language to demand revisions outside agreed scope', 'Threatening poor reviews to force extra deliverables', 'Intimidating brands or creators during negotiation or delivery']
          }
        ]
      },
      {
        heading: '3. What Users Can Do',
        body: ['If a user experiences harassment or abuse, they may block the user, report the message or user, contact Support, and submit evidence relevant to the incident. Users are encouraged to keep communication on-platform where possible so BantuBuzz can fairly review what happened.']
      },
      {
        heading: '4. Reporting and Review',
        body: ['Reports may be submitted by reporting a specific message, reporting a user through Support, or submitting evidence. Users should provide the username or profile name of the reported user, a description of the incident, and screenshots or supporting evidence where available. False or malicious reporting is not allowed.'],
        items: ['BantuBuzz may review reported messages, related conversation history, collaboration context, previous reports or warnings, and evidence submitted by the reporting user.', 'BantuBuzz does not routinely monitor private conversations, but message history may be reviewed when a report is submitted or where required for safety investigation.']
      },
      {
        heading: '5. Protective Measures and Enforcement',
        body: ['In serious or credible safety risk cases, BantuBuzz may take immediate protective action before a full review is completed. Enforcement depends on severity, frequency, and context.'],
        items: ['Warning the user', 'Restricting messaging privileges', 'Removing access to platform features', 'Temporarily suspending the account', 'Permanently removing the account from the platform']
      },
      {
        heading: '6. Repeat Violations and Retaliation',
        body: ['Repeated harassment, repeated reports, or repeated violations may lead to escalated enforcement. Users may not retaliate against another user for blocking them, reporting them, refusing a collaboration, rejecting a proposal, or setting boundaries. Retaliation may result in additional enforcement action.']
      },
      {
        heading: '7. Legal Compliance and Evidence Preservation',
        body: ['Users must comply with all applicable laws and regulations. BantuBuzz may preserve relevant account information, message history, reports, and other platform data where necessary to investigate harassment or abusive behavior. Where legally required, BantuBuzz may disclose relevant information to law enforcement authorities, courts, or regulatory bodies in accordance with applicable laws and the Privacy Policy.']
      }
    ]}
  />
);

export default HarassmentPolicy;
