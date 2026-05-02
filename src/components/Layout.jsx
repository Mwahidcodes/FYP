import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
    const location = useLocation();

    // Pages where navbar and footer should be hidden
    const hideNavbarFooter = [
        '/dashboard',

        '/request-donation',
        '/cash-request',
        '/product-request',
        '/donate',
        '/cash-donation',
        '/product-donation',
        '/browse-products',
        '/browse', // Hide navbar on browse page (has its own conditional navigation)
        '/bidding-gallery', // Hide navbar on bidding gallery page (has its own conditional navigation)
        '/admin',
        '/admin-panel',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/profile',
        '/login',
        '/signup'
    ];

    const shouldHide = hideNavbarFooter.includes(location.pathname);

    return (
        <div className="min-h-screen flex flex-col overflow-x-hidden">
            {!shouldHide && <Navbar />}
            <main className={`flex-grow ${!shouldHide ? 'pt-20' : ''}`}>
                <Outlet />
            </main>
            {!shouldHide && <Footer />}
        </div>
    );
};

export default Layout;

