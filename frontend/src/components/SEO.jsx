import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  image = '/bantubuzz-og-image.png',
  url,
  type = 'website'
}) => {
  const siteTitle = 'BantuBuzz';
  const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} - African Creator-Brand Collaboration Platform`;
  const defaultDescription = "Africa's premier creator-brand collaboration platform. Connect with top African creators and brands for meaningful collaborations.";
  const metaDescription = description || defaultDescription;
  const defaultKeywords = 'African creators, influencer marketing, brand collaborations, content creators, Zimbabwe, Africa';
  const metaKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      {url && <meta property="twitter:url" content={url} />}
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
