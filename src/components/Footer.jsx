import { Link } from 'react-router-dom';
import {
    HandHeart,
    Mail,
    Phone,
    MapPin,
    Send,
    ArrowRight
} from 'lucide-react';

const Footer = () => {
    const quickLinks = [
        { name: 'Home', path: '/' },
        { name: 'About Us', path: '/about' },
        { name: 'How It Works', path: '/how-it-works' },
        { name: 'Browse Donations', path: '/browse' },
        { name: 'Bidding', path: '/bidding-gallery' },
    ];

    const supportLinks = [
        { name: 'Contact Us', path: '/contact' },
        { name: 'FAQs', path: '/faqs' },
        { name: 'Privacy Policy', path: '/privacy' },
        { name: 'Terms of Service', path: '/terms' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300">

            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex items-center space-x-3 mb-6">
                            <img src="/logo.png" alt="Share4Good Logo" className="w-12 h-12 object-contain" />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold font-outfit text-white leading-none">
                                    Share<span className="text-primary-400">4</span>Good
                                </span>
                            </div>
                        </Link>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Connecting generous hearts with those in need. Together, we create
                            a world where sharing transforms lives.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6 font-outfit">
                            Quick Links
                        </h4>
                        <ul className="space-y-3">
                            {quickLinks.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-primary-400 transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6 font-outfit">
                            Support
                        </h4>
                        <ul className="space-y-3">
                            {supportLinks.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-primary-400 transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6 font-outfit">
                            Contact Us
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400">
                                    123 Charity Lane, Giving City,<br />
                                    Pakistan 54000
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                                <a href="tel:+923001234567" className="text-gray-400 hover:text-primary-400 transition-colors">
                                    +92 300 123 4567
                                </a>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                                <a href="mailto:info@share4good.org" className="text-gray-400 hover:text-primary-400 transition-colors">
                                    info@share4good.org
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm">
                            © 2026 Share4Good. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6 text-sm">
                            <Link to="/privacy" className="text-gray-500 hover:text-primary-400 transition-colors">
                                Privacy
                            </Link>
                            <Link to="/terms" className="text-gray-500 hover:text-primary-400 transition-colors">
                                Terms
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

