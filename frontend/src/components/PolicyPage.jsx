import Navbar from './Navbar';
import Footer from './Footer';
import SEO from './SEO';

const PolicyPage = ({ title, description, keywords, lastUpdated = 'July 2, 2026', intro = [], sections = [] }) => {
  return (
    <div className="min-h-screen bg-light">
      <SEO title={`${title} - BantuBuzz`} description={description} keywords={keywords} />
      <Navbar />

      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container-custom">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          <p className="text-lg opacity-90">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12 space-y-8">
            {intro.length > 0 && (
              <div className="space-y-4">
                {intro.map((paragraph) => (
                  <p key={paragraph} className="text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {sections.map((section) => (
              <PolicySection key={section.heading} section={section} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const PolicySection = ({ section }) => (
  <div>
    <h2 className="text-2xl font-bold text-dark mb-4">{section.heading}</h2>
    {section.body?.map((paragraph) => (
      <p key={paragraph} className="text-gray-700 leading-relaxed mb-3">
        {paragraph}
      </p>
    ))}
    {section.items && <PolicyList items={section.items} />}
    {section.subsections?.map((subsection) => (
      <div key={subsection.heading} className="mt-6">
        <h3 className="text-xl font-semibold text-dark mb-3">{subsection.heading}</h3>
        {subsection.body?.map((paragraph) => (
          <p key={paragraph} className="text-gray-700 leading-relaxed mb-3">
            {paragraph}
          </p>
        ))}
        {subsection.items && <PolicyList items={subsection.items} />}
      </div>
    ))}
  </div>
);

const PolicyList = ({ items }) => (
  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default PolicyPage;
