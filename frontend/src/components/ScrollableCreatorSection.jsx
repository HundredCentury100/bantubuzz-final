import { Link } from 'react-router-dom';
import CreatorCardHome from './CreatorCardHome';

const ScrollableCreatorSection = ({
  title,
  subtitle,
  creators,
  linkTo,
  bgColor = 'white',
  textColor = 'dark'
}) => {
  return (
    <section className="py-12 px-6 lg:px-12 xl:px-20">
      <div className="w-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <Link to={linkTo} className="text-gray-900 font-medium hover:underline">
            See All
          </Link>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          {creators.slice(0, 4).map((creator) => (
            <CreatorCardHome
              key={creator.id}
              creator={creator}
              bgColor={bgColor}
              textColor={textColor}
            />
          ))}
        </div>

        {/* Mobile/Tablet: Horizontal Scroll */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-4 pb-2">
            {creators.slice(0, 8).map((creator) => (
              <div key={creator.id} className="w-[280px] flex-shrink-0">
                <CreatorCardHome
                  creator={creator}
                  bgColor={bgColor}
                  textColor={textColor}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScrollableCreatorSection;
