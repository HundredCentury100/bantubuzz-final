import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/bantubuzz-logo-without-text.png"
                alt="BantuBuzz Logo"
                className="h-12 w-12"
              />
              <div className="text-2xl font-black">
                <span className="text-primary">Bantu</span>
                <span className="text-white">Buzz</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Africa's premier creator-brand collaboration platform. Connecting talent with opportunity.
            </p>
          </div>

          {/* For Creators */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Creators</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register/creator" className="text-gray-400 hover:text-primary transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-400 hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/success-stories" className="text-gray-400 hover:text-primary transition-colors">
                  Success Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Brands</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register/brand" className="text-gray-400 hover:text-primary transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/creators" className="text-gray-400 hover:text-primary transition-colors">
                  Find Creators
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {currentYear} BantuBuzz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
