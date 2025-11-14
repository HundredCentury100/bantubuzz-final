import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <h1 className="text-6xl font-black text-dark mb-4">404</h1>
        <p className="text-2xl text-gray-600 mb-8">Page not found</p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
